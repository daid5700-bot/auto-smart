import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api-response";
import { aggregateReturnItems } from "@/lib/inventory-cancellation";
import { canCancelInventoryOrder, isManualInventoryOrder } from "@/lib/inventory-order";

/** Caller must run this inside a transaction. All stock/financial changes roll back together. */
export async function cancelInventoryOrder(
  tx: Prisma.TransactionClient,
  input: {
    id: number;
    branchId: number;
    reason: string;
    createdBy: string;
    refundConfirmed: boolean;
    expectedPaidAmount: number;
    refundMethod: "CASH" | "BANK_TRANSFER";
  },
) {
  const locked = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
    SELECT "id" FROM "InventoryOrder"
    WHERE "id" = ${input.id} AND "branchId" = ${input.branchId}
    FOR UPDATE
  `);
  if (!locked.length) throw new ApiError("Không tìm thấy phiếu tại chi nhánh này.", 404, "ORDER_NOT_FOUND");

  const order = await tx.inventoryOrder.findUnique({
    where: { id: input.id },
    include: { movements: { where: { type: "EXPORT" } } },
  });
  if (!order) throw new ApiError("Không tìm thấy phiếu xuất kho.", 404, "ORDER_NOT_FOUND");
  if (!isManualInventoryOrder(order)) {
    throw new ApiError("Phiếu tự sinh phải được hủy tại hồ sơ bán xe hoặc lệnh sửa chữa nguồn.", 409, "SYSTEM_ORDER_NOT_CANCELLABLE");
  }
  // Holding the same row lock used by edit/payment prevents double returns and refunds.
  if (order.status === "CANCELLED") return { alreadyCancelled: true, refundedAmount: 0 };
  if (!canCancelInventoryOrder(order)) {
    throw new ApiError("Chỉ được hủy phiếu đã xuất kho.", 409, "ORDER_NOT_EXPORTED");
  }

  const paidAmount = Number(order.paidAmount);
  if (paidAmount !== input.expectedPaidAmount) {
    throw new ApiError("Số tiền đã thu vừa thay đổi. Vui lòng tải lại phiếu và xác nhận số tiền hoàn mới.", 409, "PAYMENT_CHANGED");
  }
  if (paidAmount > 0 && !input.refundConfirmed) {
    throw new ApiError("Vui lòng xác nhận đã hoàn lại tiền đã thu cho khách trước khi hủy phiếu.", 400, "REFUND_CONFIRMATION_REQUIRED");
  }

  if (!order.movements.length || order.movements.some((movement) =>
    movement.branchId !== input.branchId || !Number.isFinite(Number(movement.quantity)) || Number(movement.quantity) <= 0
  )) {
    throw new ApiError("Dữ liệu xuất kho không đầy đủ hoặc sai chi nhánh. Không thể tự động hoàn kho.", 409, "INVALID_EXPORT_MOVEMENTS");
  }
  const items = aggregateReturnItems(order.movements.map((movement) => ({
    productId: movement.productId,
    quantity: Number(movement.quantity),
  }))).sort((a, b) => a.productId - b.productId);
  if (!items.length) throw new ApiError("Phiếu không có số lượng hợp lệ để hoàn kho.", 409, "INVALID_EXPORT_MOVEMENTS");

  const stockRows = await tx.$queryRaw<Array<{ productId: number; movingAvgCost: Prisma.Decimal }>>(Prisma.sql`
    SELECT "productId", "movingAvgCost" FROM "ProductBranch"
    WHERE "branchId" = ${input.branchId} AND "productId" IN (${Prisma.join(items.map((item) => item.productId))})
    ORDER BY "id" FOR UPDATE
  `);
  if (stockRows.length !== items.length) {
    throw new ApiError("Có phụ tùng chưa được cấu hình tại chi nhánh này. Không thể hoàn kho.", 409, "PRODUCT_BRANCH_MISSING");
  }
  const costByProduct = new Map(stockRows.map((row) => [row.productId, Number(row.movingAvgCost)]));
  const returnReason = `Hoàn kho do hủy phiếu ${order.code}: ${input.reason}`;
  for (const item of items) {
    await tx.productBranch.update({
      where: { productId_branchId: { productId: item.productId, branchId: input.branchId } },
      data: { stockCount: { increment: item.quantity } },
    });
    // Export vouchers store the selling price as unitCost. Never use it as return cost.
    // Keep current moving-average cost unchanged, just as a quantity-only edit does.
    const unitCost = costByProduct.get(item.productId) || 0;
    await tx.stockMovement.create({
      data: {
        inventoryOrderId: order.id,
        productId: item.productId,
        branchId: input.branchId,
        type: "IMPORT",
        quantity: item.quantity,
        unitCost,
        totalCost: unitCost * item.quantity,
        reason: returnReason,
        createdBy: input.createdBy,
      },
    });
  }

  if (order.customerId) {
    await tx.customer.update({
      where: { id: order.customerId },
      data: {
        totalDebt: { decrement: order.debtAmount },
        totalSpent: { decrement: paidAmount },
      },
    });
  }
  if (paidAmount > 0) {
    await tx.paymentTransaction.create({
      data: {
        code: `HT-${crypto.randomUUID()}`,
        amount: paidAmount,
        method: input.refundMethod,
        type: "EXPENSE",
        referenceId: order.id,
        referenceType: "INVENTORY_ORDER",
        note: `Hoàn tiền do hủy phiếu ${order.code}: ${input.reason}`,
        branchId: input.branchId,
        createdBy: input.createdBy,
      },
    });
  }
  await tx.inventoryOrder.update({
    where: { id: order.id },
    data: {
      status: "CANCELLED",
      debtAmount: 0,
      // Preserve the original totals/receipts for auditing; cancelled orders are excluded from totals.
      reason: [order.reason, `[Đã hủy ${new Date().toISOString()} bởi ${input.createdBy}] ${input.reason}`].filter(Boolean).join(" | "),
    },
  });
  return { alreadyCancelled: false, refundedAmount: paidAmount };
}
