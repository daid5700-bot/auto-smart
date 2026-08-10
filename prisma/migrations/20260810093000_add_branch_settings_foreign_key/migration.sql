-- Store branch-scoped settings in a real relational table. The previous
-- SystemConfig naming convention is retained as a read-only compatibility
-- source and is copied below without deleting production data.
CREATE TABLE "BranchSetting" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BranchSetting_branchId_key_key"
ON "BranchSetting"("branchId", "key");

CREATE INDEX "BranchSetting_branchId_idx"
ON "BranchSetting"("branchId");

ALTER TABLE "BranchSetting"
ADD CONSTRAINT "BranchSetting_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Copy the explicit scoped values produced by the preceding migration and by
-- any running version that used BRANCH_<id>_<key> / ZALO_BRANCH_<id>_<key>.
INSERT INTO "BranchSetting" ("branchId", "key", "value", "createdAt", "updatedAt")
SELECT m[1]::integer, m[2], c."value", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "SystemConfig" c
CROSS JOIN LATERAL regexp_match(
  c."key",
  '^BRANCH_([0-9]+)_(lease_rate|points_rate|zns_template)$'
) AS m
JOIN "Branch" b ON b."id" = m[1]::integer
ON CONFLICT ("branchId", "key") DO NOTHING;

INSERT INTO "BranchSetting" ("branchId", "key", "value", "createdAt", "updatedAt")
SELECT m[1]::integer, m[2], c."value", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "SystemConfig" c
CROSS JOIN LATERAL regexp_match(
  c."key",
  '^ZALO_BRANCH_([0-9]+)_(ZALO_APP_ID|ZALO_APP_SECRET|ZALO_OA_ACCESS_TOKEN|ZALO_REFRESH_TOKEN|ZALO_TEMPLATE_THANK_YOU|ZALO_TEMPLATE_OIL_REMIND|ZALO_TEMPLATE_BIRTHDAY|ZALO_TEMPLATE_INSPECT)$'
) AS m
JOIN "Branch" b ON b."id" = m[1]::integer
ON CONFLICT ("branchId", "key") DO NOTHING;

-- Also copy global legacy values to the Yamaha branch selected by the prior
-- migration. This keeps existing OA credentials and system rates intact.
INSERT INTO "BranchSetting" ("branchId", "key", "value", "createdAt", "updatedAt")
SELECT marker."value"::integer, c."key", c."value", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "SystemConfig" marker
JOIN "SystemConfig" c ON c."key" IN (
  'lease_rate', 'points_rate', 'zns_template',
  'ZALO_APP_ID', 'ZALO_APP_SECRET', 'ZALO_OA_ACCESS_TOKEN', 'ZALO_REFRESH_TOKEN',
  'ZALO_TEMPLATE_THANK_YOU', 'ZALO_TEMPLATE_OIL_REMIND',
  'ZALO_TEMPLATE_BIRTHDAY', 'ZALO_TEMPLATE_INSPECT'
)
JOIN "Branch" b ON b."id" = marker."value"::integer
WHERE marker."key" = 'ZALO_LEGACY_BRANCH_ID'
ON CONFLICT ("branchId", "key") DO NOTHING;
