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

-- Copy the current global settings and OA credentials into Yamaha's explicit
-- branch scope. Existing branch-specific values are never overwritten.
INSERT INTO "SystemConfig" ("key", "value", "updatedAt")
SELECT
  'BRANCH_' || b."id"::text || '_' || c."key",
  c."value",
  CURRENT_TIMESTAMP
FROM "Branch" b
JOIN "SystemConfig" c
  ON c."key" IN ('lease_rate', 'points_rate', 'zns_template')
WHERE b."isDeleted" = false
  AND (
    LOWER(COALESCE(b."code", '')) LIKE '%yamaha%'
    OR LOWER(b."name") LIKE '%yamaha%'
  )
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "SystemConfig" ("key", "value", "updatedAt")
SELECT
  'ZALO_BRANCH_' || b."id"::text || '_' || c."key",
  c."value",
  CURRENT_TIMESTAMP
FROM "Branch" b
JOIN "SystemConfig" c
  ON c."key" IN ('ZALO_APP_ID', 'ZALO_APP_SECRET', 'ZALO_OA_ACCESS_TOKEN',
                 'ZALO_REFRESH_TOKEN', 'ZALO_TEMPLATE_THANK_YOU',
                 'ZALO_TEMPLATE_OIL_REMIND', 'ZALO_TEMPLATE_BIRTHDAY',
                 'ZALO_TEMPLATE_INSPECT')
WHERE b."isDeleted" = false
  AND (
    LOWER(COALESCE(b."code", '')) LIKE '%yamaha%'
    OR LOWER(b."name") LIKE '%yamaha%'
  )
ON CONFLICT ("key") DO NOTHING;
