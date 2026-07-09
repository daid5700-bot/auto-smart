import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const { amount } = await req.json();
    
    if (amount === undefined || Number(amount) < 0) {
      return NextResponse.json({ error: "Số tiền thanh toán không hợp lệ" }, { status: 400 });
    }

    const order = await prisma.inventoryOrder.findUnique({
      where: { id },
      include: { customer: true }
    });

    if (!order) return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
    
    const paymentDelta = Number(amount);
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
            createdBy: "system"
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

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
