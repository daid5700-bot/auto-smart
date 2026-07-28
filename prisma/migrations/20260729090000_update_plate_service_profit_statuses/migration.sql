-- Preserve existing plate-service records while moving them to the new workflow.
UPDATE "PlateService"
SET "status" = CASE
    WHEN "status" = 'PENDING' THEN 'TAX_SUBMITTED'
    WHEN "status" = 'COMPLETED' THEN 'DELIVERED_TO_CUSTOMER'
    ELSE "status"
END
WHERE "status" IN ('PENDING', 'COMPLETED');

-- New records start at the first status in the operational workflow.
ALTER TABLE "PlateService"
ALTER COLUMN "status" SET DEFAULT 'TAX_SUBMITTED';
