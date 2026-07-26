import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api-response";

type TransactionClient = Prisma.TransactionClient;

export interface WorkshopServiceLine {
  name: string;
  cost: number;
}

export interface WorkshopRequestedItem {
  productId: number;
  quantity: number;
}

export interface WorkshopPricedItem extends WorkshopRequestedItem {
  unitPrice: number;
}

export function calculateWorkshopLaborCost(services: WorkshopServiceLine[]) {
  return services.reduce((total, service) => total + Math.round(Number(service.cost) || 0), 0);
}

export function buildWorkshopSymptoms(
  symptoms: string | null | undefined,
  services: WorkshopServiceLine[],
) {
  let summary = "";
  try {
    const parsed = symptoms ? JSON.parse(symptoms) : null;
    if (parsed && typeof parsed === "object" && typeof parsed.summary === "string") {
      summary = parsed.summary.trim();
    }
  } catch {
    summary = symptoms?.trim() || "";
  }

  return JSON.stringify({
    summary: summary || services.map((service) => service.name).join(", "),
    services: services.map((service) => ({
      name: service.name,
      cost: Math.round(Number(service.cost) || 0),
    })),
    serviceDiscountPercent: 0,
    partsDiscountPercent: 0,
  });
}

export async function resolveWorkshopItemPrices(
  tx: TransactionClient,
  branchId: number,
  requestedItems: WorkshopRequestedItem[],
): Promise<WorkshopPricedItem[]> {
  if (requestedItems.length === 0) return [];

  const productIds = requestedItems.map((item) => Number(item.productId));
  if (new Set(productIds).size !== productIds.length) {
    throw new ApiError(
      "Mỗi phụ tùng chỉ được xuất hiện một lần trong lệnh sửa chữa.",
      400,
      "DUPLICATE_WORKSHOP_PRODUCT",
    );
  }

  const products = await tx.product.findMany({
    where: {
      id: { in: productIds },
      status: "ACTIVE",
      isDeleted: false,
      productBranches: { some: { branchId } },
    },
    select: {
      id: true,
      sku: true,
      name: true,
      prices: {
        where: { type: "RETAIL" },
        select: { amount: true },
        take: 1,
      },
    },
  });

  const productsById = new Map(products.map((product) => [product.id, product]));
  return requestedItems.map((item) => {
    const product = productsById.get(Number(item.productId));
    if (!product) {
      throw new ApiError(
        `Phụ tùng ID ${item.productId} không tồn tại hoặc không thuộc cơ sở hiện tại.`,
        400,
        "WORKSHOP_PRODUCT_NOT_AVAILABLE",
      );
    }
    if (!product.prices[0]) {
      throw new ApiError(
        `Phụ tùng [${product.sku}] ${product.name} chưa có giá bán lẻ.`,
        400,
        "WORKSHOP_PRODUCT_PRICE_MISSING",
      );
    }

    return {
      productId: product.id,
      quantity: Number(item.quantity),
      unitPrice: Math.round(Number(product.prices[0].amount)),
    };
  });
}
