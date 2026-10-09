import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

const workshopNew = source("src/app/(dashboard)/workshop/new/page.tsx");
assert.match(workshopNew, /<DiscountPicker/);
assert.match(workshopNew, /discountCodeId:\s*selectedDiscount\?\.id/);
assert.match(workshopNew, /services:\s*activeServices\.map/);

const workshopRequisitionsApi = source("src/app/api/workshop/requisitions/route.ts");
assert.match(workshopRequisitionsApi, /priceByProductId/);
assert.match(workshopRequisitionsApi, /unitPrice:\s*priceByProductId\.get/);

const requisitionsApproval = source("src/app/(dashboard)/inventory/requisitions/page.tsx");
assert.match(requisitionsApproval, /item\.unitPrice \?\?/);

const workshopHistory = source("src/app/(dashboard)/workshop/history/page.tsx");
assert.match(workshopHistory, /view=history/);
assert.match(workshopHistory, /AbortController/);
assert.match(workshopHistory, /openOrderDetail/);

const inventoryHistory = source("src/app/(dashboard)/inventory/history/page.tsx");
const inventoryMovements = source("src/app/api/inventory/movements/route.ts");
// Return movements must remain a separate receipt, not be merged with the original export.
for (const text of [inventoryHistory, inventoryMovements]) {
  assert.ok(text.includes('key = `ORDER-${m.inventoryOrder.id}-${m.type}`'));
}
assert.match(inventoryHistory, /<CancelInventoryOrderButton/);
assert.match(inventoryHistory, /<InventoryCancellationNotice/);
assert.doesNotMatch(inventoryHistory, /PHIẾU ĐÃ HỦY — ĐÃ HOÀN KHO/);
assert.match(source("src/app/(dashboard)/inventory/orders/page.tsx"), /<CancelInventoryOrderButton/);
const cancelButton = source("src/components/CancelInventoryOrderButton.tsx");
assert.match(cancelButton, /Dialog\.Title/);
assert.match(cancelButton, /refundConfirmed/);
assert.match(cancelButton, /expectedPaidAmount: paidAmount/);
assert.match(cancelButton, /không tự chuyển tiền/);
assert.match(source("src/app/api/inventory/orders/[id]/cancel/route.ts"), /requireAuth\(req, \["ADMIN", "WAREHOUSE"\]\)/);
assert.match(source("src/app/api/inventory/orders/[id]/payment/route.ts"), /ORDER_CANCELLED/);

const salesNew = source("src/app/(dashboard)/sales/documents/new/page.tsx");
assert.ok(salesNew.includes('fetch("/api/sales/wholesale"'));
assert.doesNotMatch(salesNew, /for \(const wv of wholesaleVehicles\)/);

const discountManager = source("src/components/discounts/DiscountManager.tsx");
assert.match(discountManager, /const PAGE_SIZE = 20/);
assert.match(discountManager, /limit:\s*String\(PAGE_SIZE\)/);
assert.match(discountManager, /AbortController/);
assert.match(discountManager, /totalPages/);

console.log("UI feature wiring checks passed.");
