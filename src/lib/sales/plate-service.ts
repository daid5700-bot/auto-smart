import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api-response";
export { calculatePlateServiceProfit } from "@/lib/sales/plate-service-profit";

type Tx = Prisma.TransactionClient;

type LockedProductBranch = {
  id: number;
  stockCount: Prisma.Decimal;
  movingAvgCost: Prisma.Decimal;
  sku: string;
  name: string;
};

async function lockProductBranch(
  tx: Tx,
  branchId: number,
  productId: number,
) {
  const rows = await tx.$queryRaw<LockedProductBranch[]>(Prisma.sql`
    SELECT
      pb."id",
      pb."stockCount",
      pb."movingAvgCost",
      p."sku",
      p."name"
    FROM "ProductBranch" pb
    JOIN "Product" p ON p."id" = pb."productId"
    WHERE pb."branchId" = ${branchId}
      AND pb."productId" = ${productId}
      AND p."status" = 'ACTIVE'
      AND p."isDeleted" = false
    FOR UPDATE OF pb
  `);

  const productBranch = rows[0];
  if (!productBranch) {
    throw new ApiError(
      "Phụ tùng ốp biển không tồn tại trong kho của cơ sở hiện tại.",
      400,
      "PLATE_FRAME_NOT_IN_BRANCH",
    );
  }
  return productBranch;
}

export async function exportPlateFrame(
  tx: Tx,
  options: {
    branchId: number;
    productId: number;
    quantity: number;
  },
) {
  const productBranch = await lockProductBranch(
    tx,
    options.branchId,
    options.productId,
  );
  const stockCount = Number(productBranch.stockCount);
  if (stockCount < options.quantity) {
    throw new ApiError(
      `Phụ tùng [${productBranch.sku}] ${productBranch.name} không đủ tồn kho (cần ${options.quantity}, hiện có ${stockCount}).`,
      400,
      "PLATE_FRAME_OUT_OF_STOCK",
    );
  }

  await tx.productBranch.update({
    where: { id: productBranch.id },
    data: { stockCount: { decrement: options.quantity } },
  });

  const unitCost = Number(productBranch.movingAvgCost || 0);
  return {
    unitCost,
    totalCost: unitCost * options.quantity,
    sku: productBranch.sku,
    name: productBranch.name,
  };
}

export async function restorePlateFrame(
  tx: Tx,
  options: {
    branchId: number;
    productId: number;
    quantity: number;
  },
) {
  if (options.quantity <= 0) return;
  const productBranch = await lockProductBranch(
    tx,
    options.branchId,
    options.productId,
  );
  await tx.productBranch.update({
    where: { id: productBranch.id },
    data: { stockCount: { increment: options.quantity } },
  });
}

export function serializePlateService(service: any) {
  return {
    id: service.id,
    vehicleId: service.vehicleId,
    branchId: service.branchId,
    registrationNumber: service.registrationNumber,
    dossierCode: service.dossierCode,
    plateNumber: service.plateNumber,
    totalRevenue: Number(service.totalRevenue || 0),
    registrationTax: Number(service.registrationTax || 0),
    plateFee: Number(service.plateFee || 0),
    policeFee: Number(service.policeFee || 0),
    plateFrameProductId: service.plateFrameProductId,
    plateFrameQuantity: Number(service.plateFrameQuantity || 0),
    plateFrameUnitCost: Number(service.plateFrameUnitCost || 0),
    plateFrameTotalCost: Number(service.plateFrameTotalCost || 0),
    profit: Number(service.profit || 0),
    status: service.status,
    notes: service.notes,
    completedAt: service.completedAt,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
    vehicle: service.vehicle
      ? {
          id: service.vehicle.id,
          vin: service.vehicle.vin,
          model: service.vehicle.model,
          variant: service.vehicle.variant,
          color: service.vehicle.color,
          customer: service.vehicle.customer
            ? {
                id: service.vehicle.customer.id,
                name: service.vehicle.customer.name,
                phone: service.vehicle.customer.phone,
              }
            : null,
        }
      : null,
    plateFrameProduct: service.plateFrameProduct
      ? {
          id: service.plateFrameProduct.id,
          sku: service.plateFrameProduct.sku,
          name: service.plateFrameProduct.name,
        }
      : null,
  };
}
