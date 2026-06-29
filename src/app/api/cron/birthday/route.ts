import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendZaloZns, formatDateForZalo } from "@/lib/zalo";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Verify Secret Key to protect the endpoint from unauthorized trigger
    const secret = req.nextUrl.searchParams.get("secret") || req.headers.get("Authorization")?.replace("Bearer ", "");
    const expectedSecret = process.env.CRON_SECRET || "autosmart_cron_secret_2026";
    
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch all active customers with valid birthdays
    const customers = await prisma.customer.findMany({
      where: {
        isDeleted: false,
        birthday: { not: null },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        birthday: true,
        branchId: true,
        loyaltyPoints: true,
      }
    });

    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();
    const todayUTCMonth = today.getUTCMonth();
    const todayUTCDate = today.getUTCDate();

    // Filter customers whose birthday matches today (local timezone or UTC timezone)
    const birthdayCustomers = customers.filter(c => {
      if (!c.birthday) return false;
      const bday = new Date(c.birthday);
      const matchLocal = bday.getMonth() === todayMonth && bday.getDate() === todayDate;
      const matchUtc = bday.getUTCMonth() === todayUTCMonth && bday.getUTCDate() === todayUTCDate;
      return matchLocal || matchUtc;
    });

    if (birthdayCustomers.length === 0) {
      return NextResponse.json({
        message: "No customers have a birthday today.",
        processed: 0
      });
    }

    // 3. Prevent duplicate messages: check if any ZNS logs exist for these customers today for birthday templates
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const recentZnsLogs = await prisma.znsLog.findMany({
      where: {
        templateId: "CRM_BIRTHDAY_003",
        sentAt: {
          gte: startOfToday,
          lte: endOfToday,
        }
      },
      select: {
        customerId: true
      }
    });
    const sentCustomerIds = new Set(recentZnsLogs.map(log => log.customerId));

    const pendingCustomers = birthdayCustomers.filter(c => !sentCustomerIds.has(c.id));

    if (pendingCustomers.length === 0) {
      return NextResponse.json({
        message: "All birthday customers today have already been sent ZNS.",
        processed: 0,
        skippedCount: birthdayCustomers.length
      });
    }

    const results = [];

    // 4. Send ZNS to all pending birthday customers
    for (const customer of pendingCustomers) {
      try {
        let expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7); // Default: 7 days expiry
        
        if (customer.birthday) {
          const bday = new Date(customer.birthday);
          const bdayThisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
          bdayThisYear.setDate(bdayThisYear.getDate() + 7);
          expiryDate = bdayThisYear;
        }

        const cleanCustName = customer.name.trim();
        const customerName30 = cleanCustName.length > 29 ? cleanCustName.substring(0, 29) : cleanCustName;

        const templateData = {
          customer_name: customerName30,
          expiry_date: formatDateForZalo(expiryDate),
          phone_number: customer.phone,
        };

        const content = `Chúc Mừng Sinh Nhật Quý Khách ${customer.name}. Nhân dịp sinh nhật, Yamaha Town Toàn Thắng kính chúc quý khách ${customer.name} (SĐT: ${customer.phone}) một tuổi mới thật nhiều sức khỏe, hạnh phúc và vạn sự hanh thông! Hạn nhận quà đến ngày ${formatDateForZalo(expiryDate)}`;

        // Trigger real ZNS API call
        const znsResult = await sendZaloZns(customer.phone, "CRM_BIRTHDAY_003", templateData);
        
        let status = "SENT";
        let errorMsg = null;
        if (!znsResult.success) {
          status = "FAILED";
          errorMsg = znsResult.error || "Lỗi gửi ZNS";
        }

        // Create log record
        await prisma.znsLog.create({
          data: {
            customerId: customer.id,
            phone: customer.phone,
            messageType: "BIRTHDAY",
            templateId: "CRM_BIRTHDAY_003",
            content: content,
            status,
            error: errorMsg,
            branchId: customer.branchId,
          }
        });

        results.push({
          customerId: customer.id,
          name: customer.name,
          phone: customer.phone,
          status,
          error: errorMsg
        });

      } catch (err: any) {
        console.error(`Error sending birthday ZNS for customer ID ${customer.id}:`, err);
        results.push({
          customerId: customer.id,
          name: customer.name,
          phone: customer.phone,
          status: "FAILED",
          error: err.message || "Internal send error"
        });
      }
    }

    return NextResponse.json({
      message: `Processed birthday ZNS successfully.`,
      totalMatch: birthdayCustomers.length,
      sentCount: results.filter(r => r.status === "SENT").length,
      failedCount: results.filter(r => r.status === "FAILED").length,
      details: results
    });

  } catch (error: any) {
    console.error("Birthday cron API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
