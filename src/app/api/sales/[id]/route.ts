export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";
import { requireAuth } from "@/lib/guard";
import { releaseReservedStock, restoreStockOnce, type ReturnSourceItem } from "@/lib/inventory-cancellation";
import { notifyRequisitionCountChanged } from "@/lib/requisition-events";

// Helper to find or upsert a Customer
async function getOrCreateCustomer(name: string, phone: string, birthdayStr?: string, branchId?: number | null, address?: string) {
  if (!phone || !name) return null;

  let birthday: Date | null = null;
  if (birthdayStr) {
    birthday = new Date(birthdayStr);
  }

  const existing = await prisma.customer.findUnique({
    where: { phone }
  });

  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: {
        name,
        ...(birthday ? { birthday } : {}),
        ...(address !== undefined ? { address } : {})
      }
    });
  } else {
    return prisma.customer.create({
      data: {
        name,
        phone,
        source: "WALKIN",
        birthday,
        branchId,
        address: address || null
      }
    });
  }
}

// GET /api/sales/[id] — retrieve a single vehicle details
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;

  try {
    const id = parseInt(params.id);
    if (isNaN(id) || id <= 0) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
    const branchId = getActiveBranchId();

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        ...(branchId ? { branchId } : {}),
      },
      include: { 
        customer: true,
        partsRequisitions: {
          where: { reason: { contains: "tặng phụ tùng", mode: "insensitive" }, status: { in: ["PENDING", "APPROVED"] } },
          include: {
            items: {
              include: { product: true }
            }
          }
        }
      }
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Hồ sơ xe không tồn tại" }, { status: 404 });
    }

    const existingOrder = await prisma.inventoryOrder.findFirst({
      where: {
        vehicleId: vehicle.id,
        createdBy: "Hệ thống (Bán Xe)",
        type: "EXPORT_RETAIL"
      }
    });

    const serializedVehicle = {
      ...vehicle,
      importPrice: vehicle.importPrice ? Number(vehicle.importPrice) : null,
      listPrice: vehicle.listPrice ? Number(vehicle.listPrice) : 0,
      floorPrice: vehicle.floorPrice ? Number(vehicle.floorPrice) : 0,
      paidAmount: vehicle.paidAmount ? Number(vehicle.paidAmount) : 0,
      debtAmount: vehicle.debtAmount ? Number(vehicle.debtAmount) : 0,
      plateCost: vehicle.plateCost ? Number(vehicle.plateCost) : null,
      partsRequisitions: vehicle.partsRequisitions?.map((pr: any) => ({
        ...pr,
        items: pr.items?.map((item: any) => ({
          ...item,
          quantity: Number(item.quantity)
        })) || []
      })) || []
    };

    return NextResponse.json({
      ...serializedVehicle,
      accessoriesExported: existingOrder ? existingOrder.status === "PAID" : false,
      accessoriesExportStatus: existingOrder ? existingOrder.status : "NONE", // NONE, PENDING, PAID, CANCELLED
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// PATCH /api/sales/[id] — update vehicle details
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;

  try {
    const id = parseInt(params.id);
    if (isNaN(id) || id <= 0) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
    const body = await req.json();
    const branchId = getActiveBranchId();

    const currentVehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        ...(branchId ? { branchId } : {}),
      },
    });
    if (!currentVehicle) {
      return NextResponse.json({ error: "Thông tin xe không tồn tại hoặc không thuộc cơ sở này" }, { status: 404 });
    }

    const {
      vin, sku, engineNumber, importPrice, importDate, stockCount, branchId: selectBranchId, warehouse,
      model, variant, color, year, status, listPrice, floorPrice, image,
      bankStatus, plateStatus, plateCost, accessoriesJson, giftItemsJson, notes,
      customerName, customerPhone, customerBirthday, customerAddress, saleType
    } = body;

    if (vin !== undefined && vin && vin.trim() !== "" && vin.trim() !== currentVehicle.vin) {
      const existingActive = await prisma.vehicle.findFirst({
        where: {
          vin: vin.trim(),
          status: { not: "CANCELLED" },
          id: { not: id }
        }
      });
      if (existingActive) {
        return NextResponse.json({ error: `Số khung (VIN) '${vin.trim()}' đã tồn tại trên một xe khác đang hoạt động trong hệ thống.` }, { status: 400 });
      }
    }

    let customerId = currentVehicle.customerId;
    if (customerPhone && customerName) {
      const customer = await getOrCreateCustomer(customerName, customerPhone, customerBirthday, branchId, customerAddress);
      if (customer) {
        customerId = customer.id;
      }
    }

    const updateData: any = {};
    if (vin !== undefined) updateData.vin = vin && vin.trim() !== "" ? vin.trim() : currentVehicle.vin;
    if (sku !== undefined) updateData.sku = sku || null;
    if (engineNumber !== undefined) updateData.engineNumber = engineNumber || null;
    if (importPrice !== undefined) updateData.importPrice = importPrice !== "" ? Number(importPrice) : 0;
    if (importDate !== undefined) updateData.importDate = importDate ? new Date(importDate) : null;
    if (stockCount !== undefined) updateData.stockCount = stockCount || null;
    if (selectBranchId !== undefined) updateData.branchId = selectBranchId ? Number(selectBranchId) : null;
    if (model !== undefined) updateData.model = model && model.trim() !== "" ? model.trim() : "Chưa rõ";
    if (variant !== undefined) updateData.variant = variant || null;
    if (color !== undefined) updateData.color = color || null;
    if (year !== undefined) updateData.year = Number(year) || new Date().getFullYear();
    if (status !== undefined) updateData.status = status;
    if (listPrice !== undefined) updateData.listPrice = listPrice !== "" ? Number(listPrice) : 0;
    if (floorPrice !== undefined) updateData.floorPrice = floorPrice !== "" ? Number(floorPrice) : 0;
    if (image !== undefined) updateData.image = image;
    if (bankStatus !== undefined) updateData.bankStatus = bankStatus;
    if (plateStatus !== undefined) updateData.plateStatus = plateStatus;
    if (plateCost !== undefined) updateData.plateCost = Number(plateCost);
    if (accessoriesJson !== undefined) updateData.accessoriesJson = accessoriesJson;
    if (notes !== undefined) updateData.notes = notes;
    if (warehouse !== undefined) updateData.warehouse = warehouse;
    if (saleType !== undefined) updateData.saleType = saleType;

    // Explicitly set customerId if it was resolved
    updateData.customerId = customerId;

    // Calculate new total amount and debt
    const finalListPrice = updateData.listPrice ?? currentVehicle.listPrice.toNumber();
    const finalPlateCost = updateData.plateCost ?? (currentVehicle.plateCost ? currentVehicle.plateCost.toNumber() : 0);
    const finalAcc = updateData.accessoriesJson ?? currentVehicle.accessoriesJson ?? "[]";
    const accessories = JSON.parse(finalAcc);
    const accCost = accessories.reduce((acc: number, curr: any) => acc + (Number(curr.price) * (Number(curr.quantity) || 1)), 0);

    const newTotalAmount = finalListPrice + finalPlateCost + accCost;
    const paid = currentVehicle.paidAmount.toNumber();
    const newDebtAmount = newTotalAmount - paid;

    updateData.debtAmount = newDebtAmount;

    let requisitionEventBranchId: number | null | undefined = null;

    const vehicle = await prisma.$transaction(async (tx) => {
      // 1. Calculate old amounts
      const oldAccessories = typeof currentVehicle.accessoriesJson === "string" ? JSON.parse(currentVehicle.accessoriesJson) : (currentVehicle.accessoriesJson as any) || [];
      const oldAccCost = oldAccessories.reduce((acc: number, curr: any) => acc + (Number(curr.price) * (Number(curr.quantity) || 1)), 0);
      const oldTotalAmount = currentVehicle.listPrice.toNumber() + (currentVehicle.plateCost ? currentVehicle.plateCost.toNumber() : 0) + oldAccCost;
      const oldDebtAmount = currentVehicle.debtAmount.toNumber();

      // 2. Determine statuses
      const oldStatus = currentVehicle.status;
      const newStatus = updateData.status || oldStatus;

      if (newStatus === "CANCELLED") {
        const targetVin = updateData.vin || currentVehicle.vin;
        if (!targetVin.startsWith("CANCELLED-")) {
          updateData.vin = `CANCELLED-${currentVehicle.id}-${targetVin}`;
        }
      }

      const wasActive = ["RESERVED", "SOLD"].includes(oldStatus);
      const isNowActive = ["RESERVED", "SOLD"].includes(newStatus);

      // 3. Update the vehicle
      const v = await tx.vehicle.update({
        where: { id },
        data: updateData,
        include: { customer: true }
      });

      // 4. Handle customer debt and spent adjustments
      const oldCustomerId = currentVehicle.customerId;
      const newCustomerId = v.customerId;
      const oldPaidAmount = currentVehicle.paidAmount.toNumber();
      const newPaidAmount = v.paidAmount.toNumber();

      if (oldCustomerId !== newCustomerId) {
        // Customer changed: Revert from old customer (if was active), apply to new customer (if now active)
        if (oldCustomerId && wasActive) {
          await tx.customer.update({
            where: { id: oldCustomerId },
            data: {
              totalDebt: { decrement: oldDebtAmount },
              totalSpent: { decrement: oldPaidAmount }
            }
          });
        }
        if (newCustomerId && isNowActive) {
          await tx.customer.update({
            where: { id: newCustomerId },
            data: {
              totalDebt: { increment: newDebtAmount },
              totalSpent: { increment: newPaidAmount }
            }
          });
        }
      } else if (newCustomerId) {
        // Same customer: Calculate delta based on status transition and price changes
        let debtChange = 0;
        let spentChange = 0;

        if (!wasActive && isNowActive) {
          // Transition to SOLD/RESERVED
          debtChange = newDebtAmount;
          spentChange = newPaidAmount;
        } else if (wasActive && !isNowActive) {
          // Transition out of SOLD/RESERVED
          debtChange = -oldDebtAmount;
          spentChange = -oldPaidAmount;
        } else if (wasActive && isNowActive) {
          // Kept SOLD/RESERVED, but prices might have changed
          debtChange = newDebtAmount - oldDebtAmount;
          spentChange = newPaidAmount - oldPaidAmount;
        }

        if (debtChange !== 0 || spentChange !== 0) {
          await tx.customer.update({
            where: { id: newCustomerId },
            data: {
              totalDebt: { increment: debtChange },
              totalSpent: { increment: spentChange }
            }
          });
        }
      }

      // Automatically create or update the pending accessory export order
      if (accessories.length > 0) {
        const existingOrder = await tx.inventoryOrder.findFirst({
          where: {
            vehicleId: v.id,
            createdBy: "Hệ thống (Bán Xe)",
            type: "EXPORT_RETAIL"
          }
        });

        if (!existingOrder) {
          const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
          const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
          const orderCode = `PKX-${dateStr}-${randomStr}`;

          const pendingOrder = await tx.inventoryOrder.create({
            data: {
              code: orderCode,
              customerId: v.customerId,
              type: "EXPORT_RETAIL",
              totalAmount: accCost,
              paidAmount: accCost,
              debtAmount: 0,
              status: "PENDING",
              reason: `Xuất phụ kiện bán kèm xe VIN: ${v.vin}`,
              vehicleId: v.id,
              branchId: v.branchId || branchId,
              createdBy: "Hệ thống (Bán Xe)",
            }
          });
          requisitionEventBranchId = pendingOrder.branchId;
        } else if (existingOrder.status !== "PAID") {
          // If already exists but not paid, update status to PENDING and update totalAmount
          const pendingOrder = await tx.inventoryOrder.update({
            where: { id: existingOrder.id },
            data: {
              status: "PENDING",
              totalAmount: accCost,
              paidAmount: accCost,
              customerId: v.customerId,
            }
          });
          requisitionEventBranchId = pendingOrder.branchId;
        }
      } else {
        // If they updated the vehicle and removed all accessories, cancel the pending order if any
        const existingOrder = await tx.inventoryOrder.findFirst({
          where: {
            vehicleId: v.id,
            createdBy: "Hệ thống (Bán Xe)",
            type: "EXPORT_RETAIL"
          }
        });
        if (existingOrder && existingOrder.status === "PENDING") {
          const cancelledOrder = await tx.inventoryOrder.update({
            where: { id: existingOrder.id },
            data: { status: "CANCELLED", reason: `${existingOrder.reason} | Hủy do xóa hết phụ kiện` }
          });
          requisitionEventBranchId = cancelledOrder.branchId;
        }
      }

      // Xử lý phụ tùng quà tặng (gift items)
      if (giftItemsJson !== undefined) {
        const giftItems = JSON.parse(giftItemsJson || "[]");
        
        const allReqs = await tx.partsRequisition.findMany({
          where: {
            vehicleId: v.id,
            reason: { contains: "tặng phụ tùng", mode: "insensitive" }
          },
          include: { items: true }
        });
        
        const hasProcessedReq = allReqs.some(r => r.status === "APPROVED" || r.status === "REJECTED");
        const existingReq = allReqs.find(r => r.status === "PENDING");

        // Chỉ cho phép sửa/tạo/huỷ tự động nếu kho CHƯA duyệt hoặc từ chối phiếu nào
        if (!hasProcessedReq) {
          if (giftItems.length > 0) {
            if (existingReq) {
              requisitionEventBranchId = existingReq.branchId;
              // Revert reservedStock for old items
              for (const item of existingReq.items) {
                await tx.productBranch.updateMany({
                  where: { productId: item.productId, branchId: existingReq.branchId },
                  data: { reservedStock: { decrement: item.quantity } }
                });
              }
              // Xóa chi tiết cũ và tạo lại
              await tx.partsRequisitionItem.deleteMany({
                where: { requisitionId: existingReq.id }
              });
              await tx.partsRequisition.update({
                where: { id: existingReq.id },
                data: {
                  items: {
                    create: giftItems.map((item: any) => ({
                      productId: item.productId || item.id,
                      quantity: item.quantity
                    }))
                  }
                }
              });
            } else {
              const requisition = await tx.partsRequisition.create({
                data: {
                  branchId: v.branchId || branchId || 1,
                  status: "PENDING",
                  reason: `Quà tặng phụ tùng bán xe VIN: ${v.vin}`,
                  vehicleId: v.id,
                  createdBy: "Hệ thống (Bán Xe)",
                  items: {
                    create: giftItems.map((item: any) => ({
                      productId: item.productId || item.id,
                      quantity: item.quantity
                    }))
                  }
                }
              });
              requisitionEventBranchId = requisition.branchId;
            }

            // Tăng reservedStock cho các phụ tùng mới
            const currentBranchId = existingReq ? existingReq.branchId : (v.branchId || branchId || 1);
            for (const item of giftItems) {
              await tx.productBranch.updateMany({
                where: { productId: item.productId || item.id, branchId: currentBranchId },
                data: { reservedStock: { increment: Number(item.quantity) || 1 } }
              });
            }
          } else if (existingReq) {
            await tx.partsRequisition.update({
              where: { id: existingReq.id },
              data: { status: "CANCELLED" }
            });
            requisitionEventBranchId = existingReq.branchId;
            // Revert reservedStock
            for (const item of existingReq.items) {
              await tx.productBranch.updateMany({
                where: { productId: item.productId, branchId: existingReq.branchId },
                data: { reservedStock: { decrement: item.quantity } }
              });
            }
          }
        }
      }

      return v;
    });
    notifyRequisitionCountChanged(requisitionEventBranchId);
    const serializedVehicle = {
      ...vehicle,
      importPrice: vehicle.importPrice ? Number(vehicle.importPrice) : null,
      listPrice: vehicle.listPrice ? Number(vehicle.listPrice) : 0,
      floorPrice: vehicle.floorPrice ? Number(vehicle.floorPrice) : 0,
      paidAmount: vehicle.paidAmount ? Number(vehicle.paidAmount) : 0,
      debtAmount: vehicle.debtAmount ? Number(vehicle.debtAmount) : 0,
      plateCost: vehicle.plateCost ? Number(vehicle.plateCost) : null
    };

    return NextResponse.json(serializedVehicle);
  } catch (error: any) {
    console.error("PATCH /api/sales/[id] error details:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// DELETE /api/sales/[id] — delete vehicle
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;

  try {
    const id = parseInt(params.id);
    if (isNaN(id) || id <= 0) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
    const branchId = getActiveBranchId();

    const currentVehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        ...(branchId ? { branchId } : {}),
      },
    });
    if (!currentVehicle) {
      return NextResponse.json({ error: "Thông tin xe không tồn tại hoặc không thuộc cơ sở này" }, { status: 404 });
    }
    if (currentVehicle.status === "CANCELLED") {
      return NextResponse.json({ success: true, message: "Hồ sơ xe đã được hủy trước đó" });
    }

    let requisitionEventBranchId: number | null | undefined = null;

    await prisma.$transaction(async (tx) => {
      // Revert customer debt and spent if it was sold/reserved
      if (currentVehicle.customerId && ["RESERVED", "SOLD"].includes(currentVehicle.status)) {
        const debtAmount = currentVehicle.debtAmount.toNumber();
        const paidAmount = currentVehicle.paidAmount.toNumber();

        await tx.customer.update({
          where: { id: currentVehicle.customerId },
          data: {
            totalDebt: { decrement: debtAmount },
            totalSpent: { decrement: paidAmount }
          }
        });
      }

      // Cancel or return any accessory export orders for this VIN.
      const exportOrders = await tx.inventoryOrder.findMany({
        where: {
          vehicleId: currentVehicle.id,
          createdBy: "Hệ thống (Bán Xe)",
          type: "EXPORT_RETAIL",
          status: { in: ["PENDING", "PAID"] },
        },
        include: { movements: true },
      });
      if (exportOrders.length > 0) {
        requisitionEventBranchId = exportOrders[0].branchId || currentVehicle.branchId || branchId;
      }
      for (const exportOrder of exportOrders) {
        if (exportOrder.status === "PAID") {
          await restoreStockOnce(tx, {
            branchId: exportOrder.branchId || currentVehicle.branchId || branchId || 1,
            items: exportOrder.movements
              .filter((movement) => movement.type === "EXPORT")
              .map((movement) => ({
                productId: movement.productId,
                quantity: Number(movement.quantity),
                unitCost: Number(movement.unitCost || 0),
              })),
            reason: `Hoàn kho phụ kiện do hủy hồ sơ xe VIN ${currentVehicle.vin}`,
            inventoryOrderId: exportOrder.id,
            createdBy: "system",
          });
        }
        await tx.inventoryOrder.update({
          where: { id: exportOrder.id },
          data: {
            status: "CANCELLED",
            reason: exportOrder.reason?.includes("Tự động hủy do xe bị hủy hồ sơ")
              ? exportOrder.reason
              : `${exportOrder.reason} | Tự động hủy do xe bị hủy hồ sơ`
          },
        });
      }

      // Cancel or return gift item requisitions for this vehicle.
      const giftRequisitions = await tx.partsRequisition.findMany({
        where: {
          vehicleId: id,
          status: { in: ["PENDING", "APPROVED"] },
          reason: { contains: "tặng phụ tùng", mode: "insensitive" }
        },
        include: { items: true }
      });
      if (giftRequisitions.length > 0) {
        requisitionEventBranchId = giftRequisitions[0].branchId;
      }
      const giftExportReason = `Xuất kho tặng phụ tùng cho xe bán lẻ VIN #${currentVehicle.vin}`;
      const giftExportMovements = await tx.stockMovement.findMany({
        where: { type: "EXPORT_GIFT", reason: giftExportReason },
      });
      const giftUnitCostByProduct = new Map<number, number>();
      for (const movement of giftExportMovements) {
        if (!giftUnitCostByProduct.has(movement.productId)) {
          giftUnitCostByProduct.set(movement.productId, Number(movement.unitCost || 0));
        }
      }
      const approvedGiftItems: ReturnSourceItem[] = [];

      for (const requisition of giftRequisitions) {
        if (requisition.status === "PENDING") {
          await releaseReservedStock(tx, requisition.branchId, requisition.items.map(i => ({...i, quantity: Number(i.quantity)})));
        } else if (requisition.status === "APPROVED") {
          approvedGiftItems.push(
            ...requisition.items.map((item) => ({
              productId: item.productId,
              quantity: Number(item.quantity),
              unitCost: giftUnitCostByProduct.get(item.productId) || 0,
            })),
          );
        }
        await tx.partsRequisition.update({
          where: { id: requisition.id },
          data: { status: "REJECTED" }
        });
      }
      await restoreStockOnce(tx, {
        branchId: currentVehicle.branchId || branchId || 1,
        items: approvedGiftItems,
        reason: `Hoàn kho quà tặng do hủy hồ sơ xe VIN ${currentVehicle.vin}`,
        createdBy: "system",
      });

      await tx.vehicle.update({
        where: { id },
        data: {
          status: "CANCELLED",
          vin: currentVehicle.vin.startsWith("CANCELLED-") ? currentVehicle.vin : `CANCELLED-${currentVehicle.id}-${currentVehicle.vin}`
        }
      });
    });
    notifyRequisitionCountChanged(requisitionEventBranchId);
    return NextResponse.json({ success: true, message: "Đã hủy (xóa mềm) hồ sơ xe thành công" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
