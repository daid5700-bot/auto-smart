import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const [
      totalVehicles,
      availableVehicles,
      soldVehicles,
      reservedVehicles,
      inventoryValueResult,
      recentVehicles
    ] = await Promise.all([
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { status: "AVAILABLE" } }),
      prisma.vehicle.count({ where: { status: "SOLD" } }),
      prisma.vehicle.count({ where: { status: "RESERVED" } }),
      prisma.vehicle.aggregate({
        _sum: { listPrice: true },
        where: { status: { in: ["AVAILABLE", "RESERVED", "INCOMING"] } }
      }),
      prisma.vehicle.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          vin: true,
          model: true,
          variant: true,
          status: true,
          listPrice: true,
          createdAt: true
        }
      })
    ]);

    const inventoryValue = inventoryValueResult._sum.listPrice || 0;

    // Fetch all SOLD vehicles to calculate real monthly sales
    const soldVehiclesData = await prisma.vehicle.findMany({
      where: { status: "SOLD" },
      select: { updatedAt: true },
    });

    const monthlySalesMap = new Map<string, number>();
    
    // Initialize last 12 months with 0
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `T${d.getMonth() + 1}`;
      // In case we have duplicate month names (e.g., if we go back exactly 12 months it's tricky, but this simple approach is fine for 11 to 0)
      if (!monthlySalesMap.has(key)) {
        monthlySalesMap.set(key, 0);
      }
    }

    const now = new Date();
    soldVehiclesData.forEach(car => {
      const d = new Date(car.updatedAt);
      // Check if within the last 12 months (approximate)
      const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      
      if (diffMonths >= 0 && diffMonths < 12) {
        const key = `T${d.getMonth() + 1}`;
        if (monthlySalesMap.has(key)) {
          monthlySalesMap.set(key, monthlySalesMap.get(key)! + 1);
        }
      }
    });

    const monthlySales = Array.from(monthlySalesMap.entries()).map(([label, value]) => ({ label, value }));

    // Calculate real trend: compare current month with previous month
    let trendPercentage = 0;
    if (monthlySales.length >= 2) {
      const currentMonthData = monthlySales[monthlySales.length - 1].value;
      const previousMonthData = monthlySales[monthlySales.length - 2].value;
      
      if (previousMonthData > 0) {
        trendPercentage = Math.round(((currentMonthData - previousMonthData) / previousMonthData) * 100);
      } else if (currentMonthData > 0) {
        trendPercentage = 100;
      }
    }

    return NextResponse.json({
      totalVehicles,
      availableVehicles,
      soldVehicles,
      reservedVehicles,
      inventoryValue,
      recentVehicles,
      monthlySales,
      trendPercentage
    });
  } catch (error) {
    console.error("Sales stats API Error:", error);
    return NextResponse.json({ error: "Failed to fetch sales stats" }, { status: 500 });
  }
}
