CREATE INDEX CONCURRENTLY IF NOT EXISTS "ZnsLog_branchId_status_sentAt_idx"
    ON "ZnsLog"("branchId", "status", "sentAt");
