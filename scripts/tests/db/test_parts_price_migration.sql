\set ON_ERROR_STOP on
-- Run only against a disposable database. Keep all fixtures isolated from the
-- actual schema, but run the real migration SQL twice to verify retries.
CREATE SCHEMA parts_price_migration_test;
SET search_path TO parts_price_migration_test;
CREATE TABLE "Price" (
  "id" SERIAL PRIMARY KEY,
  "productId" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "amount" DECIMAL(65,30) NOT NULL,
  UNIQUE ("productId", "type")
);
CREATE TABLE "HistoricalOrderItem" ("productId" INTEGER, "unitPrice" NUMERIC);
INSERT INTO "HistoricalOrderItem" VALUES (1, 123000);
INSERT INTO "Price" ("productId", "type", "amount") VALUES
  (1, 'RETAIL', 180000), (1, 'WHOLESALE', 155000),
  (2, 'WHOLESALE', 155000), (2, 'DEALER', 160000),
  (3, 'WHOLESALE', 0), (4, 'DEALER', 130000),
  (5, 'DISTRIBUTOR', 110000), (5, 'TECHNICIAN', 120000),
  (6, 'RETAIL', 180000);

\ir ../../../prisma/migrations/20261014090000_migrate_parts_dealer_prices/migration.sql
CREATE TABLE "FirstRun" AS SELECT "productId", "type", "amount" FROM "Price";
\ir ../../../prisma/migrations/20261014090000_migrate_parts_dealer_prices/migration.sql

DO $$
BEGIN
  ASSERT (SELECT "amount" FROM "Price" WHERE "productId" = 1 AND "type" = 'DEALER') = 155000, 'Wholesale must migrate to dealer';
  ASSERT (SELECT "amount" FROM "Price" WHERE "productId" = 2 AND "type" = 'DEALER') = 160000, 'Existing dealer must survive';
  ASSERT (SELECT "amount" FROM "Price" WHERE "productId" = 2 AND "type" = 'WHOLESALE') = 160000, 'Rollback alias must match';
  ASSERT (SELECT "amount" FROM "Price" WHERE "productId" = 3 AND "type" = 'DEALER') = 0, 'Explicit zero must survive';
  ASSERT (SELECT "amount" FROM "Price" WHERE "productId" = 4 AND "type" = 'WHOLESALE') = 130000, 'Dealer-only records get an alias';
  ASSERT (SELECT "amount" FROM "Price" WHERE "productId" = 5 AND "type" = 'DISTRIBUTOR') = 110000, 'Distributor unchanged';
  ASSERT (SELECT "amount" FROM "Price" WHERE "productId" = 5 AND "type" = 'TECHNICIAN') = 120000, 'Technician unchanged';
  ASSERT (SELECT "unitPrice" FROM "HistoricalOrderItem") = 123000, 'Historical invoices unchanged';
  ASSERT NOT EXISTS (SELECT FROM "Price" WHERE "productId" = 6 AND "type" <> 'RETAIL'), 'Do not invent new prices';
  ASSERT NOT EXISTS (
    (SELECT "productId", "type", "amount" FROM "Price" EXCEPT SELECT * FROM "FirstRun")
    UNION ALL
    (SELECT * FROM "FirstRun" EXCEPT SELECT "productId", "type", "amount" FROM "Price")
  ), 'Migration must be idempotent';
END $$;
RESET search_path;
DROP SCHEMA parts_price_migration_test CASCADE;
