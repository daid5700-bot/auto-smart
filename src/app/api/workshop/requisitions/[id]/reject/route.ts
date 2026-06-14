import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

      // 2. Update status of requisition to REJECTED
      await tx.partsRequisition.update({
        where: { id: requisitionId },
        data: { status: "REJECTED" }
      });

      // 3. Clear OrderItems on the Repair Order (since parts request is rejected, RO no longer has parts)
      await tx.orderItem.deleteMany({
        where: { repairOrderId: requisition.repairOrderId }
      });

      await tx.repairOrder.update({
        where: { id: requisition.repairOrderId },
        data: {
          partsCost: 0,
          totalAmount: requisition.repairOrder.laborCost, // Reset total amount to just labor cost
          status: "PENDING" // Reset status back to pending
        }
      });

      return { success: true };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Failed to reject requisition:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
