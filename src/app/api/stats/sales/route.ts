export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    let startDate: Date | undefined = undefined;
    let endDate: Date | undefined = undefined;

    if (startDateStr) {
      const parsed = new Date(startDateStr);
      if (!isNaN(parsed.getTime())) {
        startDate = parsed;
      }
    }
    if (endDateStr) {
      const parsed = new Date(endDateStr);
      if (!isNaN(parsed.getTime())) {
        endDate = parsed;
        endDate.setHours(23, 59, 59, 999);
      }
    }

    const whereSold: any = { status: "SOLD" };
    if (startDate || endDate) {
      whereSold.updatedAt = {};
      if (startDate) whereSold.updatedAt.gte = startDate;
      if (endDate) whereSold.updatedAt.lte = endDate;
    }

    const [
      soldVehicles,
      soldValueResult,
      soldList
    ] = await Promise.all([
      prisma.vehicle.count({ where: whereSold }),
      prisma.vehicle.aggregate({
        _sum: { listPrice: true },
        where: whereSold
      }),
      prisma.vehicle.findMany({
        where: whereSold,
        orderBy: { updatedAt: "desc" },
        include: {
          customer: {
            select: { name: true, phone: true }
          }
        }
      })
    ]);

    const soldValue = soldValueResult._sum.listPrice || 0;
    const avgPrice = soldVehicles > 0 ? Number(soldValue) / soldVehicles : 0;

    // Group by model to calculate top selling models
    const modelMap = new Map<string, { model: string; count: number; value: number }>();
    soldList.forEach(v => {
      const modelName = v.model || "Khác";
      const priceVal = Number(v.listPrice || 0);
      const current = modelMap.get(modelName) || { model: modelName, count: 0, value: 0 };
      modelMap.set(modelName, {
        model: modelName,
        count: current.count + 1,
        value: current.value + priceVal
      });
    });
    const topModels = Array.from(modelMap.values()).sort((a, b) => b.value - a.value);

    // Fetch all SOLD vehicles to calculate real monthly sales trend
    const soldVehiclesData = await prisma.vehicle.findMany({
      where: whereSold,
      select: { updatedAt: true },
    });

    const monthlySalesMap = new Map<string, number>();
    
    // Initialize last 12 months with 0
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `T${d.getMonth() + 1}`;
      if (!monthlySalesMap.has(key)) {
        monthlySalesMap.set(key, 0);
      }
    }

    const now = new Date();
    soldVehiclesData.forEach(car => {
      const d = new Date(car.updatedAt);
      const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      
      if (diffMonths >= 0 && diffMonths < 12) {
        const key = `T${d.getMonth() + 1}`;
        if (monthlySalesMap.has(key)) {
          monthlySalesMap.set(key, monthlySalesMap.get(key)! + 1);
        }
      }
    });

    const monthlySales = Array.from(monthlySalesMap.entries()).map(([label, value]) => ({ label, value }));

    // Calculate trend percentage
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
      soldVehicles,
      soldValue,
      avgPrice,
      soldList,
      topModels,
      monthlySales,
      trendPercentage
    });
  } catch (error) {
    console.error("Sales stats API Error:", error);
    return NextResponse.json({ error: "Failed to fetch sales stats" }, { status: 500 });
  }
}
