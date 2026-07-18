import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/guard";
import { getActiveBranchId } from "@/lib/branch";
import { ApiError, handleApiError, parseJson } from "@/lib/api-response";
import { paymentSchema } from "@/lib/validation/payment";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAuth(req, ["ADMIN", "WAREHOUSE"]);
  if (!guard.ok) return guard.response;

  try {
    const id = parseInt(params.id);
    if (!Number.isInteger(id) || id <= 0) throw new ApiError("ID không hợp lệ", 400, "INVALID_ID");
    const { amount: paymentDelta } = await parseJson(req, paymentSchema);
    const branchId = getActiveBranchId();

    const order = await prisma.inventoryOrder.findFirst({
      where: { id, ...(branchId ? { branchId } : {}) },
      include: { customer: true }
    });

    if (!order) throw new ApiError("Không tìm thấy đơn hàng tại chi nhánh này", 404, "ORDER_NOT_FOUND");
    
    const oldPaidAmount = order.paidAmount.toNumber();
    const oldDebtAmount = order.debtAmount.toNumber();
    const actualPaymentDelta = Math.min(paymentDelta, oldDebtAmount);
    const newPaidAmount = oldPaidAmount + actualPaymentDelta;
    const newDebtAmount = oldDebtAmount - actualPaymentDelta;
    const newStatus = newDebtAmount <= 0 ? "PAID" : "DEBT";
    const diffPaid = actualPaymentDelta;
    const debtDelta = newDebtAmount - oldDebtAmount;

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // update order
      const o = await tx.inventoryOrder.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          debtAmount: newDebtAmount,
          status: newStatus
        }
      });
      
      if (diffPaid !== 0) {
        const pType = diffPaid > 0 ? "INCOME" : "EXPENSE";
        const txAmount = Math.abs(diffPaid);
        await tx.paymentTransaction.create({
          data: {
            code: `PT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            amount: txAmount,
            method: "CASH", 
            type: pType,
            referenceId: order.id,
            referenceType: "INVENTORY_ORDER",
            note: pType === "INCOME" ? `Thu tiền đơn hàng kho ${order.code}` : `Hoàn tiền đơn hàng kho ${order.code}`,
            branchId: order.branchId,
            createdBy: String(guard.userId)
          }
        });
      }

      // update customer debt & spent
      if (order.customerId) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: {
            totalDebt: { increment: debtDelta },
            ...(diffPaid > 0 ? { totalSpent: { increment: diffPaid } } : {})
          }
        });
      }

      return o;
    });

    const serializedOrder = {
      ...updatedOrder,
      totalAmount: Number(updatedOrder.totalAmount),
      paidAmount: Number(updatedOrder.paidAmount),
      debtAmount: Number(updatedOrder.debtAmount)
    };

    return NextResponse.json(serializedOrder);
  } catch (error) {
    return handleApiError(error, "INVENTORY_PAYMENT", "Không thể ghi nhận thanh toán");
  }
}
