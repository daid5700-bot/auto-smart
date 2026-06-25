export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const branchId = getActiveBranchId();

    const where: any = {
      isDeleted: false,
      inventoryOrders: { some: {} } // Only customers with inventory orders
    };

    if (branchId) where.branchId = branchId;
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const total = await prisma.customer.count({ where });

    const customers = await prisma.customer.findMany({
      where,
      include: {
        inventoryOrders: {
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    });

    const formattedCustomers = customers.map(customer => {
      let totalAmount = 0;
      let totalPaid = 0;
      let totalDebt = 0;
      let debtOrdersCount = 0;
      const latestOrderAmount = customer.inventoryOrders[0]?.totalAmount || 0;

      for (const order of customer.inventoryOrders) {
        totalAmount += Number(order.totalAmount);
        totalPaid += Number(order.paidAmount);
        totalDebt += Number(order.debtAmount);
        if (Number(order.debtAmount) > 0) {
          debtOrdersCount++;
        }
      }

      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        totalAmount,
        latestOrderAmount: Number(latestOrderAmount),
        totalPaid,
        totalDebt,
        debtOrdersCount,
      };
    });

    return NextResponse.json({
      customers: formattedCustomers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
