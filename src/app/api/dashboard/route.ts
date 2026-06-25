export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

// GET /api/dashboard — aggregate stats
export async function GET() {
  try {
    const branchId = getActiveBranchId();

    // 1. Basic counts
    const [
      totalProducts,
      totalCustomers,
      totalLeads,
      newLeadsCount,
      activeROs,
      waitingForPartsCount,
      totalVehicles,
      znsTodayCount,
      roTodayCount,
      totalTechnicians,
    ] = await Promise.all([
      prisma.product.count({ where: branchId ? { branchId } : {} }),
      prisma.customer.count({ where: branchId ? { branchId } : {} }),
      prisma.lead.count({ where: branchId ? { branchId } : {} }),
      prisma.lead.count({ where: { status: "NEW", ...(branchId ? { branchId } : {}) } }),
      prisma.repairOrder.count({ where: { status: { notIn: ["DONE", "DELIVERED"] }, ...(branchId ? { branchId } : {}) } }),
      prisma.repairOrder.count({ where: { status: "WAITING_PARTS", ...(branchId ? { branchId } : {}) } }),
      prisma.vehicle.count({ where: branchId ? { branchId } : {} }),
      prisma.znsLog.count({ where: { sentAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, ...(branchId ? { branchId } : {}) } }),
      prisma.repairOrder.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, ...(branchId ? { branchId } : {}) } }),
      prisma.technician.count({ where: branchId ? { branchId } : {} }),
    ]);

    // 2. Low stock count and parts
    let lowStockProducts = 0;
    let lowStockParts: any[] = [];
    try {
      if (branchId) {
        lowStockParts = await prisma.$queryRaw<Array<{id: number, name: string, sku: string, stockCount: number, stockMin: number}>>`
          SELECT id, name, sku, "stockCount", "stockMin" FROM "Product" WHERE "stockCount" <= "stockMin" AND status = 'ACTIVE' AND "branchId" = ${branchId}
        `;
      } else {
        lowStockParts = await prisma.$queryRaw<Array<{id: number, name: string, sku: string, stockCount: number, stockMin: number}>>`
          SELECT id, name, sku, "stockCount", "stockMin" FROM "Product" WHERE "stockCount" <= "stockMin" AND status = 'ACTIVE'
        `;
      }
      lowStockProducts = lowStockParts.length;
    } catch (e) {
      console.error(e);
    }

    // 3. 30 Days Revenue, Previous 30 Days Revenue, Trend & Closed ROs
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const [current30DaysROs, previous30DaysROs] = await Promise.all([
      prisma.repairOrder.findMany({
        where: {
          status: { in: ["DONE", "DELIVERED"] },
          completedAt: { gte: thirtyDaysAgo },
          ...(branchId ? { branchId } : {}),
        },
        select: { totalAmount: true },
      }),
      prisma.repairOrder.findMany({
        where: {
          status: { in: ["DONE", "DELIVERED"] },
          completedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          ...(branchId ? { branchId } : {}),
        },
        select: { totalAmount: true },
      })
    ]);

    const revenue30Days = current30DaysROs.reduce((sum, ro) => sum + Number(ro.totalAmount), 0);
    const closedROsCount = current30DaysROs.length;

    const previous30DaysRevenue = previous30DaysROs.reduce((sum, ro) => sum + Number(ro.totalAmount), 0);
    
    // Calculate trend percentage
    let trendPercentage = 0;
    if (previous30DaysRevenue > 0) {
      trendPercentage = Number(((revenue30Days - previous30DaysRevenue) / previous30DaysRevenue * 100).toFixed(1));
    } else if (revenue30Days > 0) {
      trendPercentage = 100;
    }

    // 4. Top 5 Technicians by completed RO total amount
    const techs = await prisma.technician.findMany({
      where: branchId ? { branchId } : {},
      include: {
        repairOrders: {
          where: { status: { in: ["DONE", "DELIVERED"] } },
          select: { totalAmount: true },
        },
      },
    });
    const topKtv = techs.map((t) => {
      const completedOrders = t.repairOrders.length;
      const totalRevenue = t.repairOrders.reduce((sum, ro) => sum + Number(ro.totalAmount), 0);
      return {
        id: t.id,
        name: t.name,
        completedOrders,
        totalRevenue,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);

    // 5. Active RO List (limit 5)
    const activeROList = await prisma.repairOrder.findMany({
      where: {
        status: { notIn: ["DONE", "DELIVERED"] },
        ...(branchId ? { branchId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { customer: true, technician: true },
    });

    // 6. Care reminders (Oil change schedules)
    const allCustomers = await prisma.customer.findMany({
      where: branchId ? { branchId } : {},
      orderBy: { lastVisit: "desc" },
      take: 10,
    });
    const careSchedules = allCustomers.map((c) => {
      const baseDate = c.lastVisit ? new Date(c.lastVisit) : new Date(c.createdAt);
      const nextOilChange = new Date(baseDate);
      nextOilChange.setMonth(nextOilChange.getMonth() + 6);
      return {
        id: c.id,
        customerName: c.name,
        plateNumber: c.vehiclePlates?.[0] || "Chưa có biển",
        reminderType: "OIL_CHANGE",
        dueDate: nextOilChange,
      };
    }).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()).slice(0, 5);

    // 7. Last 12 months revenue (Optimized: 1 query instead of 12)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const allYearROs = await prisma.repairOrder.findMany({
      where: {
        status: { in: ["DONE", "DELIVERED"] },
        completedAt: { gte: twelveMonthsAgo },
        ...(branchId ? { branchId } : {}),
      },
      select: { completedAt: true, totalAmount: true },
    });

    const monthlyRevenue = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthLabel = `T${d.getMonth() + 1}`;
      
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      
      const total = allYearROs
        .filter(ro => ro.completedAt && ro.completedAt >= startOfMonth && ro.completedAt <= endOfMonth)
        .reduce((sum, ro) => sum + Number(ro.totalAmount) / 1000000, 0); // in millions VND
      
      monthlyRevenue.push({ label: monthLabel, value: Number(total.toFixed(1)) });
    }

    return NextResponse.json({
      totalProducts,
      lowStockCount: lowStockProducts,
      lowStockParts,
      totalCustomers,
      pendingLeads: totalLeads,
      newLeadsCount,
      activeRepairOrders: activeROs,
      waitingForPartsCount,
      totalVehicles,
      znsSentToday: znsTodayCount,
      roTodayCount,
      totalTechnicians,
      revenue30Days,
      closedROsCount,
      trendPercentage,
      topKtv,
      activeROList,
      careSchedules,
      monthlyRevenue,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
