export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const type = searchParams.get("type") || "";

    const cleanQuery = query.trim();
    if (!cleanQuery || cleanQuery.length < 2) {
      return NextResponse.json({ customers: [] });
    }

    // Chỉ giữ lại chữ số để tìm kiếm số điện thoại
    const cleanPhone = cleanQuery.replace(/\D/g, "");

    if (!cleanPhone) {
      return NextResponse.json({ customers: [] });
    }

    // Xây dựng các trường select động dựa trên query param type
    const selectFields: any = {
      id: true,
      name: true,
      phone: true,
      address: true,
      birthday: true,
      loyaltyPoints: true,
    };

    if (type === "workshop") {
      selectFields.repairOrders = {
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          plateNumber: true,
          vehicleModel: true,
        },
      };
    }

    // Tìm kiếm khách hàng theo tiền tố số điện thoại
    const customers = await prisma.customer.findMany({
      where: {
        isDeleted: false,
        phone: {
          startsWith: cleanPhone,
        },
      },
      select: selectFields,
      take: 15,
    });

    const formattedCustomers = customers.map((c: any) => {
      const formatted: any = {
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        birthday: c.birthday,
        loyaltyPoints: c.loyaltyPoints,
      };

      if (type === "workshop" && c.repairOrders && c.repairOrders.length > 0) {
        formatted.plateNumber = c.repairOrders[0].plateNumber;
        formatted.vehicleModel = c.repairOrders[0].vehicleModel;
      }

      return formatted;
    });

    return NextResponse.json({ customers: formattedCustomers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
