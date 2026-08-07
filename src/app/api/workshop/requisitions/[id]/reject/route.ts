import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyRequisitionCountChanged } from "@/lib/requisition-events";
import { calculateSnapshotDiscount } from "@/lib/discounts";
import { requireAuth } from "@/lib/guard";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;

  const requisitionId = parseInt((await params).id);

  if (isNaN(requisitionId)) {
    return NextResponse.json({ error: "ID yêu cầu không hợp lệ" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch requisition
      const requisition = await tx.partsRequisition.findUnique({
        where: { id: requisitionId },
        include: {
          repairOrder: true,
        }
      });

      if (!requisition) {
        throw new Error("Không tìm thấy phiếu yêu cầu phụ tùng");
      }

      if (requisition.status !== "PENDING") {
        throw new Error("Phiếu yêu cầu này đã được xử lý (APPROVED hoặc REJECTED)");
      }

      // 2. Fetch items to release reservedStock
      const items = await tx.partsRequisitionItem.findMany({
        where: { requisitionId }
      });
      for (const item of items) {
        await tx.productBranch.updateMany({
          where: { productId: item.productId, branchId: requisition.branchId },
          data: { reservedStock: { decrement: item.quantity } }
        });
      }

      // 3. Update status of requisition to REJECTED
      await tx.partsRequisition.update({
        where: { id: requisitionId },
        data: { status: "REJECTED" }
      });

      if (requisition.repairOrderId) {
        // Only approved export rows are invoiceable. A rejected request must
        // remove its previously quoted parts from the repair-order total.
        const roItems = await tx.orderItem.findMany({
          where: { repairOrderId: requisition.repairOrderId },
        });
        const partsCost = roItems.reduce((sum, item) => sum + Number(item.totalPrice), 0);
        const laborCost = Number(requisition.repairOrder?.laborCost || 0);
        const redeemTx = await tx.loyaltyTransaction.findFirst({
          where: {
            relatedRoId: requisition.repairOrderId,
            type: "REDEEM",
            points: { lt: 0 },
          },
        });
        const pointsDiscount = redeemTx ? Math.abs(Number(redeemTx.points)) * 1000 : 0;
        const snapshotDiscount = requisition.repairOrder
          ? calculateSnapshotDiscount(requisition.repairOrder, {
              subtotal: laborCost + partsCost,
              serviceSubtotal: laborCost,
              partsSubtotal: partsCost,
            })
          : null;
        const discountAmount = snapshotDiscount ?? Number(requisition.repairOrder?.discountAmount || 0);
        const totalAmount = Math.max(0, laborCost + partsCost - pointsDiscount - discountAmount);
        const oldDebtAmount = Number(requisition.repairOrder?.debtAmount || 0);
        const newDebtAmount = totalAmount - Number(requisition.repairOrder?.paidAmount || 0);

        await tx.repairOrder.update({
          where: { id: requisition.repairOrderId },
          data: {
            status: "DOING", // Reset status back to doing
            partsCost,
            discountAmount,
            totalAmount,
            debtAmount: newDebtAmount,
          }
        });

        if (requisition.repairOrder?.customerId && newDebtAmount !== oldDebtAmount) {
          await tx.customer.update({
            where: { id: requisition.repairOrder.customerId },
            data: { totalDebt: { increment: newDebtAmount - oldDebtAmount } },
          });
        }
      }

      return { success: true, branchId: requisition.branchId };
    });

    notifyRequisitionCountChanged(result.branchId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Failed to reject requisition:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
