export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

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
    return NextResponse.json(ro);
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

    const redeemTx = await prisma.loyaltyTransaction.findFirst({
      where: {
        relatedRoId: id,
        type: "REDEEM",
        points: { lt: 0 },
      },
    });
    const discount = redeemTx ? Math.abs(Number(redeemTx.points)) * 1000 : 0;
    const rawTotalAmount = (body.laborCost ?? Number(currentRo.laborCost)) + (body.partsCost ?? Number(currentRo.partsCost));
    const newTotalAmount = Math.max(0, rawTotalAmount - discount);
    const paidAmount = Number(currentRo.paidAmount || 0);
    const newDebtAmount = newTotalAmount - paidAmount;
    const debtDelta = newDebtAmount - Number(currentRo.debtAmount || 0);

    const data: any = {
      plateNumber: body.plateNumber,
      vehicleModel: body.vehicleModel,
      kmIn: body.kmIn,
      symptoms: body.symptoms,
      status: body.status,
      technicianId: body.technicianId,
      laborCost: body.laborCost,
      partsCost: body.partsCost,
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

          // Send Zalo ZNS Live in Background (Asynchronous, Fire-and-Forget)
          Promise.resolve().then(async () => {
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
          });
        }
      }
    }

    return NextResponse.json(ro);
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

    await prisma.$transaction(async (tx) => {
      // 1. Handle Parts Inventory Restoration based on Requisition Status
      const requisitions = await tx.partsRequisition.findMany({
        where: { repairOrderId: id },
        include: { items: true }
      });

      for (const req of requisitions) {
        if (req.status === "APPROVED") {
          // Warehouse already exported the parts. We must return them to stockCount.
          const reqProductIds = req.items.map(ri => ri.productId);
          const orderItems = await tx.orderItem.findMany({
            where: {
              repairOrderId: id,
              productId: { in: reqProductIds }
            }
          });
          await Promise.all(orderItems.map(async (item) => {
            if (item.productId) {
              const pb = await tx.productBranch.findUnique({
                where: { productId_branchId: { productId: item.productId, branchId: currentRo.branchId || 1 } }
              });
              if (pb) {
                await tx.productBranch.update({
                  where: { id: pb.id },
                  data: { stockCount: { increment: item.quantity } }
                });
                await tx.stockMovement.create({
                  data: {
                    productId: item.productId,
                    type: "IMPORT",
                    quantity: item.quantity,
                    unitCost: item.unitPrice,
                    totalCost: Number(item.quantity) * Number(item.unitPrice),
                    reason: `Hoàn kho do hủy lệnh sửa chữa RO-${id}`,
                    createdBy: "system",
                  }
                });
              }
            }
          }));
        } else if (req.status === "PENDING") {
          // Warehouse has NOT exported parts. They are only in reservedStock.
          // Clear the reservations.
          await Promise.all(req.items.map((item) => 
            tx.productBranch.update({
              where: { productId_branchId: { productId: item.productId, branchId: currentRo.branchId || 1 } },
              data: { reservedStock: { decrement: item.quantity } }
            })
          ));
        }

        // Cancel the requisition so warehouse doesn't see it anymore
        await tx.partsRequisition.update({
          where: { id: req.id },
          data: { status: "REJECTED" } // Mark as rejected/cancelled
        });
      }

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
