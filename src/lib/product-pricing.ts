export const PART_PRICE_TYPES = ["RETAIL", "DEALER", "DISTRIBUTOR", "TECHNICIAN", "INSURANCE"] as const;
export type PartPriceType = typeof PART_PRICE_TYPES[number];
export type CompatiblePartPriceType = PartPriceType | "WHOLESALE";

export function resolveAccessoryPriceType(accessories: unknown): PartPriceType {
  const list = Array.isArray(accessories) ? accessories : [];
  const found = list
    .map((a: any) => a?.priceType)
    .find((t: any) => typeof t === "string" && (PART_PRICE_TYPES as readonly string[]).includes(t));
  return (found as PartPriceType) || "RETAIL";
}

// Bộ nhãn dùng chung cho mọi dropdown "loại giá" ở phía client.
export const PART_PRICE_TYPE_OPTIONS: { value: PartPriceType; label: string }[] = [
  { value: "RETAIL", label: "Giá lẻ" },
  { value: "DEALER", label: "Giá đại lý" },
  { value: "DISTRIBUTOR", label: "Giá phân phối" },
  { value: "TECHNICIAN", label: "Giá thợ" },
  { value: "INSURANCE", label: "Giá bảo hiểm" },
];

type PricedProduct = {
  name?: string;
  prices?: { type: string; amount: unknown }[];
};

export function normalizePartPriceType(type: string): PartPriceType {
  const normalized = type === "WHOLESALE" ? "DEALER" : type;
  if (!PART_PRICE_TYPES.includes(normalized as PartPriceType)) {
    throw new Error(`Loại giá phụ tùng không hợp lệ: ${type}`);
  }
  return normalized as PartPriceType;
}

export function findProductPrice(product: PricedProduct, type: string, fallbackToRetail = true) {
  const normalized = normalizePartPriceType(type);
  const prices = product.prices || [];
  return prices.find((price) => price.type === normalized)
    ?? (normalized === "DEALER" ? prices.find((price) => price.type === "WHOLESALE") : undefined)
    ?? (fallbackToRetail ? prices.find((price) => price.type === "RETAIL") : undefined);
}

// Blank means use the price list; an explicit 0 is a valid agreed price.
export function resolvePartUnitPrice(
  product: PricedProduct,
  type: string,
  override?: unknown,
) {
  normalizePartPriceType(type);
  const hasOverride = override !== undefined && override !== null && override !== "";
  const value = hasOverride ? override : findProductPrice(product, type)?.amount;
  if (value === undefined || value === null || value === "") {
    throw new Error(`Chưa có giá ${type} hoặc giá bán lẻ cho phụ tùng ${product.name || "đã chọn"}`);
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > 10_000_000_000) {
    throw new Error("Đơn giá phụ tùng phải từ 0 đến 10.000.000.000 đ");
  }
  return amount;
}

export function resolveRequisitionUnitPrice(
  product: PricedProduct,
  metadata?: { priceType?: string; unitPrice?: unknown; customUnitPrice?: unknown },
) {
  return resolvePartUnitPrice(
    product,
    metadata?.priceType || "RETAIL",
    metadata?.unitPrice ?? metadata?.customUnitPrice,
  );
}
