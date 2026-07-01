import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("vi-VN").format(num);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(date));
}

export function normalizePhone(phone: string): string {
  let c = phone.replace(/\D/g, "");
  if (c.startsWith("0")) c = "84" + c.substring(1);
  if (!c.startsWith("84")) c = "84" + c;
  return c;
}

const STATUS_MAP: Record<string, { text: string; badge: string }> = {
  ACTIVE: { text: "Hoạt động", badge: "badge-success" },
  INACTIVE: { text: "Ngừng", badge: "badge-danger" },
  PENDING: { text: "Chờ tiếp nhận", badge: "badge-warning" },
  DIAGNOSING: { text: "Chẩn đoán", badge: "badge-info" },
  DOING: { text: "Đang sửa", badge: "badge-purple" },
  WAITING_PARTS: { text: "Chờ phụ tùng", badge: "badge-warning" },
  DONE: { text: "Hoàn thành", badge: "badge-success" },
  DELIVERED: { text: "Đã giao", badge: "badge-success" },
  AVAILABLE: { text: "Sẵn sàng", badge: "badge-success" },
  RESERVED: { text: "Đã đặt", badge: "badge-warning" },
  INCOMING: { text: "Đang về", badge: "badge-info" },
  SOLD: { text: "Đã bán", badge: "badge-success" },
  NEW: { text: "Mới", badge: "badge-primary" },
  CONSULTING: { text: "Đang tư vấn", badge: "badge-warning" },
  POTENTIAL: { text: "Tiềm năng", badge: "badge-purple" },
  CONVERTED: { text: "Đã mua", badge: "badge-success" },
  LOST: { text: "Mất", badge: "badge-danger" },
  IDLE: { text: "Đang rảnh", badge: "badge-success" },
  WORKING: { text: "Đang làm", badge: "badge-warning" },
  SENT: { text: "Đã gửi", badge: "badge-primary" },
  FAILED: { text: "Thất bại", badge: "badge-danger" },
};

export function statusText(s: string) { return STATUS_MAP[s]?.text ?? s; }
export function statusBadge(s: string) { return STATUS_MAP[s]?.badge ?? "badge-primary"; }

export function getPriceForCustomer(product: any, customerType: string) {
  const prices = product.prices || [];
  if (customerType === "Đại lý") {
    const wholesale = prices.find((p: any) => p.type === "WHOLESALE");
    if (wholesale) return Number(wholesale.amount);
  }
  const retail = prices.find((p: any) => p.type === "RETAIL");
  return retail ? Number(retail.amount) : 0;
}

export function getFinalPrice(product: any, customerType: string, overridePrice?: number | null) {
  if (overridePrice !== undefined && overridePrice !== null) {
    return overridePrice;
  }
  return getPriceForCustomer(product, customerType);
}

export function checkStockWarning(product: any) {
  if (product.stockCount < product.stockMin) {
    return "LOW_STOCK_WARNING";
  }
  return "OK";
}

export function checkSlowMoving(product: any) {
  const referenceDate = product.lastImportDate || product.createdAt || new Date();
  const diffTime = Math.abs(new Date().getTime() - new Date(referenceDate).getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays >= 90) {
    return "SLOW_MOVING";
  }
  return "OK";
}

export function calculatePoints(totalAmount: number, ratePercent: number) {
  return Math.floor((totalAmount * ratePercent / 100));
}

export function redeemPoints(points: number, currentBill: number) {
  const discount = points;
  const finalBill = Math.max(0, currentBill - discount);
  const remainingPoints = 0;
  return { finalBill, remainingPoints };
}

export function calculateNextOilChange(lastOilChangeDate: Date, intervalMonths: number) {
  const nextDate = new Date(lastOilChangeDate);
  nextDate.setMonth(nextDate.getMonth() + intervalMonths);
  return nextDate;
}

export function exportToCsv(filename: string, headers: string[], rows: string[][]) {
  const csvContent = "\uFEFF" + [
    headers.join(","),
    ...rows.map(row => row.map(val => `"${(val || "").replace(/"/g, '""')}"`).join(","))
  ].join("\n");
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const handleNumericInputChange = (
  e: React.ChangeEvent<HTMLInputElement>,
  onChange: (cleanedValue: string) => void
) => {
  const input = e.target;
  const originalValue = input.value;
  const selectionStart = input.selectionStart;

  // Clean value (only keep digits)
  const cleanValue = originalValue.replace(/\D/g, "");
  
  // Format the cleaned value
  const formattedValue = cleanValue === "" ? "" : Number(cleanValue).toLocaleString("vi-VN");

  // Calculate the new cursor position
  const cleanCharsBefore = originalValue.slice(0, selectionStart || 0).replace(/\D/g, "").length;

  let newSelectionStart = 0;
  let digitCount = 0;
  while (newSelectionStart < formattedValue.length && digitCount < cleanCharsBefore) {
    if (/\d/.test(formattedValue[newSelectionStart])) {
      digitCount++;
    }
    newSelectionStart++;
  }

  // Update state with clean value
  onChange(cleanValue);

  // Restore selection start in the next animation frame
  requestAnimationFrame(() => {
    input.setSelectionRange(newSelectionStart, newSelectionStart);
  });
};

export interface ServiceItem {
  name: string;
  cost: number;
}

export interface SymptomsData {
  summary: string;
  services: ServiceItem[];
  serviceDiscountPercent: number;
  partsDiscountPercent: number;
}

export function parseSymptoms(symptomsStr: string | null | undefined): SymptomsData {
  const defaultVal: SymptomsData = {
    summary: "",
    services: [],
    serviceDiscountPercent: 0,
    partsDiscountPercent: 0,
  };
  if (!symptomsStr) return defaultVal;
  try {
    const parsed = JSON.parse(symptomsStr);
    if (parsed && typeof parsed === "object") {
      return {
        summary: parsed.summary || "",
        services: Array.isArray(parsed.services) ? parsed.services : [],
        serviceDiscountPercent: Number(parsed.serviceDiscountPercent) || 0,
        partsDiscountPercent: Number(parsed.partsDiscountPercent) || 0,
      };
    }
  } catch {
    // Treat as raw text for backward compatibility
    return {
      summary: symptomsStr,
      services: [],
      serviceDiscountPercent: 0,
      partsDiscountPercent: 0,
    };
  }
  return defaultVal;
}

