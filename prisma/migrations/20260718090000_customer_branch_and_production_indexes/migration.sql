-- Add an explicit many-to-many customer/branch membership table.
CREATE TABLE "CustomerBranch" (
    "customerId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerBranch_pkey" PRIMARY KEY ("customerId", "branchId")
);

ALTER TABLE "CustomerBranch"
ADD CONSTRAINT "CustomerBranch_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerBranch"
ADD CONSTRAINT "CustomerBranch_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "CustomerBranch_branchId_lastSeenAt_idx"
ON "CustomerBranch"("branchId", "lastSeenAt");

-- Backfill the customer's original/home branch.
INSERT INTO "CustomerBranch" ("customerId", "branchId", "firstSeenAt", "lastSeenAt")
SELECT c.id, c."branchId", c."createdAt", c."updatedAt"
FROM "Customer" c
WHERE c."branchId" IS NOT NULL
ON CONFLICT ("customerId", "branchId") DO UPDATE
SET "lastSeenAt" = GREATEST("CustomerBranch"."lastSeenAt", EXCLUDED."lastSeenAt");

-- Backfill every branch where the customer has historical activity.
INSERT INTO "CustomerBranch" ("customerId", "branchId", "firstSeenAt", "lastSeenAt")
SELECT ro."customerId", ro."branchId", MIN(ro."createdAt"), MAX(ro."updatedAt")
FROM "RepairOrder" ro
WHERE ro."branchId" IS NOT NULL
GROUP BY ro."customerId", ro."branchId"
ON CONFLICT ("customerId", "branchId") DO UPDATE
SET "lastSeenAt" = GREATEST("CustomerBranch"."lastSeenAt", EXCLUDED."lastSeenAt");

INSERT INTO "CustomerBranch" ("customerId", "branchId", "firstSeenAt", "lastSeenAt")
SELECT v."customerId", v."branchId", MIN(v."createdAt"), MAX(v."updatedAt")
FROM "Vehicle" v
WHERE v."customerId" IS NOT NULL AND v."branchId" IS NOT NULL
GROUP BY v."customerId", v."branchId"
ON CONFLICT ("customerId", "branchId") DO UPDATE
SET "lastSeenAt" = GREATEST("CustomerBranch"."lastSeenAt", EXCLUDED."lastSeenAt");

INSERT INTO "CustomerBranch" ("customerId", "branchId", "firstSeenAt", "lastSeenAt")
SELECT io."customerId", io."branchId", MIN(io."createdAt"), MAX(io."updatedAt")
FROM "InventoryOrder" io
WHERE io."customerId" IS NOT NULL AND io."branchId" IS NOT NULL
GROUP BY io."customerId", io."branchId"
ON CONFLICT ("customerId", "branchId") DO UPDATE
SET "lastSeenAt" = GREATEST("CustomerBranch"."lastSeenAt", EXCLUDED."lastSeenAt");

INSERT INTO "CustomerBranch" ("customerId", "branchId", "firstSeenAt", "lastSeenAt")
SELECT l."customerId", l."branchId", MIN(l."createdAt"), MAX(l."updatedAt")
FROM "Lead" l
WHERE l."customerId" IS NOT NULL AND l."branchId" IS NOT NULL
GROUP BY l."customerId", l."branchId"
ON CONFLICT ("customerId", "branchId") DO UPDATE
SET "lastSeenAt" = GREATEST("CustomerBranch"."lastSeenAt", EXCLUDED."lastSeenAt");

INSERT INTO "CustomerBranch" ("customerId", "branchId", "firstSeenAt", "lastSeenAt")
SELECT z."customerId", z."branchId", MIN(z."sentAt"), MAX(z."sentAt")
FROM "ZnsLog" z
WHERE z."branchId" IS NOT NULL
GROUP BY z."customerId", z."branchId"
ON CONFLICT ("customerId", "branchId") DO UPDATE
SET "lastSeenAt" = GREATEST("CustomerBranch"."lastSeenAt", EXCLUDED."lastSeenAt");

INSERT INTO "CustomerBranch" ("customerId", "branchId", "firstSeenAt", "lastSeenAt")
SELECT lt."customerId", lt."branchId", MIN(lt."createdAt"), MAX(lt."createdAt")
FROM "LoyaltyTransaction" lt
WHERE lt."branchId" IS NOT NULL
GROUP BY lt."customerId", lt."branchId"
ON CONFLICT ("customerId", "branchId") DO UPDATE
SET "lastSeenAt" = GREATEST("CustomerBranch"."lastSeenAt", EXCLUDED."lastSeenAt");

-- Production indexes for the branch-scoped list and reporting queries.
CREATE INDEX "InventoryOrder_branchId_status_createdAt_idx"
ON "InventoryOrder"("branchId", "status", "createdAt");

CREATE INDEX "RepairOrder_branchId_isDeleted_status_createdAt_idx"
ON "RepairOrder"("branchId", "isDeleted", "status", "createdAt");

CREATE INDEX "RepairOrder_customerId_branchId_createdAt_idx"
ON "RepairOrder"("customerId", "branchId", "createdAt");

CREATE INDEX "Vehicle_branchId_status_updatedAt_idx"
ON "Vehicle"("branchId", "status", "updatedAt");

CREATE INDEX "Vehicle_customerId_branchId_idx"
ON "Vehicle"("customerId", "branchId");

CREATE INDEX "Customer_branchId_isDeleted_totalSpent_idx"
ON "Customer"("branchId", "isDeleted", "totalSpent");

CREATE INDEX "Customer_isDeleted_totalSpent_idx"
ON "Customer"("isDeleted", "totalSpent");

CREATE INDEX "Lead_branchId_status_createdAt_idx"
ON "Lead"("branchId", "status", "createdAt");

CREATE INDEX "ZnsLog_branchId_sentAt_idx"
ON "ZnsLog"("branchId", "sentAt");

CREATE INDEX "ZnsLog_customerId_templateId_sentAt_idx"
ON "ZnsLog"("customerId", "templateId", "sentAt");

CREATE INDEX "LoyaltyTransaction_branchId_createdAt_idx"
ON "LoyaltyTransaction"("branchId", "createdAt");

CREATE INDEX "LoyaltyTransaction_customerId_type_relatedRoId_idx"
ON "LoyaltyTransaction"("customerId", "type", "relatedRoId");

CREATE INDEX "PartsRequisition_branchId_status_createdAt_idx"
ON "PartsRequisition"("branchId", "status", "createdAt");

CREATE INDEX "PaymentTransaction_branchId_isDeleted_createdAt_idx"
ON "PaymentTransaction"("branchId", "isDeleted", "createdAt");

-- One-time repair formerly executed on every inventory statistics GET request.
UPDATE "StockMovement" sm
SET "vehicleId" = io."vehicleId"
FROM "InventoryOrder" io
WHERE sm."inventoryOrderId" = io.id
  AND sm."vehicleId" IS NULL
  AND io."vehicleId" IS NOT NULL;

UPDATE "StockMovement" sm
SET "vehicleId" = v.id
FROM "Vehicle" v
WHERE sm.type = 'EXPORT_GIFT'
  AND sm."vehicleId" IS NULL
  AND sm.reason IS NOT NULL
  AND v.vin = substring(sm.reason FROM '(?i)VIN\s*#?\s*([A-Za-z0-9-]+)');
