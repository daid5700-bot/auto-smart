import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

// GET /api/dashboard — aggregate stats
export async function GET() {
  try {
    const branchId = getActiveBranchId();

    const [
      totalProducts, lowStockProducts, totalCustomers, totalLeads,
      activeROs, totalVehicles, availableVehicles, znsToday, repairOrders,
      recentLeads
    ] = await Promise.all([
      prisma.product.count({ where: branchId ? { branchId } : {} }),
      prisma.product.count({
        where: {
          stockCount: { lte: prisma.product.fields.stockMin },
          ...(branchId ? { branchId } : {})
        }
      }).catch(async () => {
        if (branchId) {
          const r = await prisma.$queryRaw<[{count: bigint}]>`SELECT COUNT(*) as count FROM "Product" WHERE "stockCount" <= "stockMin" AND "branchId" = ${branchId}`;
          return Number(r[0]?.count ?? 0);
        } else {
          const r = await prisma.$queryRaw<[{count: bigint}]>`SELECT COUNT(*) as count FROM "Product" WHERE "stockCount" <= "stockMin"`;
          return Number(r[0]?.count ?? 0);
        }
      }),
      prisma.customer.count({ where: (branchId ? { branchId } : {}) as any }),
      prisma.lead.count({ where: { status: { in: ["NEW", "CONSULTING", "POTENTIAL"] }, ...(branchId ? { branchId } : {}) } }),
      prisma.repairOrder.count({ where: { status: { notIn: ["DONE", "DELIVERED"] }, ...(branchId ? { branchId } : {}) } }),
      prisma.vehicle.count({ where: branchId ? { branchId } : {} }),
      prisma.vehicle.count({ where: { status: "AVAILABLE", ...(branchId ? { branchId } : {}) } }),
      prisma.znsLog.count({ where: { sentAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, ...(branchId ? { branchId } : {}) } }),
      prisma.repairOrder.findMany({
        where: branchId ? { branchId } : {},
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { customer: true, technician: true }
      }),
      prisma.lead.findMany({
        where: branchId ? { branchId } : {},
        orderBy: { createdAt: "desc" },
        take: 5
      })
    ]);

    // Low stock parts
    let lowStockParts: any[] = [];
    if (branchId) {
      lowStockParts = await prisma.$queryRaw<Array<{id: number, name: string, sku: string, stockCount: number, stockMin: number}>>`
        SELECT id, name, sku, "stockCount", "stockMin" FROM "Product" WHERE "stockCount" <= "stockMin" AND status = 'ACTIVE' AND "branchId" = ${branchId}
      `;
    } else {
      lowStockParts = await prisma.$queryRaw<Array<{id: number, name: string, sku: string, stockCount: number, stockMin: number}>>`
        SELECT id, name, sku, "stockCount", "stockMin" FROM "Product" WHERE "stockCount" <= "stockMin" AND status = 'ACTIVE'
      `;
    }

    return NextResponse.json({
      totalProducts,
      lowStockCount: typeof lowStockProducts === 'number' ? lowStockProducts : 0,
      lowStockParts,
      totalCustomers,
      pendingLeads: totalLeads,
      activeRepairOrders: activeROs,
      totalVehicles,
      availableVehicles,
      znsSentToday: znsToday,
      recentRepairOrders: repairOrders,
      recentLeads,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
