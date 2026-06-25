import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const requisitionId = parseInt(params.id);

  if (isNaN(requisitionId)) {
    return NextResponse.json({ error: "ID yêu cầu không hợp lệ" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch requisition with items and repair order
      const requisition = await tx.partsRequisition.findUnique({
        where: { id: requisitionId },
        include: {
          items: {
            include: {
              product: {
                include: { prices: true }
              }
            }
          },
          repairOrder: true
        }
      });

      if (!requisition) {
        throw new Error("Không tìm thấy phiếu yêu cầu phụ tùng");
      }

      if (requisition.status !== "PENDING") {
        throw new Error("Phiếu yêu cầu này đã được xử lý (APPROVED hoặc REJECTED)");
      }

      // 2. Process stock deduction and stock movement for each item
      for (const item of requisition.items) {
        const product = item.product;
        const productBranch = await tx.productBranch.findUnique({
          where: { productId_branchId: { productId: product.id, branchId: requisition.branchId } },
          include: { product: true }
        });

        if (!productBranch) {
          throw new Error(`Phụ tùng [${product.sku}] ${product.name} chưa cấu hình kho cho chi nhánh.`);
        }

        if ((productBranch.stockCount) < item.quantity) {
          throw new Error(`Phụ tùng [${product.sku}] ${product.name} không đủ tồn kho (Cần ${item.quantity}, hiện có ${productBranch.stockCount})`);
        }

        // Decrement product stock AND decrement the reservedStock since it's now fulfilled
        await tx.productBranch.update({
          where: { id: productBranch.id },
          data: { 
            stockCount: { decrement: item.quantity },
            reservedStock: { decrement: item.quantity }
          }
        });

        const retailPrice = Number(product.prices?.find((p: any) => p.type === "RETAIL")?.amount || 0);

        // Create StockMovement (EXPORT)
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: "EXPORT",
            quantity: item.quantity,
            unitCost: retailPrice,
            totalCost: retailPrice * item.quantity,
            reason: `Xuất kho duyệt phụ tùng cho RO #${requisition.repairOrderId}`,
            relatedRoId: requisition.repairOrderId,
            createdBy: "Thủ kho",
          }
        });
      }

      // 3. Update requisition status to APPROVED
      await tx.partsRequisition.update({
        where: { id: requisitionId },
        data: { status: "APPROVED" }
      });

      // 4. Transition Repair Order status:
      // If technician is assigned -> "DOING" (Đang sửa chữa), otherwise "PENDING" (Chờ sửa)
      const roStatus = requisition.repairOrder.technicianId ? "DOING" : "PENDING";
      await tx.repairOrder.update({
        where: { id: requisition.repairOrderId },
        data: { status: roStatus }
      });

      return { success: true };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Failed to approve requisition:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
