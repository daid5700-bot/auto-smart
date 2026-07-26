-- Fixed-amount discounts already define the exact amount to deduct, so a
-- maximum-discount cap is not applicable. Older records may contain 0 here,
-- which incorrectly clamps a valid fixed discount to zero.
UPDATE "DiscountCode"
SET "maxDiscountAmount" = NULL
WHERE "discountType" = 'FIXED_AMOUNT'
  AND "maxDiscountAmount" IS NOT NULL;

-- Normalize immutable snapshots as well so historical sales and workshop
-- records keep the same fixed discount value without an invalid zero cap.
UPDATE "RepairOrder"
SET "appliedDiscountMaxAmount" = NULL
WHERE "appliedDiscountType" = 'FIXED_AMOUNT'
  AND "appliedDiscountMaxAmount" IS NOT NULL;

UPDATE "Vehicle"
SET "appliedDiscountMaxAmount" = NULL
WHERE "appliedDiscountType" = 'FIXED_AMOUNT'
  AND "appliedDiscountMaxAmount" IS NOT NULL;
