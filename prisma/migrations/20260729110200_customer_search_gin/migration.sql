CREATE INDEX CONCURRENTLY IF NOT EXISTS "customer_search_gin_idx"
ON "Customer" USING GIN (
  "name" gin_trgm_ops,
  "phone" gin_trgm_ops
);
