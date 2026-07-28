CREATE INDEX CONCURRENTLY IF NOT EXISTS "product_search_gin_idx"
ON "Product" USING GIN (
  "name" gin_trgm_ops,
  "sku" gin_trgm_ops,
  "vehicleModel" gin_trgm_ops
);
