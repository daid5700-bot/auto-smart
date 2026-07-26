import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";
import { verifyRole } from "@/lib/auth";
import { parseOptionalVehicleModel } from "@/lib/validation/inventory";
import { requireAuth } from "@/lib/guard";

// GET /api/inventory — list products with prices (paginated)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const scope = searchParams.get("scope") || "current";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const branchId = await getActiveBranchId();
  const userRole = await verifyRole(req.cookies.get("user_role")?.value);
  const isAdmin = userRole === "ADMIN";

  const view = searchParams.get("view");
  const isSelector = view === "selector";
  const includeMeta = searchParams.get("includeMeta") !== "false";

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
      { vehicleModel: { contains: search, mode: "insensitive" } },
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
        vehicleModel: true,
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
        vehicleModel: p.vehicleModel,
        prices: p.prices?.map((pr: any) => ({
          ...pr,
          amount: Number(pr.amount)
        })) || [],
        stockCount: pb ? Number(pb.stockCount) : 0,
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

  const summaryConditions: Prisma.Sql[] = [
    Prisma.sql`p."status" = 'ACTIVE'`,
    Prisma.sql`p."isDeleted" = false`,
  ];
  if (targetBranchId) {
    summaryConditions.push(Prisma.sql`pb."branchId" = ${targetBranchId}`);
  } else if (scope === "other" && branchId) {
    summaryConditions.push(Prisma.sql`pb."branchId" <> ${branchId}`);
  }
  if (search) {
    const pattern = `%${search}%`;
    const numericId = /^\d+$/.test(search.trim()) ? Number(search.trim()) : -1;
    summaryConditions.push(
      Prisma.sql`(
        p."name" ILIKE ${pattern}
        OR p."sku" ILIKE ${pattern}
        OR COALESCE(p."vehicleModel", '') ILIKE ${pattern}
        OR p."id" = ${numericId}
      )`,
    );
  }
  if (category) {
    summaryConditions.push(Prisma.sql`p."category" = ${category}`);
  }

  const metaPromise = includeMeta
    ? Promise.all([
        prisma.product.findMany({
          where: { status: "ACTIVE", isDeleted: false },
          select: { category: true },
          distinct: ["category"],
        }),
        prisma.product.findMany({
          where: {
            status: "ACTIVE",
            isDeleted: false,
            vehicleModel: { not: null },
          },
          select: { vehicleModel: true },
          distinct: ["vehicleModel"],
          orderBy: { vehicleModel: "asc" },
        }),
        prisma.$queryRaw<Array<{
          totalValue: number;
          totalInsuranceValue: number;
          lowStockCount: number;
          highStockCount: number;
        }>>(Prisma.sql`
          SELECT
            COALESCE(SUM(COALESCE(retail."amount", 0) * pb."stockCount"), 0)::double precision AS "totalValue",
            COALESCE(SUM(COALESCE(insurance."amount", 0) * pb."stockCount"), 0)::double precision AS "totalInsuranceValue",
            COUNT(*) FILTER (WHERE pb."stockCount" <= pb."stockMin")::integer AS "lowStockCount",
            COUNT(*) FILTER (WHERE pb."stockCount" >= pb."stockMax")::integer AS "highStockCount"
          FROM "ProductBranch" pb
          JOIN "Product" p ON p."id" = pb."productId"
          LEFT JOIN "Price" retail
            ON retail."productId" = p."id" AND retail."type" = 'RETAIL'
          LEFT JOIN "Price" insurance
            ON insurance."productId" = p."id" AND insurance."type" = 'INSURANCE'
          WHERE ${Prisma.join(summaryConditions, " AND ")}
        `),
      ])
    : Promise.resolve(null);

  const [rawProducts, total, meta] = await Promise.all([
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
    metaPromise,
  ]);

  // Map ProductBranch data to Product root level for UI backward compatibility
  const mapProduct = (p: any) => {
    const pb = p.productBranches?.[0];
    return {
      ...p,
      prices: p.prices?.map((pr: any) => ({
        ...pr,
        amount: Number(pr.amount)
      })) || [],
      stockCount: pb ? Number(pb.stockCount) : 0,
      stockMin: pb ? Number(pb.stockMin) : 0,
      stockMax: pb ? Number(pb.stockMax) : 100,
      movingAvgCost: pb ? Number(pb.movingAvgCost) : 0,
      lastImportDate: pb?.lastImportDate || null,
      branchId: pb?.branchId || null,
      branch: pb?.branch || null,
      children: p.children ? p.children.map(mapProduct) : []
    };
  };

  const products = rawProducts.map(mapProduct);
  const categories = meta?.[0];
  const vehicleModelRows = meta?.[1];
  const summary = meta?.[2]?.[0];

  // Low stock alert (using the mapped products for simplicity, in production should query DB)
  let lowStock = products.filter(p => Number(p.stockCount) <= Number(p.stockMin)).map(p => ({
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
    ...(categories
      ? { categories: categories.map((row) => row.category) }
      : {}),
    ...(vehicleModelRows
      ? {
          vehicleModels: vehicleModelRows
            .map((row) => row.vehicleModel)
            .filter((vehicleModel): vehicleModel is string => Boolean(vehicleModel)),
        }
      : {}),
    lowStock,
    totalValue,
    ...(summary ? { summary } : {}),
    totalCount: total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    limit,
  });
}

// POST /api/inventory — create product
export async function POST(req: NextRequest) {
  const guard = await requireAuth(req, ["ADMIN", "WAREHOUSE"]);
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const vehicleModel = parseOptionalVehicleModel(body.vehicleModel);
    const branchId = await getActiveBranchId();

    const targetBranchId = branchId;
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
        vehicleModel,
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
      prices: product.prices?.map((pr: any) => ({
        ...pr,
        amount: Number(pr.amount)
      })) || [],
      stockCount: Number(product.productBranches[0].stockCount),
      stockMin: Number(product.productBranches[0].stockMin),
      stockMax: Number(product.productBranches[0].stockMax),
      branchId: product.productBranches[0].branchId
    };

    return NextResponse.json(mappedProduct, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
