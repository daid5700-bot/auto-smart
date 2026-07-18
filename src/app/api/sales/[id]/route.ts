export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";
import { requireAuth } from "@/lib/guard";
import { releaseReservedStock, restoreStockOnce, type ReturnSourceItem } from "@/lib/inventory-cancellation";
import { notifyRequisitionCountChanged } from "@/lib/requisition-events";
import { getOrCreateCustomerForBranch } from "@/lib/customer-branch";
import { handleApiError, parseJson } from "@/lib/api-response";
import {
  adjustCustomerVehicleBalances,
  buildVehicleUpdateData,
  calculateUpdatedVehicleAmounts,
  normalizeCancelledVin,
  syncAccessoryExportOrder,
  syncGiftRequisition,
} from "@/lib/sales/vehicle-update";
import { updateVehicleSchema } from "@/lib/validation/sales";

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
  } catch (error) {
    return handleApiError(error, "SALES_DETAIL_GET", "Không thể tải hồ sơ xe");
  }
}

// PATCH /api/sales/[id] — update vehicle details
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;

  try {
    const id = parseInt(params.id);
    if (isNaN(id) || id <= 0) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
    const body = await parseJson(req, updateVehicleSchema);
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

    const { vin, giftItemsJson, customerName, customerPhone, customerBirthday, customerAddress } = body;

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
      const customer = await getOrCreateCustomerForBranch({
        name: customerName,
        phone: customerPhone,
        birthday: customerBirthday,
        branchId,
        address: customerAddress,
      });
      if (customer) {
        customerId = customer.id;
      }
    }

    const updateData = buildVehicleUpdateData(currentVehicle, body, customerId);
    const { accessories, accessoriesCost, debtAmount } = calculateUpdatedVehicleAmounts(
      currentVehicle,
      updateData,
    );
    updateData.debtAmount = debtAmount;
    normalizeCancelledVin(currentVehicle, updateData);

    let requisitionEventBranchId: number | null | undefined = null;

    const vehicle = await prisma.$transaction(async (tx) => {
      const v = await tx.vehicle.update({
        where: { id },
        data: updateData,
        include: { customer: true }
      });
      await adjustCustomerVehicleBalances(tx, currentVehicle, v, debtAmount);
      const accessoryBranchId = await syncAccessoryExportOrder({
        tx,
        vehicle: v,
        accessories,
        accessoriesCost,
        fallbackBranchId: branchId,
      });
      const giftBranchId = await syncGiftRequisition({
        tx,
        vehicle: v,
        giftItemsJson,
        fallbackBranchId: branchId,
      });
      requisitionEventBranchId = giftBranchId ?? accessoryBranchId;

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
  } catch (error) {
    return handleApiError(error, "PATCH /api/sales/[id]");
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
  } catch (error) {
    return handleApiError(error, "SALES_DETAIL_DELETE", "Không thể hủy hồ sơ xe");
  }
}
