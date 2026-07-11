export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const search = searchParams.get("search") || "";
    const saleType = searchParams.get("saleType");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const branchId = getActiveBranchId();

    const where: any = {
      isDeleted: false,
      vehicles: {
        some: {
          status: { in: ["RESERVED", "SOLD"] },
          ...(saleType ? { saleType } : {}),
          ...(branchId ? { branchId } : {})
        }
      }
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
      if (/^\d+$/.test(search.trim())) {
        where.OR.push({ id: parseInt(search.trim(), 10) });
      }
    }

    const total = await prisma.customer.count({ where });

    const customers = await prisma.customer.findMany({
      where,
      include: {
        vehicles: {
          where: {
            status: { in: ["RESERVED", "SOLD"] },
            ...(saleType ? { saleType } : {}),
            ...(branchId ? { branchId } : {})
          },
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

      // Find the latest contract price
      let latestOrderAmount = 0;
      if (customer.vehicles.length > 0) {
        const latestVeh = customer.vehicles[0];
        const accs = typeof latestVeh.accessoriesJson === "string" ? JSON.parse(latestVeh.accessoriesJson) : (latestVeh.accessoriesJson as any) || [];
        const accsCost = accs.reduce((sum: number, curr: any) => sum + (Number(curr.price) * (Number(curr.quantity) || 1)), 0);
        latestOrderAmount = latestVeh.listPrice.toNumber() + (latestVeh.plateCost ? latestVeh.plateCost.toNumber() : 0) + accsCost;
      }

      for (const veh of customer.vehicles) {
        const accs = typeof veh.accessoriesJson === "string" ? JSON.parse(veh.accessoriesJson) : (veh.accessoriesJson as any) || [];
        const accsCost = accs.reduce((sum: number, curr: any) => sum + (Number(curr.price) * (Number(curr.quantity) || 1)), 0);
        const contractTotal = veh.listPrice.toNumber() + (veh.plateCost ? veh.plateCost.toNumber() : 0) + accsCost;

        totalAmount += contractTotal;
        totalPaid += Number(veh.paidAmount);
        totalDebt += Number(veh.debtAmount);
        if (Number(veh.debtAmount) > 0) {
          debtOrdersCount++;
        }
      }

      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        totalAmount,
        latestOrderAmount,
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
