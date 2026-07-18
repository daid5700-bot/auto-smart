import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/guard";
import { getActiveBranchId } from "@/lib/branch";
import { ApiError, handleApiError, parseJson } from "@/lib/api-response";
import { paymentSchema } from "@/lib/validation/payment";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAuth(req, ["ADMIN", "WORKSHOP"]);
  if (!guard.ok) return guard.response;

  try {
    const id = parseInt(params.id);
    if (!Number.isInteger(id) || id <= 0) throw new ApiError("ID không hợp lệ", 400, "INVALID_ID");
    const { amount: paymentDelta } = await parseJson(req, paymentSchema);
    const branchId = getActiveBranchId();

    const ro = await prisma.repairOrder.findFirst({
      where: { id, ...(branchId ? { branchId } : {}) },
      include: { customer: true }
    });

    if (!ro) throw new ApiError("Không tìm thấy lệnh sửa chữa tại chi nhánh này", 404, "REPAIR_ORDER_NOT_FOUND");

    const oldPaidAmount = ro.paidAmount.toNumber();
    const oldDebtAmount = ro.debtAmount.toNumber();
    const actualPaymentDelta = Math.min(paymentDelta, oldDebtAmount);
    const newPaidAmount = oldPaidAmount + actualPaymentDelta;
    const newDebtAmount = oldDebtAmount - actualPaymentDelta;
    const diffPaid = actualPaymentDelta;
    const debtDelta = newDebtAmount - oldDebtAmount;

    const updatedRo = await prisma.$transaction(async (tx) => {
      // update repair order
      const updated = await tx.repairOrder.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          debtAmount: newDebtAmount,
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
            referenceId: ro.id,
            referenceType: "REPAIR_ORDER",
            note: pType === "INCOME" ? `Thu tiền lệnh sửa chữa RO-${ro.id}` : `Hoàn tiền lệnh sửa chữa RO-${ro.id}`,
            branchId: ro.branchId,
            createdBy: String(guard.userId)
          }
        });
      }

      // update customer debt & spent
      if (ro.customerId) {
        const isCompleted = ["DONE", "DELIVERED"].includes(ro.status);
        await tx.customer.update({
          where: { id: ro.customerId },
          data: {
            totalDebt: { increment: debtDelta },
            ...(isCompleted && diffPaid > 0 ? { totalSpent: { increment: diffPaid } } : {})
          }
        });
      }

      return updated;
    });

    const serializedRo = {
      ...updatedRo,
      laborCost: Number(updatedRo.laborCost),
      partsCost: Number(updatedRo.partsCost),
      totalAmount: Number(updatedRo.totalAmount),
      paidAmount: Number(updatedRo.paidAmount),
      debtAmount: Number(updatedRo.debtAmount),
    };

    return NextResponse.json(serializedRo);
  } catch (error) {
    return handleApiError(error, "WORKSHOP_PAYMENT", "Không thể ghi nhận thanh toán");
  }
}
