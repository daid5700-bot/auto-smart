CREATE INDEX CONCURRENTLY IF NOT EXISTS "vehicle_search_gin_idx"
ON "Vehicle" USING GIN (
  "vin" gin_trgm_ops,
  "model" gin_trgm_ops
);
