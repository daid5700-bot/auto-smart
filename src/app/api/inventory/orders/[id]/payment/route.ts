import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const { paidAmount } = await req.json(); // Exact new paid amount
    
    if (paidAmount === undefined || paidAmount < 0) {
      return NextResponse.json({ error: "Số tiền đã trả không hợp lệ" }, { status: 400 });
    }

    const order = await prisma.inventoryOrder.findUnique({
      where: { id },
      include: { customer: true }
    });

    if (!order) return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
    
    const actualPaid = Math.min(Number(paidAmount), order.totalAmount.toNumber());
    const newDebtAmount = order.totalAmount.toNumber() - actualPaid;
    const newStatus = newDebtAmount <= 0 ? "PAID" : "DEBT";
    
    // Calculate difference to update customer's total debt correctly
    const oldDebtAmount = order.debtAmount.toNumber();
    const debtDelta = newDebtAmount - oldDebtAmount; // If new debt is less, delta is negative

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // update order
      const o = await tx.inventoryOrder.update({
        where: { id },
        data: {
          paidAmount: actualPaid,
          debtAmount: newDebtAmount,
          status: newStatus
        }
      });

      const oldPaidAmount = order.paidAmount.toNumber();
      const diffPaid = actualPaid - oldPaidAmount;
      
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

      // update customer debt
      if (order.customerId && debtDelta !== 0) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: {
            totalDebt: { increment: debtDelta }
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
