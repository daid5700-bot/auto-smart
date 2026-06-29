export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

// GET /api/reports — full branch-scoped ERP report with date range filtering
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

    const branchId = getActiveBranchId();
    const baseWhere: any = branchId ? { branchId } : {};

    // Default dates for comparison if not filtering
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Current period and previous period calculation
    const startRange = startDate || startOfCurrentMonth;
    const endRange = endDate || now;
    const diffTime = endRange.getTime() - startRange.getTime();

    const prevEnd = new Date(startRange.getTime() - 1);
    const prevStart = new Date(startRange.getTime() - diffTime);

    // --- Summary stats ---
    const [
      activeKtv,
      totalCustomers,
      newCustomersThisMonth,
      newLeadsThisMonth,
      convertedLeads,
      totalVehiclesAvailable,
      totalVehiclesSold,
    ] = await Promise.all([
      prisma.technician.count({ where: { ...baseWhere, status: "WORKING" } }),
      prisma.customer.count({ where: baseWhere }),
      prisma.customer.count({ where: { ...baseWhere, createdAt: { gte: startRange, lte: endRange } } }),
      prisma.lead.count({ where: { ...baseWhere, createdAt: { gte: startRange, lte: endRange } } }),
      prisma.lead.count({ where: { ...baseWhere, status: "CONVERTED", updatedAt: { gte: startRange, lte: endRange } } }),
      prisma.vehicle.count({ where: { ...baseWhere, status: "AVAILABLE" } }),
      prisma.vehicle.count({ where: { ...baseWhere, status: "SOLD", updatedAt: { gte: startRange, lte: endRange } } }),
    ]);

    // --- Workshop revenue (from completed repair orders) ---
    // FIX BIZ-001: Use paidAmount (actually collected) not totalAmount (includes unpaid debt)
    // FIX PERF-002: Push date filtering to Prisma WHERE instead of in-memory
    const [allTimeRevResult, currentPeriodRevResult, prevPeriodRevResult, currentPeriodROCount, prevPeriodROCount] = await Promise.all([
      // All-time paid revenue
      prisma.repairOrder.aggregate({
        _sum: { paidAmount: true },
        where: { ...baseWhere, status: { in: ["DONE", "DELIVERED"] } },
      }),
      // Current period paid revenue
      prisma.repairOrder.aggregate({
        _sum: { paidAmount: true },
        where: { ...baseWhere, status: { in: ["DONE", "DELIVERED"] }, createdAt: { gte: startRange, lte: endRange } },
      }),
      // Previous period paid revenue
      prisma.repairOrder.aggregate({
        _sum: { paidAmount: true },
        where: { ...baseWhere, status: { in: ["DONE", "DELIVERED"] }, createdAt: { gte: prevStart, lte: prevEnd } },
      }),
      // Current period RO count
      prisma.repairOrder.count({
        where: { ...baseWhere, status: { in: ["DONE", "DELIVERED"] }, createdAt: { gte: startRange, lte: endRange } },
      }),
      // Previous period RO count
      prisma.repairOrder.count({
        where: { ...baseWhere, status: { in: ["DONE", "DELIVERED"] }, createdAt: { gte: prevStart, lte: prevEnd } },
      }),
    ]);

    const totalWorkshopRevenue = Number(allTimeRevResult._sum.paidAmount || 0);
    const currentMonthRevenue = Number(currentPeriodRevResult._sum.paidAmount || 0);
    const lastMonthRevenue = Number(prevPeriodRevResult._sum.paidAmount || 0);

    const revenueGrowth = lastMonthRevenue > 0
      ? Math.round(((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : null;

    const completedRepairOrders = currentPeriodROCount;
    const roGrowth = prevPeriodROCount > 0
      ? Math.round(((currentPeriodROCount - prevPeriodROCount) / prevPeriodROCount) * 100)
      : null;

    // --- Monthly revenue chart (6 months ending at endRange, using Prisma aggregate) ---
    const monthlyRevenuePromises = [];
    const chartEnd = endRange;
    for (let i = 5; i >= 0; i--) {
      const start = new Date(chartEnd.getFullYear(), chartEnd.getMonth() - i, 1);
      const end = new Date(chartEnd.getFullYear(), chartEnd.getMonth() - i + 1, 0, 23, 59, 59);
      const monthLabel = start.toLocaleDateString("vi-VN", { month: "short", year: "numeric" });
      monthlyRevenuePromises.push(
        prisma.repairOrder.aggregate({
          _sum: { paidAmount: true },
          where: { ...baseWhere, status: { in: ["DONE", "DELIVERED"] }, createdAt: { gte: start, lte: end } },
        }).then(result => ({ month: monthLabel, revenue: Number(result._sum.paidAmount || 0) }))
      );
    }
    const monthlyRevenue = await Promise.all(monthlyRevenuePromises);

    // --- Top selling products (from OrderItems in current period) ---
    const matchingRepairOrders = await prisma.repairOrder.findMany({
      where: {
        ...baseWhere,
        createdAt: { gte: startRange, lte: endRange },
      },
      select: { id: true },
    });
    const repairOrderIds = matchingRepairOrders.map((ro) => ro.id);

    const orderItemGroups = await prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { totalPrice: "desc" } },
      take: 5,
      where: {
        repairOrderId: { in: repairOrderIds },
      },
    });

    const topProductIds = orderItemGroups.map((g) => g.productId);
    const topProducts = await prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: { id: true, name: true, sku: true },
    });

    const topProductsFormatted = orderItemGroups.map((g) => {
      const product = topProducts.find((p) => p.id === g.productId);
      return {
        name: product?.name ?? "Không xác định",
        sku: product?.sku ?? "",
        qty: Math.round(g._sum.quantity ?? 0),
        revenue: Number(g._sum.totalPrice ?? 0),
      };
    });

    // --- Recent completed repair orders in current period ---
    const recentOrders = await prisma.repairOrder.findMany({
      where: {
        ...baseWhere,
        status: { in: ["DONE", "DELIVERED"] },
        createdAt: { gte: startRange, lte: endRange }
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { customer: { select: { name: true } }, technician: { select: { name: true } } },
    });

    // --- Leads breakdown by status ---
    const leadsStatusRaw = await prisma.lead.groupBy({
      by: ["status"],
      _count: true,
      where: {
        ...baseWhere,
        createdAt: { gte: startRange, lte: endRange }
      },
    });
    const leadsBreakdown = leadsStatusRaw.reduce((acc: Record<string, number>, l) => {
      acc[l.status] = l._count;
      return acc;
    }, {});

    // --- Customer source breakdown ---
    const customerSourceRaw = await prisma.customer.groupBy({
      by: ["source"],
      _count: true,
      where: {
        ...baseWhere,
        createdAt: { gte: startRange, lte: endRange }
      },
    });
    const customerSources = customerSourceRaw.reduce((acc: Record<string, number>, c) => {
      acc[c.source] = c._count;
      return acc;
    }, {});

    return NextResponse.json({
      branchId,
      summary: {
        totalWorkshopRevenue,
        currentMonthRevenue,
        revenueGrowth,
        completedRepairOrders,
        currentMonthROCount: completedRepairOrders,
        roGrowth,
        activeKtv,
        totalCustomers,
        newCustomersThisMonth,
        newLeadsThisMonth,
        convertedLeads,
        totalVehiclesAvailable,
        totalVehiclesSold,
      },
      monthlyRevenue,
      topProducts: topProductsFormatted,
      recentOrders: recentOrders.map((ro) => ({
        id: ro.id,
        plateNumber: ro.plateNumber,
        vehicleModel: ro.vehicleModel,
        customer: ro.customer?.name ?? "—",
        technician: ro.technician?.name ?? "—",
        totalAmount: Number(ro.totalAmount),
        status: ro.status,
        completedAt: ro.updatedAt,
      })),
      leadsBreakdown,
      customerSources,
    });
  } catch (error: any) {
    console.error("Reports API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
