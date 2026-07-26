CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "DiscountCode_branchId_code_scope_key"
    ON "DiscountCode"("branchId", "code", "scope");
