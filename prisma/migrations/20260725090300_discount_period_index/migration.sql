CREATE INDEX CONCURRENTLY IF NOT EXISTS "DiscountCode_scope_startsAt_endsAt_idx"
    ON "DiscountCode"("scope", "startsAt", "endsAt");
