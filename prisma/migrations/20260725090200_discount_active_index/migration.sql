CREATE INDEX CONCURRENTLY IF NOT EXISTS "DiscountCode_branchId_scope_isActive_idx"
    ON "DiscountCode"("branchId", "scope", "isActive");
