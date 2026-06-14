import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

// GET /api/reports — full branch-scoped ERP report
export async function GET() {
  try {
    const branchId = getActiveBranchId();
    const where = branchId ? { branchId } : {};

    // --- Date helpers ---
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // --- Summary stats ---
    const [
      totalRepairOrders,
      completedRepairOrders,
      activeKtv,
      totalCustomers,
      newCustomersThisMonth,
      newLeadsThisMonth,
      convertedLeads,
      totalVehiclesAvailable,
      totalVehiclesSold,
    ] = await Promise.all([
      prisma.repairOrder.count({ where }),
      prisma.repairOrder.count({ where: { ...where, status: { in: ["DONE", "DELIVERED"] } } }),
      prisma.technician.count({ where: { ...where, status: "WORKING" } }),
      prisma.customer.count({ where }),
      prisma.customer.count({ where: { ...where, createdAt: { gte: startOfCurrentMonth } } }),
      prisma.lead.count({ where: { ...where, createdAt: { gte: startOfCurrentMonth } } }),
      prisma.lead.count({ where: { ...where, status: "CONVERTED" } }),
      prisma.vehicle.count({ where: { ...where, status: "AVAILABLE" } }),
      prisma.vehicle.count({ where: { ...where, status: "SOLD" } }),
    ]);

    // --- Workshop revenue (from completed repair orders) ---
    const completedOrders = await prisma.repairOrder.findMany({
      where: { ...where, status: { in: ["DONE", "DELIVERED"] } },
      select: { totalAmount: true, createdAt: true },
    });

    const totalWorkshopRevenue = completedOrders.reduce((sum, ro) => sum + Number(ro.totalAmount), 0);

    // Revenue last month for comparison
    const lastMonthOrders = completedOrders.filter((ro) => {
      const d = new Date(ro.createdAt);
      return d >= startOfLastMonth && d <= endOfLastMonth;
    });
    const lastMonthRevenue = lastMonthOrders.reduce((sum, ro) => sum + Number(ro.totalAmount), 0);
    const currentMonthOrders = completedOrders.filter((ro) => new Date(ro.createdAt) >= startOfCurrentMonth);
    const currentMonthRevenue = currentMonthOrders.reduce((sum, ro) => sum + Number(ro.totalAmount), 0);
    const revenueGrowth = lastMonthRevenue > 0
      ? Math.round(((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : null;

    // --- Repair orders last month vs current month ---
    const lastMonthROCount = await prisma.repairOrder.count({
      where: { ...where, status: { in: ["DONE", "DELIVERED"] }, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
    });
    const currentMonthROCount = await prisma.repairOrder.count({
      where: { ...where, status: { in: ["DONE", "DELIVERED"] }, createdAt: { gte: startOfCurrentMonth } },
    });
    const roGrowth = lastMonthROCount > 0
      ? Math.round(((currentMonthROCount - lastMonthROCount) / lastMonthROCount) * 100)
      : null;

    // --- Monthly revenue chart (last 6 months) ---
    const monthlyRevenue: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthLabel = start.toLocaleDateString("vi-VN", { month: "short", year: "numeric" });
      const orders = await prisma.repairOrder.findMany({
        where: { ...where, status: { in: ["DONE", "DELIVERED"] }, createdAt: { gte: start, lte: end } },
        select: { totalAmount: true },
      });
      const revenue = orders.reduce((sum, ro) => sum + Number(ro.totalAmount), 0);
      monthlyRevenue.push({ month: monthLabel, revenue });
    }

    // --- Top selling products (from OrderItems) ---
    const orderItemGroups = await prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { totalPrice: "desc" } },
      take: 5,
      where: branchId
        ? { repairOrder: { branchId } }
        : {},
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

    // --- Recent completed repair orders ---
    const recentOrders = await prisma.repairOrder.findMany({
      where: { ...where, status: { in: ["DONE", "DELIVERED"] } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { customer: { select: { name: true } }, technician: { select: { name: true } } },
    });

    // --- Leads breakdown by status ---
    const leadsStatusRaw = await prisma.lead.groupBy({
      by: ["status"],
      _count: true,
      where,
    });
    const leadsBreakdown = leadsStatusRaw.reduce((acc: Record<string, number>, l) => {
      acc[l.status] = l._count;
      return acc;
    }, {});

    // --- Customer source breakdown ---
    const customerSourceRaw = await prisma.customer.groupBy({
      by: ["source"],
      _count: true,
      where,
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
        currentMonthROCount,
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
