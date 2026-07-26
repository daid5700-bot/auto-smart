-- Additive shared login throttling state for multi-container deployments.
CREATE TABLE "LoginRateLimit" (
    "key" VARCHAR(64) NOT NULL,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "lockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginRateLimit_pkey" PRIMARY KEY ("key")
);
