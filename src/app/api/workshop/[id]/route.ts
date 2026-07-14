export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";
import { releaseReservedStock, restoreStockOnce, type ReturnSourceItem } from "@/lib/inventory-cancellation";

const serializeRepairOrder = (ro: any) => {
  if (!ro) return null;
  return {
    ...ro,
    laborCost: Number(ro.laborCost || 0),
    partsCost: Number(ro.partsCost || 0),
    discountAmount: Number(ro.discountAmount || 0),
    totalAmount: Number(ro.totalAmount || 0),
    paidAmount: Number(ro.paidAmount || 0),
    debtAmount: Number(ro.debtAmount || 0),
    items: ro.items?.map((item: any) => ({
      ...item,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      totalPrice: Number(item.totalPrice || 0)
    })) || []
  };
};

// GET /api/workshop/[id] — get single repair order with full detail
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const ro = await prisma.repairOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        technician: true,
        items: { include: { product: { include: { prices: true } } } },
        branch: true,
      },
    });
    if (!ro) return NextResponse.json({ error: "Không tìm thấy lệnh sửa chữa" }, { status: 404 });
    return NextResponse.json(serializeRepairOrder(ro));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/workshop/[id] — update Repair Order
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const body = await req.json();
    const branchId = getActiveBranchId();

    const currentRo = await prisma.repairOrder.findFirst({
      where: {
        id,
        ...(branchId ? { branchId } : {}),
      },
    });
    if (!currentRo) return NextResponse.json({ error: "Lệnh sửa chữa không tồn tại hoặc không thuộc cơ sở này" }, { status: 404 });

    if (currentRo.status === "WAITING_PARTS" && body.status && body.status !== "WAITING_PARTS") {
      const pendingReq = await prisma.partsRequisition.findFirst({
        where: {
          repairOrderId: id,
          status: "PENDING"
        }
      });
      if (pendingReq) {
        return NextResponse.json({ 
          error: "Lệnh sửa chữa đang chờ duyệt phụ tùng. Bạn phải duyệt hoặc từ chối phiếu yêu cầu phụ tùng trước khi chuyển sang trạng thái khác!" 
        }, { status: 400 });
      }
    }

    let finalSymptoms = body.symptoms;
    let serviceDiscountPercent = 0;
    let partsDiscountPercent = 0;
    let isJson = false;

    // Check if the current symptoms in DB is JSON
    if (currentRo.symptoms) {
      try {
        const parsed = JSON.parse(currentRo.symptoms);
        if (parsed && typeof parsed === "object") {
          isJson = true;
          if (body.symptoms) {
            try {
              const incomingParsed = JSON.parse(body.symptoms);
              if (incomingParsed && typeof incomingParsed === "object") {
                // Incoming is JSON (sent from new RO or frontend update)
                serviceDiscountPercent = Number(incomingParsed.serviceDiscountPercent) || 0;
                partsDiscountPercent = Number(incomingParsed.partsDiscountPercent) || 0;
              } else {
                // Incoming is plain text (e.g. from simple edit modal), wrap it in the JSON structure
                parsed.summary = body.symptoms;
                finalSymptoms = JSON.stringify(parsed);
                serviceDiscountPercent = Number(parsed.serviceDiscountPercent) || 0;
                partsDiscountPercent = Number(parsed.partsDiscountPercent) || 0;
              }
            } catch {
              // Incoming is plain text
              parsed.summary = body.symptoms;
              finalSymptoms = JSON.stringify(parsed);
              serviceDiscountPercent = Number(parsed.serviceDiscountPercent) || 0;
              partsDiscountPercent = Number(parsed.partsDiscountPercent) || 0;
            }
          } else {
            // Incoming has no symptoms field, keep current JSON
            serviceDiscountPercent = Number(parsed.serviceDiscountPercent) || 0;
            partsDiscountPercent = Number(parsed.partsDiscountPercent) || 0;
          }
        }
      } catch {}
    }

    // If current was NOT JSON, but incoming IS JSON:
    if (!isJson && body.symptoms) {
      try {
        const parsed = JSON.parse(body.symptoms);
        if (parsed && typeof parsed === "object") {
          isJson = true;
          serviceDiscountPercent = Number(parsed.serviceDiscountPercent) || 0;
          partsDiscountPercent = Number(parsed.partsDiscountPercent) || 0;
        }
      } catch {}
    }

    const redeemTx = await prisma.loyaltyTransaction.findFirst({
      where: {
        relatedRoId: id,
        type: "REDEEM",
        points: { lt: 0 },
      },
    });
    const pointsDiscount = redeemTx ? Math.abs(Number(redeemTx.points)) * 1000 : 0;
    const labor = body.laborCost !== undefined ? Number(body.laborCost) : Number(currentRo.laborCost);
    const parts = body.partsCost !== undefined ? Number(body.partsCost) : Number(currentRo.partsCost);

    let totalDiscountAmount = 0;
    let discountPercentVal = 0;
    if (isJson) {
      const serviceDiscountAmount = Math.round(labor * (serviceDiscountPercent / 100));
      const partsDiscountAmount = Math.round(parts * (partsDiscountPercent / 100));
      totalDiscountAmount = serviceDiscountAmount + partsDiscountAmount;
      discountPercentVal = serviceDiscountPercent; // We store service discount percent in discountPercent
    } else {
      // Old format: fallback to standard total discount percent
      discountPercentVal = body.discountPercent !== undefined ? Number(body.discountPercent) : Number(currentRo.discountPercent || 0);
      totalDiscountAmount = Math.round((labor + parts) * (discountPercentVal / 100));
    }

    const newTotalAmount = Math.max(0, (labor + parts) - pointsDiscount - totalDiscountAmount);
    const paidAmount = Number(currentRo.paidAmount || 0);
    const newDebtAmount = newTotalAmount - paidAmount;
    const debtDelta = newDebtAmount - Number(currentRo.debtAmount || 0);

    const data: any = {
      plateNumber: body.plateNumber,
      vehicleModel: body.vehicleModel,
      kmIn: body.kmIn,
      symptoms: finalSymptoms,
      status: body.status,
      technicianId: body.technicianId,
      laborCost: labor,
      partsCost: parts,
      discountPercent: discountPercentVal,
      discountAmount: totalDiscountAmount,
      totalAmount: newTotalAmount,
      debtAmount: newDebtAmount,
      photos: body.photos,
    };

    if (body.status === "DONE" && currentRo.status !== "DONE") {
      data.completedAt = new Date();
    }

    const ro = await prisma.$transaction(async (tx) => {
      const updatedRo = await tx.repairOrder.update({
        where: { id },
        data,
        include: { customer: true, technician: true },
      });

      if (debtDelta !== 0 && currentRo.customerId) {
        await tx.customer.update({
          where: { id: currentRo.customerId },
          data: { totalDebt: { increment: debtDelta } }
        });
      }

      return updatedRo;
    });

    // Handle completion logic (points, technician status, ZNS)
    if (body.status === "DONE" && currentRo.status !== "DONE") {
      if (ro.technicianId) {
        await prisma.technician.update({ where: { id: ro.technicianId }, data: { status: "IDLE" } });
      }

      // Only process customer rewards/debt if there is an associated customer profile
      if (ro.customerId) {
        const existingEarnTx = await prisma.loyaltyTransaction.findFirst({
          where: {
            relatedRoId: id,
            type: "EARN",
          }
        });

        if (!existingEarnTx) {
          // Send loyalty points & ZNS
          const configPointsRate = await prisma.systemConfig.findUnique({
            where: { key: "points_rate" }
          });
          const pointsRatePercent = configPointsRate ? parseFloat(configPointsRate.value) : 1.0;
          const points = Math.max(0, Math.floor((Number(ro.totalAmount) * (pointsRatePercent / 100)) / 1000));

          // Update customer: add spent value (paidAmount) and loyalty points
          await prisma.customer.update({
            where: { id: ro.customerId },
            data: {
              loyaltyPoints: { increment: points },
              totalSpent: { increment: Number(ro.paidAmount || 0) },
              lastVisit: new Date(),
            },
          });

          // Ghi log tích điểm (audit trail)
          await prisma.loyaltyTransaction.create({
            data: {
              customerId: ro.customerId,
              type: "EARN",
              points: points,
              description: `Tích điểm từ lệnh sửa chữa #${ro.id} - ${ro.vehicleModel || ro.plateNumber} (tỷ lệ ${pointsRatePercent}%)`,
              relatedRoId: ro.id,
              branchId: ro.branchId,
            },
          });

          // Send Zalo ZNS Live (Awaited to ensure Vercel doesn't kill the container)
          try {
            const { sendZaloZns, formatDateForZalo } = await import("@/lib/zalo");
            const updatedCustomer = await prisma.customer.findUnique({
              where: { id: ro.customerId! },
              select: { loyaltyPoints: true },
            });
            const totalPoint = updatedCustomer?.loyaltyPoints ?? (ro.customer.loyaltyPoints + points);
            
            const custName = ro.customer.name;
            const noteVal = ro.vehicleModel || ro.plateNumber || "Dịch vụ sửa chữa xe";
            const templateData = {
              customer_name: custName.length > 49 ? custName.substring(0, 49) : custName,
              order_date: formatDateForZalo(new Date()),
              note: noteVal.length > 29 ? noteVal.substring(0, 29) : noteVal,
              point: String(points),
              total_point: String(totalPoint),
            };
            
            const result = await sendZaloZns(ro.customer.phone, "CRM_THANK_YOU_001", templateData);
            
            await prisma.znsLog.create({
              data: {
                customerId: ro.customerId,
                phone: ro.customer.phone,
                messageType: "THANK_YOU",
                templateId: "CRM_THANK_YOU_001",
                content: `Cảm ơn khách hàng ${ro.customer.name} đã sửa chữa xe ${ro.vehicleModel || ro.plateNumber}. Quý khách tích được +${points} điểm!`,
                status: result.success ? "SUCCESS" : "FAILED",
                error: result.error || null,
                branchId: ro.branchId,
              },
            });
          } catch (e: any) {
            console.error("ZNS Background Task Error:", e);
            await prisma.znsLog.create({
              data: {
                customerId: ro.customerId,
                phone: ro.customer.phone,
                messageType: "THANK_YOU",
                templateId: "CRM_THANK_YOU_001",
                content: `Lỗi khi chuẩn bị gửi ZNS cho RO-${ro.id}`,
                status: "FAILED",
                error: e.message,
                branchId: ro.branchId,
              },
            });
          }
        }
      }
    }

    return NextResponse.json(serializeRepairOrder(ro));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// DELETE /api/workshop/[id] — delete Repair Order
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const branchId = getActiveBranchId();
    const currentRo = await prisma.repairOrder.findFirst({
      where: {
        id,
        ...(branchId ? { branchId } : {}),
      },
    });
    if (!currentRo) return NextResponse.json({ error: "Lệnh sửa chữa không tồn tại hoặc không thuộc cơ sở này" }, { status: 404 });
    if (currentRo.isDeleted || currentRo.status === "CANCELLED") {
      return NextResponse.json({ success: true, message: "Lệnh sửa chữa đã được hủy trước đó" });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Handle Parts Inventory Restoration based on Requisition Status
      const requisitions = await tx.partsRequisition.findMany({
        where: { repairOrderId: id },
        include: { items: true }
      });
      const branchIdForStock = currentRo.branchId || 1;
      const exportMovements = await tx.stockMovement.findMany({
        where: { relatedRoId: id, type: "EXPORT" },
      });
      const unitCostByProduct = new Map<number, number>();
      for (const movement of exportMovements) {
        if (!unitCostByProduct.has(movement.productId)) {
          unitCostByProduct.set(movement.productId, Number(movement.unitCost || 0));
        }
      }
      const approvedReturnItems: ReturnSourceItem[] = [];

      for (const req of requisitions) {
        if (req.status === "APPROVED") {
          // Warehouse already exported these requested parts. Return the requested
          // quantity only, not duplicated OrderItem rows.
          approvedReturnItems.push(
            ...req.items.map((item) => ({
              productId: item.productId,
              quantity: Number(item.quantity),
              unitCost: unitCostByProduct.get(item.productId) || 0,
            })),
          );
        } else if (req.status === "PENDING") {
          // Warehouse has NOT exported parts. They are only in reservedStock.
          // Clear the reservations.
          await releaseReservedStock(tx, branchIdForStock, req.items.map(i => ({...i, quantity: Number(i.quantity)})));
        }

        // Cancel the requisition so warehouse doesn't see it anymore
        await tx.partsRequisition.update({
          where: { id: req.id },
          data: { status: "REJECTED" } // Mark as rejected/cancelled
        });
      }

      await restoreStockOnce(tx, {
        branchId: branchIdForStock,
        items: approvedReturnItems,
        reason: `Hoàn kho do hủy lệnh sửa chữa RO-${id}`,
        relatedRoId: id,
        createdBy: "system",
      });

      // 2. Revert customer debt and spent
      if (currentRo.customerId) {
        const debtAmount = Number(currentRo.debtAmount || 0);
        const paidAmount = Number(currentRo.paidAmount || 0);
        const isCompleted = ["DONE", "DELIVERED"].includes(currentRo.status);
        await tx.customer.update({
          where: { id: currentRo.customerId },
          data: {
            totalDebt: { decrement: debtAmount },
            ...(isCompleted ? { totalSpent: { decrement: paidAmount } } : {})
          }
        });

        // Revert points earned if completed
        if (isCompleted) {
          const earnTx = await tx.loyaltyTransaction.findFirst({
            where: {
              relatedRoId: id,
              type: "EARN",
            }
          });
          if (earnTx) {
            await tx.customer.update({
              where: { id: currentRo.customerId },
              data: {
                loyaltyPoints: { decrement: earnTx.points }
              }
            });
            await tx.loyaltyTransaction.create({
              data: {
                customerId: currentRo.customerId,
                type: "REDEEM",
                points: -earnTx.points,
                description: `Thu hồi điểm tích lũy do hủy lệnh sửa chữa RO-${id}`,
                relatedRoId: id,
                branchId: currentRo.branchId,
              }
            });
          }
        }

        // Revert points redeemed on creation
        const redeemTx = await tx.loyaltyTransaction.findFirst({
          where: {
            relatedRoId: id,
            type: "REDEEM",
            points: { lt: 0 } // points < 0 means redemption
          }
        });
        if (redeemTx) {
          await tx.customer.update({
            where: { id: currentRo.customerId },
            data: {
              loyaltyPoints: { increment: Math.abs(redeemTx.points) }
            }
          });
          await tx.loyaltyTransaction.create({
            data: {
              customerId: currentRo.customerId,
              type: "EARN",
              points: Math.abs(redeemTx.points),
              description: `Hoàn trả điểm sử dụng do hủy lệnh sửa chữa RO-${id}`,
              relatedRoId: id,
              branchId: currentRo.branchId,
            }
          });
        }
      }

      // 3. Soft Delete
      await tx.repairOrder.update({
        where: { id },
        data: { isDeleted: true, status: "CANCELLED" }
      });
    });

    return NextResponse.json({ success: true, message: "Hủy lệnh sửa chữa thành công và hoàn lại tồn kho" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
