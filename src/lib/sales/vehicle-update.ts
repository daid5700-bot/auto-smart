import { Prisma, Vehicle } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export type VehicleUpdateBody = Record<string, any>;

export function parseItemArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];
  const parsed = JSON.parse(value);
  return Array.isArray(parsed) ? parsed : [];
}

export function accessoryTotal(items: any[]) {
  return items.reduce(
    (total, item) => total + Number(item.price || 0) * (Number(item.quantity) || 1),
    0,
  );
}

export function buildVehicleUpdateData(
  current: Vehicle,
  body: VehicleUpdateBody,
  customerId: number | null,
): Prisma.VehicleUncheckedUpdateInput {
  const data: Prisma.VehicleUncheckedUpdateInput = { customerId };
  const {
    vin, sku, engineNumber, importPrice, importDate, stockCount,
    branchId, warehouse, model, variant, color, year, status, listPrice,
    floorPrice, image, bankStatus, plateStatus, plateCost, accessoriesJson,
    notes, saleType,
  } = body;

  if (vin !== undefined) data.vin = vin?.trim() || current.vin;
  if (sku !== undefined) data.sku = sku || null;
  if (engineNumber !== undefined) data.engineNumber = engineNumber || null;
  if (importPrice !== undefined) data.importPrice = importPrice !== "" ? Number(importPrice) : 0;
  if (importDate !== undefined) data.importDate = importDate ? new Date(importDate) : null;
  if (stockCount !== undefined) data.stockCount = stockCount || null;
  if (branchId !== undefined) data.branchId = branchId ? Number(branchId) : null;
  if (model !== undefined) data.model = model?.trim() || "Chưa rõ";
  if (variant !== undefined) data.variant = variant || null;
  if (color !== undefined) data.color = color || null;
  if (year !== undefined) data.year = Number(year) || new Date().getFullYear();
  if (status !== undefined) data.status = status;
  if (listPrice !== undefined) data.listPrice = listPrice !== "" ? Number(listPrice) : 0;
  if (floorPrice !== undefined) data.floorPrice = floorPrice !== "" ? Number(floorPrice) : 0;
  if (image !== undefined) data.image = image;
  if (bankStatus !== undefined) data.bankStatus = bankStatus;
  if (plateStatus !== undefined) data.plateStatus = plateStatus;
  if (plateCost !== undefined) data.plateCost = Number(plateCost);
  if (accessoriesJson !== undefined) data.accessoriesJson = accessoriesJson;
  if (notes !== undefined) data.notes = notes;
  if (warehouse !== undefined) data.warehouse = warehouse;
  if (saleType !== undefined) data.saleType = saleType;

  return data;
}

export function calculateUpdatedVehicleAmounts(
  current: Vehicle,
  data: Prisma.VehicleUncheckedUpdateInput,
) {
  const listPrice = data.listPrice !== undefined ? Number(data.listPrice) : Number(current.listPrice);
  const plateCost = data.plateCost !== undefined ? Number(data.plateCost) : Number(current.plateCost || 0);
  const accessories = parseItemArray(data.accessoriesJson ?? current.accessoriesJson);
  const accessoriesCost = accessoryTotal(accessories);
  const totalAmount = listPrice + plateCost + accessoriesCost;
  const debtAmount = totalAmount - Number(current.paidAmount);
  return { accessories, accessoriesCost, debtAmount };
}

export function normalizeCancelledVin(current: Vehicle, data: Prisma.VehicleUncheckedUpdateInput) {
  const nextStatus = String(data.status ?? current.status);
  if (nextStatus !== "CANCELLED") return;
  const targetVin = String(data.vin ?? current.vin);
  if (!targetVin.startsWith("CANCELLED-")) {
    data.vin = `CANCELLED-${current.id}-${targetVin}`;
  }
}

export async function adjustCustomerVehicleBalances(
  tx: Tx,
  current: Vehicle,
  updated: Vehicle,
  newDebtAmount: number,
) {
  const wasActive = ["RESERVED", "SOLD"].includes(current.status);
  const isNowActive = ["RESERVED", "SOLD"].includes(updated.status);
  const oldDebt = Number(current.debtAmount);
  const oldPaid = Number(current.paidAmount);
  const newPaid = Number(updated.paidAmount);

  if (current.customerId !== updated.customerId) {
    if (current.customerId && wasActive) {
      await tx.customer.update({
        where: { id: current.customerId },
        data: { totalDebt: { decrement: oldDebt }, totalSpent: { decrement: oldPaid } },
      });
    }
    if (updated.customerId && isNowActive) {
      await tx.customer.update({
        where: { id: updated.customerId },
        data: { totalDebt: { increment: newDebtAmount }, totalSpent: { increment: newPaid } },
      });
    }
    return;
  }

  if (!updated.customerId) return;
  let debtChange = 0;
  let spentChange = 0;
  if (!wasActive && isNowActive) {
    debtChange = newDebtAmount;
    spentChange = newPaid;
  } else if (wasActive && !isNowActive) {
    debtChange = -oldDebt;
    spentChange = -oldPaid;
  } else if (wasActive && isNowActive) {
    debtChange = newDebtAmount - oldDebt;
    spentChange = newPaid - oldPaid;
  }

  if (debtChange !== 0 || spentChange !== 0) {
    await tx.customer.update({
      where: { id: updated.customerId },
      data: {
        totalDebt: { increment: debtChange },
        totalSpent: { increment: spentChange },
      },
    });
  }
}

export async function syncAccessoryExportOrder(options: {
  tx: Tx;
  vehicle: Vehicle;
  accessories: any[];
  accessoriesCost: number;
  fallbackBranchId: number | null;
}) {
  const { tx, vehicle, accessories, accessoriesCost, fallbackBranchId } = options;
  const existing = await tx.inventoryOrder.findFirst({
    where: {
      vehicleId: vehicle.id,
      createdBy: "Hệ thống (Bán Xe)",
      type: "EXPORT_RETAIL",
    },
  });

  if (accessories.length === 0) {
    if (!existing || existing.status !== "PENDING") return null;
    const cancelled = await tx.inventoryOrder.update({
      where: { id: existing.id },
      data: { status: "CANCELLED", reason: `${existing.reason} | Hủy do xóa hết phụ kiện` },
    });
    return cancelled.branchId;
  }

  if (!existing) {
    const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const created = await tx.inventoryOrder.create({
      data: {
        code: `PKX-${date}-${random}`,
        customerId: vehicle.customerId,
        type: "EXPORT_RETAIL",
        totalAmount: accessoriesCost,
        paidAmount: accessoriesCost,
        debtAmount: 0,
        status: "PENDING",
        reason: `Xuất phụ kiện bán kèm xe VIN: ${vehicle.vin}`,
        vehicleId: vehicle.id,
        branchId: vehicle.branchId || fallbackBranchId,
        createdBy: "Hệ thống (Bán Xe)",
      },
    });
    return created.branchId;
  }

  if (existing.status === "PAID") return null;
  const updated = await tx.inventoryOrder.update({
    where: { id: existing.id },
    data: {
      status: "PENDING",
      totalAmount: accessoriesCost,
      paidAmount: accessoriesCost,
      customerId: vehicle.customerId,
    },
  });
  return updated.branchId;
}

export async function syncGiftRequisition(options: {
  tx: Tx;
  vehicle: Vehicle;
  giftItemsJson: unknown;
  fallbackBranchId: number | null;
}) {
  const { tx, vehicle, giftItemsJson, fallbackBranchId } = options;
  if (giftItemsJson === undefined) return null;
  const giftItems = parseItemArray(giftItemsJson || "[]");
  const requisitions = await tx.partsRequisition.findMany({
    where: { vehicleId: vehicle.id, reason: { contains: "tặng phụ tùng", mode: "insensitive" } },
    include: { items: true },
  });
  if (requisitions.some((item) => ["APPROVED", "REJECTED"].includes(item.status))) return null;

  const existing = requisitions.find((item) => item.status === "PENDING");
  if (giftItems.length === 0) {
    if (!existing) return null;
    await tx.partsRequisition.update({ where: { id: existing.id }, data: { status: "CANCELLED" } });
    for (const item of existing.items) {
      await tx.productBranch.updateMany({
        where: { productId: item.productId, branchId: existing.branchId },
        data: { reservedStock: { decrement: item.quantity } },
      });
    }
    return existing.branchId;
  }

  if (existing) {
    for (const item of existing.items) {
      await tx.productBranch.updateMany({
        where: { productId: item.productId, branchId: existing.branchId },
        data: { reservedStock: { decrement: item.quantity } },
      });
    }
    await tx.partsRequisitionItem.deleteMany({ where: { requisitionId: existing.id } });
    await tx.partsRequisition.update({
      where: { id: existing.id },
      data: {
        items: {
          create: giftItems.map((item) => ({
            productId: Number(item.productId || item.id),
            quantity: Number(item.quantity),
          })),
        },
      },
    });
  }

  const branchId = existing?.branchId || vehicle.branchId || fallbackBranchId;
  if (!branchId) throw new Error("Không xác định được chi nhánh cho phiếu quà tặng");
  if (!existing) {
    await tx.partsRequisition.create({
      data: {
        branchId,
        status: "PENDING",
        reason: `Quà tặng phụ tùng bán xe VIN: ${vehicle.vin}`,
        vehicleId: vehicle.id,
        createdBy: "Hệ thống (Bán Xe)",
        items: {
          create: giftItems.map((item) => ({
            productId: Number(item.productId || item.id),
            quantity: Number(item.quantity),
          })),
        },
      },
    });
  }

  for (const item of giftItems) {
    await tx.productBranch.updateMany({
      where: { productId: Number(item.productId || item.id), branchId },
      data: { reservedStock: { increment: Number(item.quantity) || 1 } },
    });
  }
  return branchId;
}
