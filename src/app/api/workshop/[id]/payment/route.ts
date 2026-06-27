import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const { amount } = await req.json();
    
    const targetPaidAmount = Number(amount);
    if (isNaN(targetPaidAmount) || targetPaidAmount < 0) {
      return NextResponse.json({ error: "Số tiền không hợp lệ" }, { status: 400 });
    }

    const ro = await prisma.repairOrder.findUnique({
      where: { id },
      include: { customer: true }
    });

    if (!ro) return NextResponse.json({ error: "Không tìm thấy lệnh sửa chữa" }, { status: 404 });

    const totalAmount = ro.totalAmount.toNumber();
    const newPaidAmount = Math.min(targetPaidAmount, totalAmount);
    const newDebtAmount = totalAmount - newPaidAmount;

    // Delta debt to adjust customer's totalDebt
    const oldDebtAmount = ro.debtAmount.toNumber();
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

      const oldPaidAmount = ro.paidAmount.toNumber();
      const diffPaid = newPaidAmount - oldPaidAmount;
      
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
            createdBy: "system"
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

    return NextResponse.json(updatedRo);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
