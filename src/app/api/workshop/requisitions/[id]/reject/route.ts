import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyRequisitionCountChanged } from "@/lib/requisition-events";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const requisitionId = parseInt(params.id);

  if (isNaN(requisitionId)) {
    return NextResponse.json({ error: "ID yêu cầu không hợp lệ" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch requisition
      const requisition = await tx.partsRequisition.findUnique({
        where: { id: requisitionId },
        include: {
          repairOrder: true
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
        await tx.productBranch.update({
          where: { productId_branchId: { productId: item.productId, branchId: requisition.branchId } },
          data: { reservedStock: { decrement: item.quantity } }
        });
      }

      // 3. Update status of requisition to REJECTED
      await tx.partsRequisition.update({
        where: { id: requisitionId },
        data: { status: "REJECTED" }
      });

      // 3. Clear OrderItems on the Repair Order (since parts request is rejected, RO no longer has parts)
      await tx.orderItem.deleteMany({
        where: { repairOrderId: requisition.repairOrderId }
      });

      const redeemTx = await tx.loyaltyTransaction.findFirst({
        where: {
          relatedRoId: requisition.repairOrderId,
          type: "REDEEM",
          points: { lt: 0 },
        },
      });
      const discount = redeemTx ? Math.abs(Number(redeemTx.points)) * 1000 : 0;
      const finalTotalAmount = Math.max(0, Number(requisition.repairOrder.laborCost) - discount);

      await tx.repairOrder.update({
        where: { id: requisition.repairOrderId },
        data: {
          partsCost: 0,
          totalAmount: finalTotalAmount, // Reset total amount with discount applied
          status: "DOING" // Reset status back to doing
        }
      });

      return { success: true, branchId: requisition.branchId };
    });

    notifyRequisitionCountChanged(result.branchId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Failed to reject requisition:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
