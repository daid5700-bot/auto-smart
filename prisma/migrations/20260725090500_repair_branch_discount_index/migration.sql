CREATE INDEX CONCURRENTLY IF NOT EXISTS "RepairOrder_branchId_discountCodeId_createdAt_idx"
    ON "RepairOrder"("branchId", "discountCodeId", "createdAt");
