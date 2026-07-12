export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";
import { Prisma } from "@prisma/client";

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

    // Declare filters for query parallelization
    const movementWhere: any = {
      product: {
        ...(branchId ? { productBranches: { some: { branchId } } } : {}),
      },
    };
    if (startDate || endDate) {
      movementWhere.createdAt = {};
      if (startDate) movementWhere.createdAt.gte = startDate;
      if (endDate) movementWhere.createdAt.lte = endDate;
    }

    const exportWhere: any = {
      type: { in: ["EXPORT", "EXPORT_GIFT"] },
      vehicleId: { not: null },
    };
    if (branchId) {
      exportWhere.product = { productBranches: { some: { branchId } } };
    }
    if (startDate || endDate) {
      exportWhere.createdAt = {};
      if (startDate) exportWhere.createdAt.gte = startDate;
      if (endDate) exportWhere.createdAt.lte = endDate;
    }

    const branchCondition = branchId ? Prisma.sql`AND pb."branchId" = ${branchId}` : Prisma.empty;
    const branchMovementCond = branchId ? Prisma.sql`AND m."branchId" = ${branchId}` : Prisma.empty;
    const dateMovementCond = startDate || endDate ? Prisma.sql`
      ${startDate ? Prisma.sql`AND m."createdAt" >= ${startDate}` : Prisma.empty}
      ${endDate ? Prisma.sql`AND m."createdAt" <= ${endDate}` : Prisma.empty}
    ` : Prisma.empty;

    // Run all database calls concurrently in a single Promise.all block
    const [
      totalProducts,
      productsStatsRaw,
      lowStockItemsRaw,
      recentMovements,
      exports,
      exportCount,
      giftRequisitions,
      exportStatsRaw
    ] = await Promise.all([
      prisma.product.count({
        where: {
          status: "ACTIVE",
          ...(branchId ? { productBranches: { some: { branchId } } } : {}),
        },
      }),
      prisma.$queryRaw<any[]>`
        SELECT
          p.category,
          COUNT(p.id)::int as count,
          SUM(pb."stockCount")::float as stock,
          SUM(pb."stockCount" * COALESCE(pr.amount, 0))::float as value
        FROM "Product" p
        JOIN "ProductBranch" pb ON p.id = pb."productId"
        LEFT JOIN "Price" pr ON pr."productId" = p.id AND pr.type = 'RETAIL'
        WHERE p.status = 'ACTIVE' ${branchCondition}
        GROUP BY p.category
      `,
      prisma.$queryRaw<any[]>`
        SELECT
          p.id,
          p.sku,
          p.name,
          pb."stockCount" as "stockCount",
          pb."stockMin" as "stockMin",
          p.unit,
          COALESCE(pr.amount, 0)::float as price
        FROM "Product" p
        JOIN "ProductBranch" pb ON p.id = pb."productId"
        LEFT JOIN "Price" pr ON pr."productId" = p.id AND pr.type = 'RETAIL'
        WHERE p.status = 'ACTIVE' AND pb."stockCount" <= pb."stockMin" ${branchCondition}
        ORDER BY pb."stockCount" ASC
        LIMIT 10
      `,
      prisma.stockMovement.findMany({
        where: movementWhere,
        take: 10,
        orderBy: { id: "desc" },
        include: {
          product: {
            select: { name: true, sku: true, unit: true },
          },
        },
      }),
      prisma.stockMovement.findMany({
        where: exportWhere,
        take: 30, // Limit for UI to avoid memory bloat
        orderBy: { id: "desc" },
        include: {
          product: {
            include: { prices: true },
          },
        },
      }),
      prisma.stockMovement.count({
        where: exportWhere,
      }),
      prisma.partsRequisition.findMany({
        where: {
          vehicleId: { not: null },
          status: "APPROVED",
          ...(branchId ? { branchId } : {}),
          ...(startDate || endDate ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {})
            }
          } : {})
        },
        take: 30, // Limit for UI
        include: {
          vehicle: {
            include: { customer: true }
          },
          items: {
            include: { product: { include: { prices: true } } }
          }
        },
        orderBy: { id: "desc" }
      }),
      prisma.$queryRaw<any[]>`
        WITH RetailPrices AS (
          SELECT "productId", amount FROM "Price" WHERE type = 'RETAIL'
        )
        SELECT
          m.type,
          SUM(m.quantity)::float as quantity,
          SUM(
            CASE
              WHEN m.type = 'EXPORT_GIFT' THEN m.quantity * COALESCE(NULLIF(m."unitCost", 0), p.amount, 0)
              ELSE 
                CASE 
                  WHEN m."totalCost" > 0 THEN m."totalCost"
                  ELSE m.quantity * COALESCE(NULLIF(m."unitCost", 0), p.amount, 0)
                END
            END
          )::float as amount
        FROM "StockMovement" m
        LEFT JOIN RetailPrices p ON m."productId" = p."productId"
        WHERE m.type IN ('EXPORT', 'EXPORT_GIFT')
          AND m."vehicleId" IS NOT NULL
          ${branchMovementCond}
          ${dateMovementCond}
        GROUP BY m.type
      `
    ]);

    let totalStock = 0;
    let totalValuation = 0;
    const categories = productsStatsRaw.map(row => {
      totalStock += Number(row.stock || 0);
      totalValuation += Number(row.value || 0);
      return {
        name: row.category || "General",
        count: Number(row.count || 0),
        stock: Number(row.stock || 0),
        value: Number(row.value || 0),
      };
    }).sort((a, b) => b.value - a.value);

    const lowStockCount = await prisma.$queryRaw<[{count: number}]>`
      SELECT COUNT(*)::int as count 
      FROM "Product" p 
      JOIN "ProductBranch" pb ON p.id = pb."productId"
      WHERE p.status = 'ACTIVE' AND pb."stockCount" <= pb."stockMin" ${branchCondition}
    `.then(res => res[0]?.count || 0);

    const lowStockItems = lowStockItemsRaw.map(row => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      stockCount: Number(row.stockCount || 0),
      stockMin: Number(row.stockMin || 0),
      unit: row.unit,
      price: Number(row.price || 0),
    }));

    let totalSoldQty = 0;
    let totalSoldAmount = 0;
    let totalGiftQty = 0;
    let totalGiftAmount = 0;

    exportStatsRaw.forEach(stat => {
      if (stat.type === "EXPORT_GIFT") {
        totalGiftQty += Number(stat.quantity || 0);
        totalGiftAmount += Number(stat.amount || 0);
      } else {
        totalSoldQty += Number(stat.quantity || 0);
        totalSoldAmount += Number(stat.amount || 0);
      }
    });

    const serializedExports = exports.map((m) => {
      const retailPrice = m.product.prices.find((p) => p.type === "RETAIL")?.amount || 0;
      const actualPrice = Number(m.unitCost) > 0 ? Number(m.unitCost) : Number(retailPrice);
      
      return {
        id: m.id,
        productId: m.productId,
        type: m.type,
        quantity: Number(m.quantity),
        unitCost: Number(m.unitCost),
        totalCost: Number(m.totalCost) > 0 ? Number(m.totalCost) : actualPrice * Number(m.quantity),
        reason: m.reason,
        relatedRoId: m.relatedRoId,
        createdBy: m.createdBy,
        createdAt: m.createdAt,
        product: {
          sku: m.product.sku,
          name: m.product.name,
          unit: m.product.unit,
          price: actualPrice
        }
      };
    });

    const serializedGifts = giftRequisitions.map(r => ({
      id: r.id,
      createdAt: r.createdAt,
      createdBy: r.createdBy,
      status: r.status,
      vehicle: r.vehicle ? {
        id: r.vehicle.id,
        vin: r.vehicle.vin,
        model: r.vehicle.model,
        variant: r.vehicle.variant,
        color: r.vehicle.color,
        customerName: r.vehicle.customer?.name || "Không rõ",
        customerPhone: r.vehicle.customer?.phone || "—"
      } : null,
      items: r.items.map(item => {
        const retailPrice = item.product.prices.find((p) => p.type === "RETAIL")?.amount || 0;
        return {
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          product: {
            sku: item.product.sku,
            name: item.product.name,
            unit: item.product.unit,
            price: Number(retailPrice)
          }
        };
      })
    }));

    return NextResponse.json({
      totalProducts,
      totalStock,
      totalValuation,
      lowStockCount,
      categories,
      lowStockItems,
      recentMovements,
      totalSoldQty,
      totalSoldAmount,
      totalGiftQty,
      totalGiftAmount,
      exports: serializedExports,
      exportCount,
      giftRequisitions: serializedGifts,
    });
  } catch (error) {
    console.error("Inventory Stats API error:", error);
    return NextResponse.json({ error: "Failed to load inventory stats" }, { status: 500 });
  }
}
