import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";
import { verifyRole } from "@/lib/auth";

// GET /api/inventory — list products with prices (paginated)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const scope = searchParams.get("scope") || "current";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const branchId = getActiveBranchId();
  const userRole = await verifyRole(req.cookies.get("user_role")?.value);
  const isAdmin = userRole === "ADMIN";

  const view = searchParams.get("view");
  const isSelector = view === "selector";
  
  const limitParam = parseInt(searchParams.get("limit") || "20");
  const limit = isSelector 
    ? Math.min(1000, Math.max(1, limitParam)) 
    : Math.min(50, Math.max(1, limitParam));
  
  const skip = (page - 1) * limit;

  const where: any = { status: "ACTIVE" };
  const branchFilter = searchParams.get("branchFilter");

  let targetBranchId: number | undefined;

  if (branchFilter && branchFilter !== "all") {
    targetBranchId = Number(branchFilter);
  } else if (scope !== "other" && branchId) {
    targetBranchId = branchId;
  }

  if (targetBranchId) {
    where.productBranches = {
      some: {
        branchId: targetBranchId
      }
    };
  } else if (scope === "other" && branchId) {
    where.productBranches = {
      some: {
        branchId: { not: branchId }
      }
    };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
    if (/^\d+$/.test(search.trim())) {
      where.OR.push({ id: parseInt(search.trim(), 10) });
    }
  }
  if (category) where.category = category;

  if (isSelector) {
    const rawProducts = await prisma.product.findMany({
      where,
      select: {
        id: true,
        sku: true,
        name: true,
        prices: {
          select: {
            type: true,
            amount: true,
          }
        },
        productBranches: {
          where: targetBranchId ? { branchId: targetBranchId } : undefined,
          select: {
            branchId: true,
            stockCount: true,
          }
        }
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    });

    const products = rawProducts.map((p: any) => {
      const pb = p.productBranches?.[0];
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        prices: p.prices,
        stockCount: pb?.stockCount || 0,
      };
    });

    return NextResponse.json({ products });
  }

  const statFilter = searchParams.get("statFilter");
  if (statFilter === "low" || statFilter === "high") {
    if (statFilter === "low") {
      where.productBranches = {
        ...where.productBranches,
        some: {
          ...where.productBranches?.some,
          stockCount: { lte: prisma.productBranch.fields.stockMin }
        }
      };
    } else {
      where.productBranches = {
        ...where.productBranches,
        some: {
          ...where.productBranches?.some,
          stockCount: { gte: prisma.productBranch.fields.stockMax }
        }
      };
    }
  }

  const summaryWhere = { ...where };
  delete summaryWhere.productBranches;
  if (targetBranchId) {
    summaryWhere.productBranches = { some: { branchId: targetBranchId } };
  } else if (!isAdmin && scope === "other" && branchId) {
    summaryWhere.productBranches = { some: { branchId: { not: branchId } } };
  }

  const [rawProducts, total, categories, summaryProducts] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { 
        prices: true, 
        productBranches: {
          where: targetBranchId ? { branchId: targetBranchId } : undefined,
          include: { branch: true },
        },
        children: { 
          include: { 
            prices: true, 
            productBranches: {
              where: targetBranchId ? { branchId: targetBranchId } : undefined,
              include: { branch: true },
            } 
          } 
        } 
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
    prisma.product.findMany({ select: { category: true }, distinct: ["category"] }),
    prisma.product.findMany({
      where: summaryWhere,
      include: {
        prices: true,
        productBranches: {
          where: targetBranchId ? { branchId: targetBranchId } : scope === "other" && branchId ? { branchId: { not: branchId } } : undefined
        }
      }
    }),
  ]);

  // Map ProductBranch data to Product root level for UI backward compatibility
  const mapProduct = (p: any) => {
    const pb = p.productBranches?.[0];
    return {
      ...p,
      stockCount: pb?.stockCount || 0,
      stockMin: pb?.stockMin || 0,
      stockMax: pb?.stockMax || 100,
      movingAvgCost: pb?.movingAvgCost || 0,
      lastImportDate: pb?.lastImportDate || null,
      branchId: pb?.branchId || null,
      branch: pb?.branch || null,
      children: p.children ? p.children.map(mapProduct) : []
    };
  };

  const products = rawProducts.map(mapProduct);
  const summary = summaryProducts.reduce((acc: any, p: any) => {
    const branches = p.productBranches?.length ? p.productBranches : [{ stockCount: 0, stockMin: 0, stockMax: 100 }];
    const retail = (p.prices || []).find((pr: any) => pr.type === "RETAIL");
    const insurance = (p.prices || []).find((pr: any) => pr.type === "INSURANCE");
    branches.forEach((pb: any) => {
      const stockCount = Number(pb.stockCount || 0);
      const stockMin = Number(pb.stockMin || 0);
      const stockMax = Number(pb.stockMax || 100);
      acc.totalValue += retail ? Number(retail.amount) * stockCount : 0;
      acc.totalInsuranceValue += insurance ? Number(insurance.amount) * stockCount : 0;
      if (stockCount <= stockMin) acc.lowStockCount += 1;
      if (stockCount >= stockMax) acc.highStockCount += 1;
    });
    return acc;
  }, { totalValue: 0, totalInsuranceValue: 0, lowStockCount: 0, highStockCount: 0 });

  // Low stock alert (using the mapped products for simplicity, in production should query DB)
  let lowStock = products.filter(p => p.stockCount <= p.stockMin).map(p => ({
    id: p.id,
    name: p.name,
    stockCount: p.stockCount,
    stockMin: p.stockMin
  }));

  const totalValue = products.reduce((sum, p: any) => {
    const retail = (p.prices || []).find((pr: any) => pr.type === "RETAIL");
    return sum + (retail ? Number(retail.amount) * p.stockCount : 0);
  }, 0);

  return NextResponse.json({
    products,
    categories: categories.map((c) => c.category),
    lowStock,
    totalValue,
    summary,
    totalCount: total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    limit,
  });
}

// POST /api/inventory — create product
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userRole = await verifyRole(req.cookies.get("user_role")?.value);
    const isAdmin = userRole === "ADMIN";
    const branchId = getActiveBranchId();
    
    const targetBranchId = (isAdmin && body.branchId) ? Number(body.branchId) : branchId;
    if (!targetBranchId) return NextResponse.json({ error: "Yêu cầu mã chi nhánh hoạt động" }, { status: 400 });

    // Release SKUs of any old INACTIVE products to avoid unique constraint failures on new creations
    try {
      const oldInactive = await prisma.product.findMany({
        where: {
          status: "INACTIVE",
          NOT: {
            sku: {
              startsWith: "INACTIVE-",
            },
          },
        },
      });
      for (const p of oldInactive) {
        await prisma.product.update({
          where: { id: p.id },
          data: { sku: `INACTIVE-${p.id}-${p.sku}` },
        });
      }
    } catch (e) {
      console.error("Error auto-releasing INACTIVE SKUs:", e);
    }

    if (body.sku) {
      const existingActive = await prisma.product.findFirst({
        where: {
          sku: body.sku,
          status: { not: "INACTIVE" }
        }
      });
      if (existingActive) {
        return NextResponse.json({ error: `Mã sản phẩm (SKU) '${body.sku}' đã tồn tại và đang hoạt động.` }, { status: 400 });
      }
    }

    const product = await prisma.product.create({
      data: {
        sku: body.sku,
        name: body.name,
        category: body.category || "General",
        unit: body.unit,
        conversionUnit: body.conversionUnit,
        conversionFactor: body.conversionFactor || 1,
        parentId: body.parentId,
        productBranches: {
          create: [{
            branchId: targetBranchId,
            stockCount: body.stockCount || 0,
            stockMin: body.stockMin || 0,
            stockMax: body.stockMax || 100,
            movingAvgCost: 0,
          }]
        },
        prices: {
          create: body.prices || [],
        },
      },
      include: { prices: true, productBranches: true },
    });
    
    const mappedProduct = {
      ...product,
      stockCount: product.productBranches[0].stockCount,
      stockMin: product.productBranches[0].stockMin,
      stockMax: product.productBranches[0].stockMax,
      branchId: product.productBranches[0].branchId
    };
    
    return NextResponse.json(mappedProduct, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
