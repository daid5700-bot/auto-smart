BEGIN;

-- Add the dealer price using the existing wholesale price. If a dealer price
-- was already configured, preserve it. This migration never reprices orders.
INSERT INTO "Price" ("productId", "type", "amount")
SELECT "productId", 'DEALER', "amount" FROM "Price" WHERE "type" = 'WHOLESALE'
ON CONFLICT ("productId", "type") DO NOTHING;

-- Retain WHOLESALE as a compatibility alias for the release running during
-- deployment and for rollbacks. New API writes update both keys together.
INSERT INTO "Price" ("productId", "type", "amount")
SELECT "productId", 'WHOLESALE', "amount" FROM "Price" WHERE "type" = 'DEALER'
ON CONFLICT ("productId", "type") DO UPDATE SET "amount" = EXCLUDED."amount"
WHERE "Price"."amount" IS DISTINCT FROM EXCLUDED."amount";

-- DISTRIBUTOR/TECHNICIAN are optional until their actual amounts are set.
-- The application falls back to RETAIL rather than generating a 0 price.
COMMIT;
