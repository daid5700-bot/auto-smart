-- Support exact vehicle-model filtering without scanning every Product row.
-- This migration intentionally contains one concurrent index statement so
-- production writes are not blocked while the index is built.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Product_vehicleModels_gin_idx"
ON "Product" USING GIN ("vehicleModels");
