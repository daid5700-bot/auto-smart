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
          repairOrder: true,
          vehicle: true
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

        const itemQty = Number(item.quantity);
        if (currentStock < itemQty) {
          throw new Error(`Phụ tùng [${product.sku}] ${product.name} không đủ tồn kho (Cần ${itemQty}, hiện có ${currentStock})`);
        }

        // Decrement product stock AND decrement the reservedStock since it's now fulfilled
        // Use Math.max guard to prevent reservedStock going negative due to data inconsistency
        const safeReservedDecrement = Math.min(itemQty, currentReserved);
        await tx.productBranch.update({
          where: { id: productBranch.id },
          data: { 
            stockCount: { decrement: itemQty },
            reservedStock: { decrement: safeReservedDecrement }
          }
        });

        // Luôn lấy giá bán lẻ phụ tùng làm giá
        const retailPrice = Number(product.prices?.find((p: any) => p.type === "RETAIL")?.amount || 0);
        const unitPrice = retailPrice;
        const totalPrice = unitPrice * itemQty;

        // Nếu là đơn sửa chữa thì ghi nhận vào hóa đơn
        if (requisition.repairOrderId) {
          const existingOrderItem = await tx.orderItem.findUnique({
            where: {
              repairOrderId_productId: {
                repairOrderId: requisition.repairOrderId,
                productId: product.id,
              }
            }
          });

          if (existingOrderItem) {
            const newQty = Number(existingOrderItem.quantity) + itemQty;
            await tx.orderItem.update({
              where: { id: existingOrderItem.id },
              data: {
                quantity: newQty,
                unitPrice: unitPrice,
                totalPrice: unitPrice * newQty,
              }
            });
          } else {
            await tx.orderItem.create({
              data: {
                repairOrderId: requisition.repairOrderId,
                productId: product.id,
                quantity: itemQty,
                unitPrice,
                totalPrice,
              }
            });
          }

          // Create StockMovement (EXPORT)
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              type: "EXPORT",
              quantity: itemQty,
              unitCost: unitPrice,
              totalCost: unitPrice * itemQty,
              reason: `Xuất kho duyệt phụ tùng cho RO #${requisition.repairOrderId}`,
              relatedRoId: requisition.repairOrderId,
              createdBy: "Thủ kho",
              branchId: requisition.branchId,
            }
          });
        } else if (requisition.vehicleId) {
          // Nếu là quà tặng xe bán lẻ
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              type: "EXPORT_GIFT",
              quantity: itemQty,
              unitCost: unitPrice,
              totalCost: unitPrice * itemQty,
              reason: `Xuất kho tặng phụ tùng cho xe bán lẻ VIN #${requisition.vehicle?.vin || requisition.vehicleId}`,
              vehicleId: requisition.vehicleId,
              createdBy: "Thủ kho",
              branchId: requisition.branchId,
            }
          });
        }
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
      if (requisition.repairOrderId && requisition.repairOrder) {
        const roItems = await tx.orderItem.findMany({
          where: { repairOrderId: requisition.repairOrderId },
        });
        const partsCost = roItems.reduce((acc, curr) => acc + Number(curr.totalPrice), 0);
        const laborCost = Number(requisition.repairOrder.laborCost);

        const redeemTx = await tx.loyaltyTransaction.findFirst({
          where: {
            relatedRoId: requisition.repairOrderId,
            type: "REDEEM",
            points: { lt: 0 },
          },
        });
        const pointsDiscount = redeemTx ? Math.abs(Number(redeemTx.points)) * 1000 : 0;

        let serviceDiscountPercent = 0;
        let partsDiscountPercent = 0;
        let isJson = false;

        if (requisition.repairOrder.symptoms) {
          try {
            const parsed = JSON.parse(requisition.repairOrder.symptoms);
            if (parsed && typeof parsed === "object") {
              isJson = true;
              serviceDiscountPercent = Number(parsed.serviceDiscountPercent) || 0;
              partsDiscountPercent = Number(parsed.partsDiscountPercent) || 0;
            }
          } catch {}
        }

        let totalDiscountAmount = 0;
        let discountPercentVal = 0;
        if (isJson) {
          const serviceDiscountAmount = Math.round(laborCost * (serviceDiscountPercent / 100));
          const partsDiscountAmount = Math.round(partsCost * (partsDiscountPercent / 100));
          totalDiscountAmount = serviceDiscountAmount + partsDiscountAmount;
          discountPercentVal = serviceDiscountPercent;
        } else {
          discountPercentVal = Number(requisition.repairOrder.discountPercent || 0);
          totalDiscountAmount = Math.round((laborCost + partsCost) * (discountPercentVal / 100));
        }

        const totalAmount = Math.max(0, (laborCost + partsCost) - pointsDiscount - totalDiscountAmount);
        const paidAmount = Number(requisition.repairOrder.paidAmount || 0);
        const newDebtAmount = totalAmount - paidAmount;
        const debtDelta = newDebtAmount - Number(requisition.repairOrder.debtAmount || 0);

        const roStatus = "DOING";
        await tx.repairOrder.update({
          where: { id: requisition.repairOrderId },
          data: { 
            partsCost,
            discountAmount: totalDiscountAmount,
            totalAmount,
            debtAmount: newDebtAmount,
            status: roStatus 
          }
        });

        if (debtDelta !== 0 && requisition.repairOrder.customerId) {
          await tx.customer.update({
            where: { id: requisition.repairOrder.customerId },
            data: { totalDebt: { increment: debtDelta } }
          });
        }
      }

      return { success: true, branchId: requisition.branchId };
    });

    notifyRequisitionCountChanged(result.branchId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Failed to approve requisition:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
