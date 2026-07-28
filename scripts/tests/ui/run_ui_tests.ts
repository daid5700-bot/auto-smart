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

const workshopHistory = source("src/app/(dashboard)/workshop/history/page.tsx");
assert.match(workshopHistory, /view=history/);
assert.match(workshopHistory, /AbortController/);
assert.match(workshopHistory, /openOrderDetail/);

const salesNew = source("src/app/(dashboard)/sales/documents/new/page.tsx");
assert.ok(salesNew.includes('fetch("/api/sales/wholesale"'));
assert.doesNotMatch(salesNew, /for \(const wv of wholesaleVehicles\)/);

const discountManager = source("src/components/discounts/DiscountManager.tsx");
assert.match(discountManager, /const PAGE_SIZE = 20/);
assert.match(discountManager, /limit:\s*String\(PAGE_SIZE\)/);
assert.match(discountManager, /AbortController/);
assert.match(discountManager, /totalPages/);

console.log("UI feature wiring checks passed.");
