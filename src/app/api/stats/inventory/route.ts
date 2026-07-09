export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

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
    };
    if (branchId) {
      exportWhere.product = { productBranches: { some: { branchId } } };
    }
    if (startDate || endDate) {
      exportWhere.createdAt = {};
      if (startDate) exportWhere.createdAt.gte = startDate;
      if (endDate) exportWhere.createdAt.lte = endDate;
    }

    // Run all database calls concurrently in a single Promise.all block
    const [
      [totalProducts, lowStockCount],
      rawProducts,
      recentMovements,
      exports,
      giftRequisitions
    ] = await Promise.all([
      Promise.all([
        prisma.product.count({
          where: {
            status: "ACTIVE",
            ...(branchId ? { productBranches: { some: { branchId } } } : {}),
          },
        }),
        prisma.product.count({
          where: {
            status: "ACTIVE",
            productBranches: {
               some: {
                  ...(branchId ? { branchId } : {}),
                  stockCount: { lte: prisma.productBranch.fields.stockMin }
               }
            }
          },
        }),
      ]),
      prisma.product.findMany({
        where: {
          status: "ACTIVE",
          ...(branchId ? { productBranches: { some: { branchId } } } : {}),
        },
        include: {
          prices: true,
          productBranches: {
            where: branchId ? { branchId } : undefined
          }
        },
      }),
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
        include: {
          product: {
            include: {
              prices: true,
            },
          },
        },
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
        include: {
          vehicle: {
            include: {
              customer: true
            }
          },
          items: {
            include: {
              product: {
                include: {
                  prices: true
                }
              }
            }
          }
        },
        orderBy: { id: "desc" }
      })
    ]);

    const products = rawProducts.map(p => {
       const pb = p.productBranches?.[0];
       return {
         ...p,
         stockCount: pb?.stockCount || 0,
         stockMin: pb?.stockMin || 0,
         stockMax: pb?.stockMax || 100,
       };
    });

    let totalStock = 0;
    let totalValuation = 0;

    products.forEach((prod) => {
      totalStock += prod.stockCount;
      const retailPrice = prod.prices.find((p) => p.type === "RETAIL")?.amount || 0;
      totalValuation += prod.stockCount * Number(retailPrice);
    });

    // 3. Category distribution
    const categoryStats = new Map<string, { count: number; stock: number; value: number }>();
    products.forEach((prod) => {
      const cat = prod.category || "General";
      const retailPrice = prod.prices.find((p) => p.type === "RETAIL")?.amount || 0;
      const val = prod.stockCount * Number(retailPrice);
      
      const current = categoryStats.get(cat) || { count: 0, stock: 0, value: 0 };
      categoryStats.set(cat, {
        count: current.count + 1,
        stock: current.stock + prod.stockCount,
        value: current.value + val,
      });
    });

    const categories = Array.from(categoryStats.entries()).map(([name, stats]) => ({
      name,
      ...stats,
    })).sort((a, b) => b.value - a.value);

    // 4. Low stock items
    const lowStockItems = products
      .filter((p) => p.stockCount <= p.stockMin)
      .slice(0, 10)
      .map((p) => {
        const retailPrice = p.prices.find((pr) => pr.type === "RETAIL")?.amount || 0;
        return {
          id: p.id,
          sku: p.sku,
          name: p.name,
          stockCount: p.stockCount,
          stockMin: p.stockMin,
          unit: p.unit,
          price: Number(retailPrice),
        };
      });

    let totalSoldQty = 0;
    let totalSoldAmount = 0;
    let totalGiftQty = 0;
    let totalGiftAmount = 0;

    const serializedExports = exports.map((m) => {
      const retailPrice = m.product.prices.find((p) => p.type === "RETAIL")?.amount || 0;
      const actualPrice = Number(m.unitCost) > 0 ? Number(m.unitCost) : Number(retailPrice);
      
      if (m.type === "EXPORT_GIFT") {
        totalGiftQty += m.quantity;
        totalGiftAmount += m.quantity * actualPrice;
      } else {
        totalSoldQty += m.quantity;
        if (Number(m.totalCost) > 0) {
          totalSoldAmount += Number(m.totalCost);
        } else {
          totalSoldAmount += m.quantity * actualPrice;
        }
      }

      return {
        id: m.id,
        productId: m.productId,
        type: m.type,
        quantity: m.quantity,
        unitCost: Number(m.unitCost),
        totalCost: Number(m.totalCost) > 0 ? Number(m.totalCost) : actualPrice * m.quantity,
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
      giftRequisitions: serializedGifts,
    });
  } catch (error) {
    console.error("Inventory Stats API error:", error);
    return NextResponse.json({ error: "Failed to load inventory stats" }, { status: 500 });
  }
}
