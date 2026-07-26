export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";
import { requireAuth } from "@/lib/guard";
import { ApiError, handleApiError, parseJson } from "@/lib/api-response";
import { discountInputSchema, discountUpdateSchema } from "@/lib/validation/discount";

function canManageScope(role: string, scope: string) {
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

function parseDiscountDate(value: string, endOfDay = false) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(
      `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+07:00`,
    );
  }
  return new Date(value);
}

async function getManagedDiscount(req: NextRequest, id: number) {
  const guard = await requireAuth(req);
  if (!guard.ok) return { response: guard.response } as const;
  const branchId = await getActiveBranchId();
  if (!branchId) {
    return { response: NextResponse.json({ error: "Không xác định được cơ sở hiện tại." }, { status: 400 }) } as const;
  }
  const discount = await prisma.discountCode.findFirst({ where: { id, branchId } });
  if (!discount) {
    return { response: NextResponse.json({ error: "Mã giảm giá không tồn tại tại cơ sở này." }, { status: 404 }) } as const;
  }
  if (!canManageScope(guard.role, discount.scope)) {
    return { response: NextResponse.json({ error: "Bạn không có quyền quản lý mã giảm giá này." }, { status: 403 }) } as const;
  }
  return { guard, discount, branchId } as const;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) throw new ApiError("ID không hợp lệ.", 400);
    const managed = await getManagedDiscount(req, id);
    if ("response" in managed) return managed.response;

    const body = await parseJson(req, discountUpdateSchema);
    const nextData = discountInputSchema.parse({
      code: body.code ?? managed.discount.code,
      name: body.name ?? managed.discount.name,
      scope: body.scope ?? managed.discount.scope,
      discountType: body.discountType ?? managed.discount.discountType,
      target: body.target ?? managed.discount.target,
      value: body.value ?? Number(managed.discount.value),
      maxDiscountAmount:
        body.maxDiscountAmount === undefined
          ? managed.discount.maxDiscountAmount === null
            ? null
            : Number(managed.discount.maxDiscountAmount)
          : body.maxDiscountAmount,
      minOrderAmount: body.minOrderAmount ?? Number(managed.discount.minOrderAmount),
      usageLimit: body.usageLimit === undefined ? managed.discount.usageLimit : body.usageLimit,
      startsAt:
        body.startsAt === undefined
          ? managed.discount.startsAt?.toISOString() ?? null
          : body.startsAt,
      endsAt:
        body.endsAt === undefined
          ? managed.discount.endsAt?.toISOString() ?? null
          : body.endsAt,
      isActive: body.isActive ?? managed.discount.isActive,
    });
    const nextScope = nextData.scope;
    if (nextScope !== managed.discount.scope) {
      throw new ApiError("Không thể đổi bộ phận của mã đã tạo.", 400, "DISCOUNT_SCOPE_IMMUTABLE");
    }
    const nextCode = nextData.code;
    if (nextCode !== managed.discount.code) {
      const duplicate = await prisma.discountCode.findUnique({
        where: {
          branchId_code_scope: {
            branchId: managed.branchId,
            code: nextCode,
            scope: managed.discount.scope,
          },
        },
      });
      if (duplicate && duplicate.id !== id) {
        throw new ApiError(`Mã ${nextCode} đã tồn tại tại cơ sở này.`, 409, "DISCOUNT_CODE_EXISTS");
      }
    }

    const discount = await prisma.discountCode.update({
      where: { id },
      data: {
        code: nextData.code,
        name: nextData.name,
        discountType: nextData.discountType,
        target: managed.discount.scope === "SALES" ? "ORDER" : nextData.target,
        value: nextData.value,
        maxDiscountAmount:
          nextData.maxDiscountAmount === "" ? null : nextData.maxDiscountAmount,
        minOrderAmount: nextData.minOrderAmount,
        usageLimit: nextData.usageLimit === "" ? null : nextData.usageLimit,
        startsAt:
          !nextData.startsAt ? null : parseDiscountDate(nextData.startsAt),
        endsAt:
          !nextData.endsAt ? null : parseDiscountDate(nextData.endsAt, true),
        isActive: nextData.isActive,
      },
    });
    return NextResponse.json(serializeDiscount(discount));
  } catch (error) {
    return handleApiError(error, "DISCOUNT_UPDATE", "Không thể cập nhật mã giảm giá");
  }
}

// Historical records keep snapshots, so deleting a code means disabling it.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) throw new ApiError("ID không hợp lệ.", 400);
    const managed = await getManagedDiscount(req, id);
    if ("response" in managed) return managed.response;

    const discount = await prisma.discountCode.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true, discount: serializeDiscount(discount) });
  } catch (error) {
    return handleApiError(error, "DISCOUNT_DISABLE", "Không thể khóa mã giảm giá");
  }
}
