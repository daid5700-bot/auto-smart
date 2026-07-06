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

      // 1.5. Parse metadata from reason to get pricing details
      let itemsMeta: any[] = [];
      let userReason = requisition.reason || "";
      if (requisition.reason && requisition.reason.includes(" | METADATA:")) {
        const parts = requisition.reason.split(" | METADATA:");
        userReason = parts[0];
        try {
          itemsMeta = JSON.parse(parts[1]);
        } catch (e) {
          console.error("Failed to parse items metadata from reason:", e);
        }
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

        // Obtain write lock on the product branch row
        const lockedRows: any[] = await tx.$queryRaw`
          SELECT id, "stockCount", "reservedStock", "movingAvgCost" FROM "ProductBranch"
          WHERE id = ${productBranch.id} FOR UPDATE
        `;
        const freshPb = lockedRows[0];
        const currentStock = Number(freshPb?.stockCount || 0);
        const currentReserved = Number(freshPb?.reservedStock || 0);
        const currentMac = Number(freshPb?.movingAvgCost || 0);

        if (currentStock < item.quantity) {
          throw new Error(`Phụ tùng [${product.sku}] ${product.name} không đủ tồn kho (Cần ${item.quantity}, hiện có ${currentStock})`);
        }

        // Decrement product stock AND decrement the reservedStock since it's now fulfilled
        // Use Math.max guard to prevent reservedStock going negative due to data inconsistency
        const safeReservedDecrement = Math.min(item.quantity, currentReserved);
        await tx.productBranch.update({
          where: { id: productBranch.id },
          data: { 
            stockCount: { decrement: item.quantity },
            reservedStock: { decrement: safeReservedDecrement }
          }
        });

        // Tìm metadata của item này để lấy giá đã chọn ở xưởng
        const meta = itemsMeta.find((m: any) => m.productId === product.id);
        const priceType = meta?.priceType || "RETAIL";
        const customUnitPrice = meta?.customUnitPrice;

        let unitPrice = 0;
        if (customUnitPrice !== undefined && customUnitPrice !== null && customUnitPrice > 0) {
          unitPrice = customUnitPrice;
        } else {
          const selectedPrice = product.prices?.find((p: any) => p.type === priceType);
          unitPrice = selectedPrice ? Number(selectedPrice.amount) : Number(product.prices?.find((p: any) => p.type === "RETAIL")?.amount || 0);
        }
        const totalPrice = unitPrice * item.quantity;

        // Create OrderItem (để chính thức ghi nhận vào hóa đơn xe của khách)
        await tx.orderItem.create({
          data: {
            repairOrderId: requisition.repairOrderId,
            productId: product.id,
            quantity: item.quantity,
            unitPrice,
            totalPrice,
          }
        });

        // Create StockMovement (EXPORT)
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: "EXPORT",
            quantity: item.quantity,
            unitCost: currentMac || unitPrice,
            totalCost: (currentMac || unitPrice) * item.quantity,
            reason: `Xuất kho duyệt phụ tùng cho RO #${requisition.repairOrderId}`,
            relatedRoId: requisition.repairOrderId,
            createdBy: "Thủ kho",
          }
        });
      }

      // 3. Update requisition status to APPROVED and clean the reason
      await tx.partsRequisition.update({
        where: { id: requisitionId },
        data: { 
          status: "APPROVED",
          reason: userReason
        }
      });

      // 4. Recalculate bill for the RepairOrder and Transition status to DOING
      const roItems = await tx.orderItem.findMany({
        where: { repairOrderId: requisition.repairOrderId },
      });
      const partsCost = roItems.reduce((acc, curr) => acc + Number(curr.totalPrice), 0);
      const laborCost = Number(requisition.repairOrder.laborCost);
      const totalAmount = partsCost + laborCost;

      const roStatus = "DOING";
      await tx.repairOrder.update({
        where: { id: requisition.repairOrderId },
        data: { 
          partsCost,
          totalAmount,
          status: roStatus 
        }
      });

      return { success: true, branchId: requisition.branchId };
    });

    notifyRequisitionCountChanged(result.branchId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Failed to approve requisition:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
