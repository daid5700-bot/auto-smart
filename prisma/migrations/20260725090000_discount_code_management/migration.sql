-- Discount codes are additive: existing sales/workshop records remain valid.
CREATE TABLE "DiscountCode" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "target" TEXT NOT NULL DEFAULT 'ORDER',
    "value" DECIMAL(65,30) NOT NULL,
    "maxDiscountAmount" DECIMAL(65,30),
    "minOrderAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "branchId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RepairOrder"
    ADD COLUMN "discountCodeId" INTEGER,
    ADD COLUMN "appliedDiscountCode" TEXT,
    ADD COLUMN "appliedDiscountName" TEXT,
    ADD COLUMN "appliedDiscountType" TEXT,
    ADD COLUMN "appliedDiscountValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "appliedDiscountMaxAmount" DECIMAL(65,30),
    ADD COLUMN "appliedDiscountTarget" TEXT;

ALTER TABLE "Vehicle"
    ADD COLUMN "originalListPrice" DECIMAL(65,30),
    ADD COLUMN "discountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "discountCodeId" INTEGER,
    ADD COLUMN "appliedDiscountCode" TEXT,
    ADD COLUMN "appliedDiscountName" TEXT,
    ADD COLUMN "appliedDiscountType" TEXT,
    ADD COLUMN "appliedDiscountValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "appliedDiscountMaxAmount" DECIMAL(65,30),
    ADD COLUMN "appliedDiscountTarget" TEXT;

-- Preserve an explicit audit label for historical workshop discounts that
-- were entered manually before discount-code management existed.
UPDATE "RepairOrder"
SET
    "appliedDiscountCode" = 'MANUAL-LEGACY',
    "appliedDiscountName" = 'Giảm giá nhập tay (dữ liệu cũ)',
    "appliedDiscountType" = 'LEGACY',
    "appliedDiscountValue" = "discountAmount",
    "appliedDiscountTarget" = 'ORDER'
WHERE "discountAmount" > 0
  AND "appliedDiscountCode" IS NULL;

ALTER TABLE "DiscountCode"
    ADD CONSTRAINT "DiscountCode_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RepairOrder"
    ADD CONSTRAINT "RepairOrder_discountCodeId_fkey"
    FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Vehicle"
    ADD CONSTRAINT "Vehicle_discountCodeId_fkey"
    FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
