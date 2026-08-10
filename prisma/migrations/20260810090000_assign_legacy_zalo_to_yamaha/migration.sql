-- The existing Zalo OA credentials are the credentials of Yamaha Toàn Thắng.
-- Keep the existing global SystemConfig keys intact for backward compatibility,
-- and explicitly bind them to the Yamaha branch. Other branches use their own
-- ZALO_BRANCH_<branchId>_* keys and therefore remain unconfigured until set.
INSERT INTO "SystemConfig" ("key", "value", "updatedAt")
SELECT
  'ZALO_LEGACY_BRANCH_ID',
  b."id"::text,
  CURRENT_TIMESTAMP
FROM "Branch" b
WHERE b."isDeleted" = false
  AND (
    LOWER(COALESCE(b."code", '')) LIKE '%yamaha%'
    OR LOWER(b."name") LIKE '%yamaha%'
  )
ORDER BY CASE
  WHEN LOWER(b."code") LIKE '%yamaha%' THEN 0
  ELSE 1
END, b."id"
LIMIT 1
ON CONFLICT ("key") DO UPDATE
SET "value" = EXCLUDED."value", "updatedAt" = CURRENT_TIMESTAMP;
