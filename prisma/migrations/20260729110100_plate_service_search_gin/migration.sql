-- One statement per migration is intentional: CREATE INDEX CONCURRENTLY
-- cannot execute inside a PostgreSQL transaction.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "plate_service_search_gin_idx"
ON "PlateService" USING GIN (
  "registrationNumber" gin_trgm_ops,
  "dossierCode" gin_trgm_ops,
  "plateNumber" gin_trgm_ops
);
