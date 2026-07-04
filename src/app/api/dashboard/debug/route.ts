export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

export async function GET() {
  const steps: Record<string, any> = {};
  
  // Helper to run query and record output or error
  const runQuery = async (name: string, fn: () => Promise<any>) => {
    try {
      const result = await fn();
      steps[name] = { success: true, countOrType: typeof result === "object" ? (Array.isArray(result) ? `Array[${result.length}]` : "Object") : result };
    } catch (e: any) {
      steps[name] = { success: false, error: e.message || String(e) };
    }
  };

  const branchId = getActiveBranchId();
  steps["info"] = { branchId, activeBranchCookieExists: typeof branchId === "number" };

  await runQuery("1. count_products", () => 
    prisma.product.count({ where: branchId ? { productBranches: { some: { branchId } } } : {} })
  );

  await runQuery("2. count_customers", () => 
    prisma.customer.count({ where: { isDeleted: false, ...(branchId ? { branchId } : {}) } })
  );

  await runQuery("3. count_leads", () => 
    prisma.lead.count({ where: branchId ? { branchId } : {} })
  );

  await runQuery("4. count_new_leads", () => 
    prisma.lead.count({ where: { status: "NEW", ...(branchId ? { branchId } : {}) } })
  );

  await runQuery("5. count_active_ros", () => 
    prisma.repairOrder.count({ where: { status: { notIn: ["DONE", "DELIVERED"] }, isDeleted: false, ...(branchId ? { branchId } : {}) } })
  );

  await runQuery("6. count_waiting_parts", () => 
    prisma.repairOrder.count({ where: { status: "WAITING_PARTS", isDeleted: false, ...(branchId ? { branchId } : {}) } })
  );

  await runQuery("7. count_vehicles", () => 
    prisma.vehicle.count({ where: branchId ? { branchId } : {} })
  );

  await runQuery("8. count_zns_today", () => 
    prisma.znsLog.count({ where: { sentAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, ...(branchId ? { branchId } : {}) } })
  );

  await runQuery("9. count_ro_today", () => 
    prisma.repairOrder.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, isDeleted: false, ...(branchId ? { branchId } : {}) } })
  );

  await runQuery("10. count_technicians", () => 
    prisma.technician.count({ where: branchId ? { branchId } : {} })
  );

  await runQuery("11. low_stock_query_raw", async () => {
    if (branchId) {
      return prisma.$queryRaw`
        SELECT p.id, p.name, p.sku, pb."stockCount", pb."stockMin" 
        FROM "Product" p
        JOIN "ProductBranch" pb ON p.id = pb."productId"
        WHERE pb."stockCount" <= pb."stockMin" AND p.status = 'ACTIVE' AND pb."branchId" = ${branchId}
      `;
    } else {
      return prisma.$queryRaw`
        SELECT p.id, p.name, p.sku, pb."stockCount", pb."stockMin" 
        FROM "Product" p
        JOIN "ProductBranch" pb ON p.id = pb."productId"
        WHERE pb."stockCount" <= pb."stockMin" AND p.status = 'ACTIVE'
      `;
    }
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  await runQuery("12. current_30_days_ros", () => 
    prisma.repairOrder.findMany({
      where: {
        status: { in: ["DONE", "DELIVERED"] },
        completedAt: { gte: thirtyDaysAgo },
        isDeleted: false,
        ...(branchId ? { branchId } : {}),
      },
      select: { totalAmount: true },
    })
  );

  await runQuery("13. previous_30_days_ros", () => 
    prisma.repairOrder.findMany({
      where: {
        status: { in: ["DONE", "DELIVERED"] },
        completedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        isDeleted: false,
        ...(branchId ? { branchId } : {}),
      },
      select: { totalAmount: true },
    })
  );

  await runQuery("14. techs_revenue", () => 
    prisma.technician.findMany({
      where: branchId ? { branchId } : {},
      include: {
        repairOrders: {
          where: { status: { in: ["DONE", "DELIVERED"] }, isDeleted: false },
          select: { totalAmount: true },
        },
      },
    })
  );

  await runQuery("15. active_ro_list", () => 
    prisma.repairOrder.findMany({
      where: {
        status: { notIn: ["DONE", "DELIVERED"] },
        isDeleted: false,
        ...(branchId ? { branchId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { customer: true, technician: true },
    })
  );

  await runQuery("16. all_customers_care", () => 
    prisma.customer.findMany({
      where: {
        isDeleted: false,
        ...(branchId ? { branchId } : {}),
      },
      orderBy: { lastVisit: "desc" },
      take: 10,
    })
  );

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  await runQuery("17. year_ros", () => 
    prisma.repairOrder.findMany({
      where: {
        status: { in: ["DONE", "DELIVERED"] },
        completedAt: { gte: twelveMonthsAgo },
        isDeleted: false,
        ...(branchId ? { branchId } : {}),
      },
      select: { completedAt: true, totalAmount: true },
    })
  );

  return NextResponse.json({ steps });
}
