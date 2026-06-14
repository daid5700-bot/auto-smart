import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

export async function GET() {
  try {
    const branchId = getActiveBranchId();

    // 1. Basic Counts
    const [totalProducts, lowStockCount] = await Promise.all([
      prisma.product.count({
        where: {
          status: "ACTIVE",
          ...(branchId ? { branchId } : {}),
        },
      }),
      prisma.product.count({
        where: {
          status: "ACTIVE",
          stockCount: { lte: prisma.product.fields.stockMin },
          ...(branchId ? { branchId } : {}),
        },
      }),
    ]);

    // 2. Fetch products for detailed calculations (total stock, total valuation)
    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        ...(branchId ? { branchId } : {}),
      },
      include: {
        prices: true,
      },
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

    // 5. Recent stock movements
    const recentMovements = await prisma.stockMovement.findMany({
      where: {
        product: {
          ...(branchId ? { branchId } : {}),
        },
      },
      take: 10,
      orderBy: { id: "desc" },
      include: {
        product: {
          select: { name: true, sku: true, unit: true },
        },
      },
    });

    return NextResponse.json({
      totalProducts,
      totalStock,
      totalValuation,
      lowStockCount,
      categories,
      lowStockItems,
      recentMovements,
    });
  } catch (error) {
    console.error("Inventory Stats API error:", error);
    return NextResponse.json({ error: "Failed to load inventory stats" }, { status: 500 });
  }
}
