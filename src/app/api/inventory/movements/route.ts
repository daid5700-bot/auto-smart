export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const type = searchParams.get("type") || undefined;
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const branchId = getActiveBranchId();

    const where: any = {};
    if (type) {
      if (type === "EXPORT") {
        where.type = { in: ["EXPORT", "EXPORT_GIFT"] };
      } else {
        where.type = type;
      }
    }
    if (branchId) {
      where.branchId = branchId;
    }

    if (search) {
      where.OR = [
        { reason: { contains: search, mode: "insensitive" } },
        { createdBy: { contains: search, mode: "insensitive" } },
        { inventoryOrder: { customer: { name: { contains: search, mode: "insensitive" } } } },
        { inventoryOrder: { customer: { phone: { contains: search } } } },
        { inventoryOrder: { code: { contains: search, mode: "insensitive" } } }
      ];
      if (/^\d+$/.test(search.trim())) {
        const numId = parseInt(search.trim(), 10);
        where.OR.push(
          { id: numId },
          { inventoryOrderId: numId }
        );
      }
    }

    // Base filter for tab counts (branch + search, no type filter)
    const branchFilter = branchId ? { branchId } : {};
    const searchFilter = search && where.OR ? { OR: where.OR } : {};
    const baseFilter = { ...branchFilter, ...searchFilter };

    const [total, totalAll, totalImport, totalExport, movements] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.count({ where: baseFilter }),
      prisma.stockMovement.count({ where: { ...baseFilter, type: "IMPORT" } }),
      prisma.stockMovement.count({ where: { ...baseFilter, type: { in: ["EXPORT", "EXPORT_GIFT"] } } }),
      prisma.stockMovement.findMany({
        where,
        select: {
          id: true,
          type: true,
          quantity: true,
          unitCost: true,
          totalCost: true,
          reason: true,
          vehicleId: true,
          createdBy: true,
          createdAt: true,
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              unit: true,
            }
          },
          inventoryOrder: {
            select: {
              id: true,
              code: true,
              totalAmount: true,
              paidAmount: true,
              debtAmount: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip: limit > 0 ? (page - 1) * limit : undefined,
        take: limit > 0 ? limit : undefined,
      })
    ]);

    return NextResponse.json({
      movements,
      pagination: {
        total,
        page,
        limit,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 1
      },
      counts: {
        all: totalAll,
        import: totalImport,
        export: totalExport,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
