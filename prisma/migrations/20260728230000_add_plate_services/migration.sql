-- Mark whether a sales document includes the plate-registration service.
ALTER TABLE "Vehicle"
ADD COLUMN "hasPlateService" BOOLEAN NOT NULL DEFAULT false;

-- Existing retail documents all used the former plate workflow selector.
-- Preserve that intent without changing or deleting the legacy plateStatus data.
UPDATE "Vehicle"
SET "hasPlateService" = true
WHERE "saleType" = 'RETAIL'
  AND COALESCE("plateStatus", 'PENDING') IN ('PENDING', 'TAX_PAID', 'PLATE_DONE');

CREATE TABLE "PlateService" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "dossierCode" TEXT NOT NULL,
    "portalPasswordEncrypted" TEXT NOT NULL,
    "plateNumber" TEXT,
    "totalRevenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "registrationTax" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "plateFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "policeFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "plateFrameProductId" INTEGER,
    "plateFrameQuantity" INTEGER NOT NULL DEFAULT 0,
    "plateFrameUnitCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "plateFrameTotalCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "profit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlateService_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "StockMovement"
ADD COLUMN "plateServiceId" INTEGER;

CREATE UNIQUE INDEX "PlateService_vehicleId_key"
ON "PlateService"("vehicleId");

CREATE INDEX "PlateService_branchId_status_createdAt_idx"
ON "PlateService"("branchId", "status", "createdAt");

CREATE INDEX "PlateService_branchId_createdAt_idx"
ON "PlateService"("branchId", "createdAt");

CREATE INDEX "PlateService_plateFrameProductId_idx"
ON "PlateService"("plateFrameProductId");

CREATE INDEX "PlateService_registrationNumber_idx"
ON "PlateService"("registrationNumber");

CREATE INDEX "PlateService_dossierCode_idx"
ON "PlateService"("dossierCode");

CREATE INDEX "StockMovement_plateServiceId_idx"
ON "StockMovement"("plateServiceId");

CREATE INDEX "Vehicle_branchId_hasPlateService_updatedAt_idx"
ON "Vehicle"("branchId", "hasPlateService", "updatedAt");

ALTER TABLE "PlateService"
ADD CONSTRAINT "PlateService_vehicleId_fkey"
FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlateService"
ADD CONSTRAINT "PlateService_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlateService"
ADD CONSTRAINT "PlateService_plateFrameProductId_fkey"
FOREIGN KEY ("plateFrameProductId") REFERENCES "Product"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StockMovement"
ADD CONSTRAINT "StockMovement_plateServiceId_fkey"
FOREIGN KEY ("plateServiceId") REFERENCES "PlateService"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
