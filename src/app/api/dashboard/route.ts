export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

// --- In-memory cache (L1) — 60-second TTL per branchId & date range ---
const dashboardCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

// GET /api/dashboard — aggregate stats with optional date filtering
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
    if (startDate && endDate && startDate > endDate) {
      const temp = startDate;
      startDate = endDate;
      endDate = temp;
    }

    const branchId = getActiveBranchId();
    const cacheKey = `dashboard_${branchId ?? "all"}_${startDateStr ?? ""}_${endDateStr ?? ""}`;

    // Return cached data if still fresh
    const cached = dashboardCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.data);
    }

    // Dynamic date filters for transactional metrics
    const dateFilter = (startDate || endDate) ? {
      createdAt: {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      }
    } : {};

    const znsDateFilter = (startDate || endDate) ? {
      sentAt: {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      }
    } : {
      sentAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    };

    const roTodayFilter = (startDate || endDate) ? {
      createdAt: {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      }
    } : {
      createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    };

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
      prisma.product.count({ where: branchId ? { productBranches: { some: { branchId } } } : {} }),
      prisma.customer.count({ 
        where: { 
          isDeleted: false, 
          ...(branchId ? { branchId } : {}),
          ...((startDate || endDate) ? { createdAt: { ...(startDate ? { gte: startDate } : {}), ...(endDate ? { lte: endDate } : {}) } } : {}),
        } 
      }),
      prisma.lead.count({ 
        where: {
          ...(branchId ? { branchId } : {}),
          ...dateFilter,
        }
      }),
      prisma.lead.count({ 
        where: { 
          status: "NEW", 
          ...(branchId ? { branchId } : {}),
          ...dateFilter,
        } 
      }),
      prisma.repairOrder.count({ 
        where: { 
          status: { notIn: ["DONE", "DELIVERED"] }, 
          isDeleted: false,
          ...(branchId ? { branchId } : {}),
          ...dateFilter,
        } 
      }),
      prisma.repairOrder.count({ 
        where: { 
          status: "WAITING_PARTS", 
          isDeleted: false,
          ...(branchId ? { branchId } : {}),
          ...dateFilter,
        } 
      }),
      prisma.vehicle.count({ 
        where: {
          ...(branchId ? { branchId } : {}),
          // We keep totalVehicles as master data count unless filtered explicitly by date
          ...dateFilter,
        }
      }),
      prisma.znsLog.count({ 
        where: { 
          ...(branchId ? { branchId } : {}),
          ...znsDateFilter,
        } 
      }),
      prisma.repairOrder.count({ 
        where: { 
          isDeleted: false,
          ...(branchId ? { branchId } : {}),
          ...roTodayFilter,
        } 
      }),
      prisma.technician.count({ where: branchId ? { branchId } : {} }),
    ]);

    // 2. Low stock count and parts
    let lowStockProducts = 0;
    let lowStockParts: any[] = [];
    try {
      if (branchId) {
        lowStockParts = await prisma.$queryRaw<Array<{id: number, name: string, sku: string, stockCount: number, stockMin: number}>>`
          SELECT p.id, p.name, p.sku, pb."stockCount", pb."stockMin" 
          FROM "Product" p
          JOIN "ProductBranch" pb ON p.id = pb."productId"
          WHERE pb."stockCount" <= pb."stockMin" AND p.status = 'ACTIVE' AND pb."branchId" = ${branchId}
        `;
      } else {
        lowStockParts = await prisma.$queryRaw<Array<{id: number, name: string, sku: string, stockCount: number, stockMin: number}>>`
          SELECT p.id, p.name, p.sku, pb."stockCount", pb."stockMin" 
          FROM "Product" p
          JOIN "ProductBranch" pb ON p.id = pb."productId"
          WHERE pb."stockCount" <= pb."stockMin" AND p.status = 'ACTIVE'
        `;
      }
      lowStockProducts = lowStockParts.length;
    } catch (e) {
      console.error(e);
    }

    // 3. Dynamic Revenue, Previous Period Revenue, Trend & Closed ROs
    let currentROsFilter: any = {
      status: { in: ["DONE", "DELIVERED"] },
      isDeleted: false,
      ...(branchId ? { branchId } : {}),
    };
    let previousROsFilter: any = {
      status: { in: ["DONE", "DELIVERED"] },
      isDeleted: false,
      ...(branchId ? { branchId } : {}),
    };

    if (startDate && endDate) {
      const diffTime = endDate.getTime() - startDate.getTime();
      const prevStartDate = new Date(startDate.getTime() - diffTime);
      const prevEndDate = new Date(startDate.getTime() - 1);

      currentROsFilter.completedAt = { gte: startDate, lte: endDate };
      previousROsFilter.completedAt = { gte: prevStartDate, lte: prevEndDate };
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      currentROsFilter.completedAt = { gte: thirtyDaysAgo };
      previousROsFilter.completedAt = { gte: sixtyDaysAgo, lt: thirtyDaysAgo };
    }

    const [currentROs, previousROs] = await Promise.all([
      prisma.repairOrder.findMany({
        where: currentROsFilter,
        select: { totalAmount: true },
      }),
      prisma.repairOrder.findMany({
        where: previousROsFilter,
        select: { totalAmount: true },
      })
    ]);

    const revenue30Days = currentROs.reduce((sum, ro) => sum + Number(ro.totalAmount), 0);
    const closedROsCount = currentROs.length;
    const previous30DaysRevenue = previousROs.reduce((sum, ro) => sum + Number(ro.totalAmount), 0);
    
    // Calculate trend percentage
    let trendPercentage = 0;
    if (previous30DaysRevenue > 0) {
      trendPercentage = Number(((revenue30Days - previous30DaysRevenue) / previous30DaysRevenue * 100).toFixed(1));
    } else if (revenue30Days > 0) {
      trendPercentage = 100;
    }

    // 4. Top 5 Technicians by completed RO total amount in period
    let techROWhere: any = {
      status: { in: ["DONE", "DELIVERED"] },
    };
    if (startDate && endDate) {
      techROWhere.completedAt = { gte: startDate, lte: endDate };
    }

    const techs = await prisma.technician.findMany({
      where: branchId ? { branchId } : {},
      include: {
        repairOrders: {
          where: {
            ...techROWhere,
            isDeleted: false,
          },
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
        isDeleted: false,
        ...(branchId ? { branchId } : {}),
        ...dateFilter,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { customer: true, technician: true },
    });

    // 6. Care reminders (Oil change schedules)
    const allCustomers = await prisma.customer.findMany({
      where: {
        isDeleted: false,
        ...(branchId ? { branchId } : {}),
      },
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

    // 7. Last 12 months revenue or selected months range
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const startRange = startDate || twelveMonthsAgo;
    const endRange = endDate || new Date();

    const allYearROs = await prisma.repairOrder.findMany({
      where: {
        status: { in: ["DONE", "DELIVERED"] },
        completedAt: { gte: startRange, lte: endRange },
        isDeleted: false,
        ...(branchId ? { branchId } : {}),
      },
      select: { completedAt: true, totalAmount: true },
    });

    const monthlyRevenue = [];
    if (startDate && endDate) {
      let current = new Date(startDate);
      current.setDate(1);
      current.setHours(0, 0, 0, 0);
      const endLimit = new Date(endDate);
      endLimit.setDate(1);
      endLimit.setHours(0, 0, 0, 0);

      while (current <= endLimit) {
        const y = current.getFullYear();
        const m = current.getMonth();
        const start = new Date(y, m, 1, 0, 0, 0);
        const end = new Date(y, m + 1, 0, 23, 59, 59);
        const label = `T${m + 1}/${y.toString().slice(-2)}`;
        const total = allYearROs
          .filter(ro => ro.completedAt && ro.completedAt >= start && ro.completedAt <= end)
          .reduce((sum, ro) => sum + Number(ro.totalAmount) / 1000000, 0);
        monthlyRevenue.push({ label, value: Number(total.toFixed(1)) });
        current.setMonth(current.getMonth() + 1);
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        const monthLabel = `T${d.getMonth() + 1}`;
        
        const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
        const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
        
        const total = allYearROs
          .filter(ro => ro.completedAt && ro.completedAt >= startOfMonth && ro.completedAt <= endOfMonth)
          .reduce((sum, ro) => sum + Number(ro.totalAmount) / 1000000, 0);
        
        monthlyRevenue.push({ label: monthLabel, value: Number(total.toFixed(1)) });
      }
    }

    const responseData = {
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
    };

    // Store in cache with TTL
    dashboardCache.set(cacheKey, { data: responseData, expiresAt: Date.now() + CACHE_TTL_MS });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
