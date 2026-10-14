import assert from "node:assert/strict";
import { test } from "node:test";
import { findProductPrice, resolvePartUnitPrice, resolveRequisitionUnitPrice } from "@/lib/product-pricing";
import { createInventoryOrderSchema, parseProductPrices, requisitionPricingItemsSchema } from "@/lib/validation/inventory";
import { getPriceForCustomer } from "@/lib/utils";

const product = {
  name: "Lọc dầu",
  prices: [
    { type: "RETAIL", amount: 180_000 },
    { type: "WHOLESALE", amount: 155_000 },
  ],
};

test("old wholesale data resolves as dealer pricing before migration", () => {
  assert.equal(resolvePartUnitPrice(product, "DEALER"), 155_000);
  assert.equal(resolvePartUnitPrice(product, "WHOLESALE"), 155_000);
  assert.equal(getPriceForCustomer(product, "Đại lý"), 155_000);
});

test("explicit dealer pricing takes priority over a legacy wholesale price", () => {
  const current = { prices: [...product.prices, { type: "DEALER", amount: 160_000 }] };
  assert.equal(resolvePartUnitPrice(current, "WHOLESALE"), 160_000);
});

test("unset distributor/technician prices use retail; catalog still shows unset", () => {
  assert.equal(resolvePartUnitPrice(product, "DISTRIBUTOR"), 180_000);
  assert.equal(resolvePartUnitPrice(product, "TECHNICIAN"), 180_000);
  assert.equal(findProductPrice(product, "TECHNICIAN", false), undefined);
});

test("configured distributor and technician prices are used", () => {
  const current = { prices: [...product.prices,
    { type: "DISTRIBUTOR", amount: 140_000 },
    { type: "TECHNICIAN", amount: 145_000 },
  ] };
  assert.equal(resolvePartUnitPrice(current, "DISTRIBUTOR"), 140_000);
  assert.equal(resolvePartUnitPrice(current, "TECHNICIAN"), 145_000);
});

test("blank/null overrides use the price list, while an explicit 0 stays 0", () => {
  for (const blank of [undefined, null, ""]) assert.equal(resolvePartUnitPrice(product, "DEALER", blank), 155_000);
  assert.equal(resolvePartUnitPrice(product, "DEALER", 0), 0);
  assert.equal(resolvePartUnitPrice({ prices: [{ type: "TECHNICIAN", amount: 0 }] }, "TECHNICIAN"), 0);
});

test("missing prices and invalid amounts fail instead of silently selling for 0", () => {
  assert.throws(() => resolvePartUnitPrice({ name: "Không có giá" }, "DEALER"), /Chưa có giá/);
  for (const invalid of [-1, NaN, Infinity, "abc", 10_000_000_001]) {
    assert.throws(() => resolvePartUnitPrice(product, "RETAIL", invalid), /Đơn giá/);
  }
  assert.throws(() => resolvePartUnitPrice(product, "INVALID", 0), /Loại giá/);
});

test("approval preserves agreed price snapshots even if the price list changes", () => {
  assert.equal(resolveRequisitionUnitPrice(product, { priceType: "TECHNICIAN", unitPrice: 130_000 }), 130_000);
  assert.equal(resolveRequisitionUnitPrice(product, { unitPrice: 0, customUnitPrice: 100_000 }), 0);
});

test("approval of legacy pending requests respects WHOLESALE/DEALER and overrides", () => {
  assert.equal(resolveRequisitionUnitPrice(product, { priceType: "WHOLESALE" }), 155_000);
  assert.equal(resolveRequisitionUnitPrice(product, { priceType: "DEALER", customUnitPrice: 123_000 }), 123_000);
  assert.equal(resolveRequisitionUnitPrice(product, { customUnitPrice: 0 }), 0);
  assert.equal(resolveRequisitionUnitPrice(product), 180_000);
});

test("new and legacy price writes synchronize the compatibility alias", () => {
  for (const type of ["DEALER", "WHOLESALE"]) {
    assert.deepEqual(parseProductPrices([{ type, amount: "155000" }]), [
      { type: "DEALER", amount: 155_000 }, { type: "WHOLESALE", amount: 155_000 },
    ]);
  }
  assert.equal(parseProductPrices(undefined), undefined);
  assert.deepEqual(parseProductPrices([]), []);
});

test("a payload with both old/new keys preserves explicit dealer pricing", () => {
  assert.deepEqual(parseProductPrices([
    { type: "WHOLESALE", amount: 100 }, { type: "DEALER", amount: 200 },
  ]), [{ type: "DEALER", amount: 200 }, { type: "WHOLESALE", amount: 200 }]);
});

test("invalid catalog prices are rejected before product/stock writes", () => {
  for (const amount of [-1, null, "", " ", "abc", Infinity, 10_000_000_001]) {
    assert.throws(() => parseProductPrices([{ type: "DEALER", amount }]));
  }
  assert.throws(() => parseProductPrices([{ type: "UNKNOWN", amount: 1 }]));
  assert.throws(() => parseProductPrices([
    { type: "RETAIL", amount: 1 }, { type: "RETAIL", amount: 2 },
  ]));
});

test("requisitions reject invalid quantities, prices, and duplicate products", () => {
  const item = { productId: 1, quantity: 1, priceType: "DEALER" };
  assert.equal(requisitionPricingItemsSchema.parse([item])[0].customUnitPrice, undefined);
  for (const quantity of [0, -1, Infinity]) assert.throws(() => requisitionPricingItemsSchema.parse([{ ...item, quantity }]));
  assert.throws(() => requisitionPricingItemsSchema.parse([item, item]));
  assert.throws(() => requisitionPricingItemsSchema.parse([{ ...item, customUnitPrice: -1 }]));
});

test("an export cannot turn an empty price input into a free item", () => {
  const order = { type: "INTERNAL", items: [{ productId: 1, quantity: 1, unitPrice: "" }] };
  assert.throws(() => createInventoryOrderSchema.parse(order));
  assert.equal(createInventoryOrderSchema.parse({ ...order, items: [{ ...order.items[0], unitPrice: 0 }] }).items[0].unitPrice, 0);
});
