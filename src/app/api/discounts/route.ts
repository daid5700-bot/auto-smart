export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";
import { requireAuth } from "@/lib/guard";
import { ApiError, handleApiError, parseJson } from "@/lib/api-response";
import { discountInputSchema, discountQuerySchema } from "@/lib/validation/discount";

function canManageScope(role: string, scope: "SALES" | "WORKSHOP") {
  return role === "ADMIN" || (scope === "SALES" ? role === "SALES" : role === "WORKSHOP");
}

function serializeDiscount(discount: any) {
  return {
    ...discount,
    value: Number(discount.value || 0),
    maxDiscountAmount: discount.maxDiscountAmount == null ? null : Number(discount.maxDiscountAmount),
    minOrderAmount: Number(discount.minOrderAmount || 0),
  };
}

function parseDiscountDate(value: string | null | undefined, endOfDay = false) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(
      `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+07:00`,
    );
  }
  return new Date(value);
}

// GET /api/discounts — list branch-scoped discount codes.
export async function GET(req: NextRequest) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;

  try {
    const query = discountQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const branchId = await getActiveBranchId();
    if (!branchId) throw new ApiError("Không xác định được cơ sở hiện tại.", 400, "BRANCH_REQUIRED");
    if (!canManageScope(guard.role, query.scope)) {
      throw new ApiError(
        "Bạn không có quyền xem mã giảm giá của bộ phận này.",
        403,
        "DISCOUNT_FORBIDDEN",
      );
    }

    const now = new Date();
    const where: any = {
      branchId,
      scope: query.scope,
      ...(query.search ? {
        OR: [
          { code: { contains: query.search, mode: "insensitive" } },
          { name: { contains: query.search, mode: "insensitive" } },
        ],
      } : {}),
    };
    if (query.activeOnly) {
      where.isActive = true;
      where.AND = [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        {
          OR: [
            { usageLimit: null },
            { usedCount: { lt: prisma.discountCode.fields.usageLimit } },
          ],
        },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const [rows, total] = await Promise.all([
      prisma.discountCode.findMany({
        where,
        orderBy: query.activeOnly
          ? [{ createdAt: "desc" }]
          : [{ isActive: "desc" }, { createdAt: "desc" }],
        skip,
        take: query.limit,
      }),
      prisma.discountCode.count({ where }),
    ]);
    const discounts = rows.map(serializeDiscount);

    return NextResponse.json({
      discounts,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    });
  } catch (error) {
    return handleApiError(error, "DISCOUNT_LIST", "Không thể tải danh sách mã giảm giá");
  }
}

// POST /api/discounts — create a code for the active branch.
export async function POST(req: NextRequest) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;

  try {
    const body = await parseJson(req, discountInputSchema);
    if (!canManageScope(guard.role, body.scope)) {
      throw new ApiError("Bạn không có quyền tạo mã giảm giá của bộ phận này.", 403, "DISCOUNT_FORBIDDEN");
    }
    const branchId = await getActiveBranchId();
    if (!branchId) throw new ApiError("Không xác định được cơ sở hiện tại.", 400, "BRANCH_REQUIRED");

    const existing = await prisma.discountCode.findUnique({
      where: { branchId_code_scope: { branchId, code: body.code, scope: body.scope } },
    });
    if (existing) {
      throw new ApiError(`Mã ${body.code} đã tồn tại tại cơ sở này.`, 409, "DISCOUNT_CODE_EXISTS");
    }

    const discount = await prisma.discountCode.create({
      data: {
        ...body,
        target: body.scope === "SALES" ? "ORDER" : body.target,
        // Persist caps only for percentage discounts. This also cleans up the
        // legacy value 0, whose intended meaning is "unlimited".
        maxDiscountAmount:
          body.discountType === "PERCENTAGE" && Number(body.maxDiscountAmount) > 0
            ? body.maxDiscountAmount
            : null,
        usageLimit: body.usageLimit === "" ? null : body.usageLimit,
        startsAt: parseDiscountDate(body.startsAt),
        endsAt: parseDiscountDate(body.endsAt, true),
        branchId,
      },
    });
    return NextResponse.json(serializeDiscount(discount), { status: 201 });
  } catch (error) {
    return handleApiError(error, "DISCOUNT_CREATE", "Không thể tạo mã giảm giá");
  }
}
