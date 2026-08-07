import assert from "node:assert/strict";
import { calculateDiscountAmount } from "@/lib/discounts";
import {
  buildWorkshopSymptoms,
  calculateWorkshopLaborCost,
  resolveWorkshopItemPrices,
} from "@/lib/workshop/pricing";

async function main() {
  const services = [
    { name: "Thay dầu", cost: 150_000 },
    { name: "Vệ sinh kim phun", cost: 250_000 },
  ];
  assert.equal(calculateWorkshopLaborCost(services), 400_000);

  const symptoms = JSON.parse(buildWorkshopSymptoms(
    JSON.stringify({
      summary: "Xe khó nổ",
      serviceDiscountPercent: 100,
      partsDiscountPercent: 100,
    }),
    services,
  ));
  assert.equal(symptoms.summary, "Xe khó nổ");
  assert.equal(symptoms.serviceDiscountPercent, 0);
  assert.equal(symptoms.partsDiscountPercent, 0);
  assert.deepEqual(symptoms.services, services);

  assert.equal(
    calculateDiscountAmount(
    {
      discountType: "PERCENTAGE",
      target: "SERVICE",
      value: 10,
      maxDiscountAmount: null,
    },
    { subtotal: 900_000, serviceSubtotal: 400_000, partsSubtotal: 500_000 },
  ),
  40_000,
  );
  assert.equal(
    calculateDiscountAmount(
    {
      discountType: "FIXED_AMOUNT",
      target: "ORDER",
      value: 2_000_000,
      maxDiscountAmount: null,
    },
    { subtotal: 900_000 },
  ),
  900_000,
  );

  const fakeTx = {
    product: {
      findMany: async () => [{
        id: 7,
        sku: "PT-007",
        name: "Lọc dầu",
        prices: [{ amount: 125_000 }],
      }],
    },
  };
  const pricedItems = await resolveWorkshopItemPrices(
    fakeTx as any,
    1,
    [{ productId: 7, quantity: 2 }],
  );
  assert.deepEqual(pricedItems, [{ productId: 7, quantity: 2, unitPrice: 125_000 }]);

  // The customer-facing price is allowed to be explicitly overridden,
  // including 0 for a warranty/goodwill repair.
  const zeroPriceItems = await resolveWorkshopItemPrices(
    fakeTx as any,
    1,
    [{ productId: 7, quantity: 2, unitPrice: 0 }],
  );
  assert.deepEqual(zeroPriceItems, [{ productId: 7, quantity: 2, unitPrice: 0 }]);

  const quotedPriceItems = await resolveWorkshopItemPrices(
    fakeTx as any,
    1,
    [{ productId: 7, quantity: 2, unitPrice: 89_500 }],
  );
  assert.deepEqual(quotedPriceItems, [{ productId: 7, quantity: 2, unitPrice: 89_500 }]);

  await assert.rejects(
    () => resolveWorkshopItemPrices(
      fakeTx as any,
      1,
      [
        { productId: 7, quantity: 1 },
        { productId: 7, quantity: 2 },
      ],
    ),
    /chỉ được xuất hiện một lần/,
  );

  console.log("Workshop pricing and discount checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
