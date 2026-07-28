-- Store every compatible vehicle model while retaining Product.vehicleModel
-- for backward compatibility with existing search and reporting code.
ALTER TABLE "Product"
ADD COLUMN "vehicleModels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Preserve all existing values as a one-item selection.
UPDATE "Product"
SET "vehicleModels" = ARRAY[BTRIM("vehicleModel")]
WHERE "vehicleModel" IS NOT NULL
  AND BTRIM("vehicleModel") <> ''
  AND CARDINALITY("vehicleModels") = 0;
