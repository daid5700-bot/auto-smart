CREATE INDEX CONCURRENTLY IF NOT EXISTS "Vehicle_branchId_discountCodeId_updatedAt_idx"
    ON "Vehicle"("branchId", "discountCodeId", "updatedAt");
