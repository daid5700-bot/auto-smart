import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export type ReturnSourceItem = {
  productId: number;
  quantity: number;
  unitCost?: number | null;
};

export type ReturnMovementLike = {
  type: string;
  reason?: string | null;
};

export function aggregateReturnItems(items: ReturnSourceItem[]): ReturnSourceItem[] {
  const grouped = new Map<number, ReturnSourceItem>();

  for (const item of items) {
    const productId = Number(item.productId);
    const quantity = Number(item.quantity);
    if (!productId || !Number.isFinite(quantity) || quantity <= 0) continue;

    const existing = grouped.get(productId);
    if (existing) {
      existing.quantity += quantity;
      if ((existing.unitCost === undefined || existing.unitCost === null) && item.unitCost !== undefined) {
        existing.unitCost = item.unitCost;
      }
    } else {
      grouped.set(productId, {
        productId,
        quantity,
        unitCost: item.unitCost ?? 0,
      });
    }
  }

  return Array.from(grouped.values());
}

export function hasReturnMovement(movements: ReturnMovementLike[], reason: string) {
  return movements.some((movement) => movement.type === "IMPORT" && movement.reason === reason);
}

export async function releaseReservedStock(
  tx: Tx,
  branchId: number,
  items: ReturnSourceItem[],
) {
  const aggregatedItems = aggregateReturnItems(items);

  for (const item of aggregatedItems) {
    await tx.productBranch.updateMany({
      where: { productId: item.productId, branchId },
      data: { reservedStock: { decrement: item.quantity } },
    });
  }
}

export async function restoreStockOnce(
  tx: Tx,
  params: {
    branchId: number;
    items: ReturnSourceItem[];
    reason: string;
    createdBy: string;
    relatedRoId?: number;
    inventoryOrderId?: number;
  },
) {
  const existingReturn = await tx.stockMovement.findFirst({
    where: {
      type: "IMPORT",
      reason: params.reason,
      ...(params.relatedRoId !== undefined ? { relatedRoId: params.relatedRoId } : {}),
      ...(params.inventoryOrderId !== undefined ? { inventoryOrderId: params.inventoryOrderId } : {}),
    },
  });

  if (existingReturn) {
    return { restored: false, quantity: 0 };
  }

  const aggregatedItems = aggregateReturnItems(params.items);
  let restoredQuantity = 0;

  for (const item of aggregatedItems) {
    const unitCost = Number(item.unitCost || 0);

    await tx.productBranch.updateMany({
      where: { productId: item.productId, branchId: params.branchId },
      data: { stockCount: { increment: item.quantity } },
    });

    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        branchId: params.branchId,
        type: "IMPORT",
        quantity: item.quantity,
        unitCost,
        totalCost: unitCost * item.quantity,
        reason: params.reason,
        relatedRoId: params.relatedRoId,
        inventoryOrderId: params.inventoryOrderId,
        createdBy: params.createdBy,
      },
    });

    restoredQuantity += item.quantity;
  }

  return { restored: restoredQuantity > 0, quantity: restoredQuantity };
}
