-- Prevent two concurrent requests from creating the same non-blank
-- registration number or dossier code in one branch. Blank values remain
-- allowed for records whose registration details are not available yet.
--
-- These expression/partial indexes cannot be represented by Prisma schema,
-- so their definitions intentionally live in this migration.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "PlateService"
    WHERE BTRIM("registrationNumber") <> ''
    GROUP BY "branchId", LOWER(BTRIM("registrationNumber"))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'PlateService contains duplicate non-blank registration numbers in the same branch. Resolve them before deploying this migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "PlateService"
    WHERE BTRIM("dossierCode") <> ''
    GROUP BY "branchId", LOWER(BTRIM("dossierCode"))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'PlateService contains duplicate non-blank dossier codes in the same branch. Resolve them before deploying this migration.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS
  "PlateService_branch_registrationNumber_unique_nonblank"
ON "PlateService" ("branchId", LOWER(BTRIM("registrationNumber")))
WHERE BTRIM("registrationNumber") <> '';

CREATE UNIQUE INDEX IF NOT EXISTS
  "PlateService_branch_dossierCode_unique_nonblank"
ON "PlateService" ("branchId", LOWER(BTRIM("dossierCode")))
WHERE BTRIM("dossierCode") <> '';

-- The GIN indexes themselves are each created in a dedicated follow-up
-- migration so PostgreSQL can build them concurrently outside a transaction.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
