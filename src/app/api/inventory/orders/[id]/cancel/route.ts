import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/guard";
import { getActiveBranchId } from "@/lib/branch";
import { ApiError, handleApiError, parseJson } from "@/lib/api-response";
import { cancelInventoryOrderSchema } from "@/lib/validation/inventory";
import { cancelInventoryOrder } from "@/lib/inventory-order-cancellation";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAuth(req, ["ADMIN", "WAREHOUSE"]);
  if (!guard.ok) return guard.response;
  try {
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) throw new ApiError("ID phiếu không hợp lệ.");
    const branchId = await getActiveBranchId();
    if (!branchId) throw new ApiError("Vui lòng chọn chi nhánh hiện tại.", 400, "BRANCH_REQUIRED");
    const body = await parseJson(req, cancelInventoryOrderSchema);
    const user = await prisma.user.findUnique({ where: { id: guard.userId }, select: { name: true } });
    const result = await prisma.$transaction((tx) => cancelInventoryOrder(tx, {
      ...body, refundConfirmed: body.refundConfirmed ?? false, refundMethod: body.refundMethod ?? "CASH",
      id, branchId, createdBy: user?.name || String(guard.userId),
    }), { timeout: 30_000 });
    return NextResponse.json({
      ...result,
      message: result.alreadyCancelled ? "Phiếu đã được hủy trước đó." : "Đã hủy phiếu và hoàn lại tồn kho.",
    });
  } catch (error) {
    return handleApiError(error, "INVENTORY_ORDER_CANCEL", "Không thể hủy phiếu xuất kho.");
  }
}
