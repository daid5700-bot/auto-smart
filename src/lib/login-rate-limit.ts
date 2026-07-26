import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

function getClientIp(req: NextRequest) {
  return (
    req.headers.get("x-real-ip")?.trim()
    || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown"
  );
}

export function getLoginRateLimitKey(req: NextRequest) {
  return createHash("sha256").update(`ip:${getClientIp(req)}`).digest("hex");
}

export function getLoginAccountRateLimitKey(email: string) {
  return createHash("sha256")
    .update(`account:${email.trim().toLowerCase()}`)
    .digest("hex");
}

export async function checkLoginRateLimit(key: string) {
  const now = new Date();
  await prisma.loginRateLimit.deleteMany({
    where: { updatedAt: { lt: new Date(now.getTime() - WINDOW_MS * 2) } },
  });
  const record = await prisma.loginRateLimit.findUnique({ where: { key } });
  if (!record) return { allowed: true, attemptsLeft: MAX_ATTEMPTS };

  if (record.lockedUntil && record.lockedUntil > now) {
    return {
      allowed: false,
      attemptsLeft: 0,
      retryAfterSec: Math.max(
        1,
        Math.ceil((record.lockedUntil.getTime() - now.getTime()) / 1000),
      ),
    };
  }

  if (now.getTime() - record.windowStartedAt.getTime() >= WINDOW_MS) {
    await prisma.loginRateLimit.deleteMany({ where: { key } });
    return { allowed: true, attemptsLeft: MAX_ATTEMPTS };
  }

  return {
    allowed: true,
    attemptsLeft: Math.max(0, MAX_ATTEMPTS - record.failedCount),
  };
}

export async function recordFailedLogin(key: string) {
  const now = new Date();
  const windowThreshold = new Date(now.getTime() - WINDOW_MS);
  const lockedUntil = new Date(now.getTime() + LOCK_MS);

  await prisma.$executeRaw`
    INSERT INTO "LoginRateLimit" (
      "key", "failedCount", "windowStartedAt", "lockedUntil", "updatedAt"
    )
    VALUES (${key}, 1, ${now}, NULL, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "failedCount" = CASE
        WHEN "LoginRateLimit"."windowStartedAt" <= ${windowThreshold} THEN 1
        ELSE "LoginRateLimit"."failedCount" + 1
      END,
      "windowStartedAt" = CASE
        WHEN "LoginRateLimit"."windowStartedAt" <= ${windowThreshold} THEN ${now}
        ELSE "LoginRateLimit"."windowStartedAt"
      END,
      "lockedUntil" = CASE
        WHEN (
          CASE
            WHEN "LoginRateLimit"."windowStartedAt" <= ${windowThreshold} THEN 1
            ELSE "LoginRateLimit"."failedCount" + 1
          END
        ) >= ${MAX_ATTEMPTS} THEN ${lockedUntil}
        WHEN "LoginRateLimit"."windowStartedAt" <= ${windowThreshold} THEN NULL
        ELSE "LoginRateLimit"."lockedUntil"
      END,
      "updatedAt" = ${now}
  `;

  const record = await prisma.loginRateLimit.findUnique({ where: { key } });
  return {
    attemptsLeft: Math.max(0, MAX_ATTEMPTS - Number(record?.failedCount || 0)),
    locked: Boolean(record?.lockedUntil && record.lockedUntil > now),
  };
}

export async function clearLoginRateLimit(key: string) {
  await prisma.loginRateLimit.deleteMany({ where: { key } });
}
