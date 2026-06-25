export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

// GET /api/inventory — list products with prices (paginated)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const scope = searchParams.get("scope") || "current";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;
  const branchId = getActiveBranchId();
  const userRole = req.cookies.get("user_role")?.value;
  const isAdmin = userRole === "ADMIN";

  const where: any = { status: "ACTIVE" };
  const branchFilter = searchParams.get("branchFilter");

  let targetBranchId: number | undefined;

  if (branchFilter && branchFilter !== "all") {
    targetBranchId = Number(branchFilter);
  } else if (scope === "current" && branchId) {
    targetBranchId = branchId;
  } else if (branchId) {
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
  }
  if (category) where.category = category;

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

  const [rawProducts, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { 
        prices: true, 
        productBranches: {
          where: targetBranchId ? { branchId: targetBranchId } : undefined
        },
        children: { 
          include: { 
            prices: true, 
            productBranches: {
              where: targetBranchId ? { branchId: targetBranchId } : undefined
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
      children: p.children ? p.children.map(mapProduct) : []
    };
  };

  const products = rawProducts.map(mapProduct);

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
    const userRole = req.cookies.get("user_role")?.value;
    const isAdmin = userRole === "ADMIN";
    const branchId = getActiveBranchId();
    
    const targetBranchId = (isAdmin && body.branchId) ? Number(body.branchId) : branchId;
    if (!targetBranchId) return NextResponse.json({ error: "Yêu cầu mã chi nhánh hoạt động" }, { status: 400 });

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
