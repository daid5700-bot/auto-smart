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

  if (branchFilter) {
    if (branchFilter !== "all") {
      where.branchId = Number(branchFilter);
    }
  } else {
    // If no branchFilter is specified, filter based on active branch context
    if (scope === "current" && branchId) {
      where.branchId = branchId;
    } else if (scope === "other" && branchId) {
      where.branchId = { not: branchId };
    } else if (branchId) {
      // Default to active branch if no branchFilter or scope is provided
      where.branchId = branchId;
    }
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
  }
  if (category) where.category = category;

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { prices: true, branch: true, children: { include: { prices: true, branch: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
    prisma.product.findMany({ select: { category: true }, distinct: ["category"] }),
  ]);

  // Low stock alert
  let lowStock: any[] = [];
  if (isAdmin) {
    const branchFilter = searchParams.get("branchFilter");
    if (branchFilter && branchFilter !== "all") {
      const bId = Number(branchFilter);
      lowStock = await prisma.$queryRaw<Array<{id: number, name: string, stockCount: number, stockMin: number}>>`
        SELECT id, name, "stockCount", "stockMin" FROM "Product" WHERE "stockCount" <= "stockMin" AND status = 'ACTIVE' AND "branchId" = ${bId}
      `;
    } else {
      lowStock = await prisma.$queryRaw<Array<{id: number, name: string, stockCount: number, stockMin: number}>>`
        SELECT id, name, "stockCount", "stockMin" FROM "Product" WHERE "stockCount" <= "stockMin" AND status = 'ACTIVE'
      `;
    }
  } else {
    if (branchId && scope === "current") {
      lowStock = await prisma.$queryRaw<Array<{id: number, name: string, stockCount: number, stockMin: number}>>`
        SELECT id, name, "stockCount", "stockMin" FROM "Product" WHERE "stockCount" <= "stockMin" AND status = 'ACTIVE' AND "branchId" = ${branchId}
      `;
    } else if (branchId && scope === "other") {
      lowStock = await prisma.$queryRaw<Array<{id: number, name: string, stockCount: number, stockMin: number}>>`
        SELECT id, name, "stockCount", "stockMin" FROM "Product" WHERE "stockCount" <= "stockMin" AND status = 'ACTIVE' AND "branchId" != ${branchId}
      `;
    } else {
      lowStock = await prisma.$queryRaw<Array<{id: number, name: string, stockCount: number, stockMin: number}>>`
        SELECT id, name, "stockCount", "stockMin" FROM "Product" WHERE "stockCount" <= "stockMin" AND status = 'ACTIVE'
      `;
    }
  }

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
        stockCount: body.stockCount || 0,
        stockMin: body.stockMin || 0,
        stockMax: body.stockMax || 100,
        branchId: targetBranchId,
        prices: {
          create: body.prices || [],
        },
      },
      include: { prices: true },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
