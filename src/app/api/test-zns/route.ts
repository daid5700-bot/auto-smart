export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOilChangeReminderAction } from "@/app/actions";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const phone = searchParams.get("phone");
    const plate = searchParams.get("plate") || "29A-12345";
    const name = searchParams.get("name") || "Khách Hàng Thử Nghiệm";

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          error: "Vui lòng cung cấp tham số 'phone' (ví dụ: ?phone=0901234567)",
        },
        { status: 400 }
      );
    }

    const { getActiveBranchId } = await import("@/lib/branch");
    const activeBranchId = getActiveBranchId();

    // Find or create mock customer
    let customer = await prisma.customer.findFirst({
      where: { phone },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name,
          phone,
          loyaltyPoints: 15,
          totalSpent: 1200000,
          vehiclePlates: [plate],
          branchId: activeBranchId,
        },
      });
    } else if (activeBranchId && customer.branchId !== activeBranchId) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: { branchId: activeBranchId },
      });
    }

    // Create a mock RepairOrder if none exists to supply vehicleModel
    const lastRo = await prisma.repairOrder.findFirst({
      where: { customerId: customer.id },
    });

    if (!lastRo) {
      await prisma.repairOrder.create({
        data: {
          customerId: customer.id,
          plateNumber: plate,
          vehicleModel: "Yamaha Exciter 150",
          status: "DELIVERED",
          totalAmount: 350000,
          completedAt: new Date(),
        },
      });
    }

    // Call the actual action function
    const result = await sendOilChangeReminderAction({
      customerId: customer.id,
      phone,
      plateNumber: plate,
    });

    return NextResponse.json({
      success: true,
      message: "Gửi tin nhắn ZNS test thành công!",
      templateUsed: "CRM_OIL_REMIND_002",
      customerSent: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        plateNumber: plate,
      },
      actionResult: result,
    });
  } catch (error: any) {
    console.error("Test ZNS error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to send test ZNS",
      },
      { status: 500 }
    );
  }
}
