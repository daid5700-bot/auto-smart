import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Global cache to prevent multiple PrismaClient instances in warm serverless containers
export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

globalForPrisma.prisma = prisma;

if (process.env.NODE_ENV !== "production") {
  if (!(globalThis as any).__db_migrated) {
    (globalThis as any).__db_migrated = true;
    prisma.$executeRawUnsafe('ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "image" TEXT;')
      .then(() => console.log("Runtime migration: Column 'image' checked/created."))
      .catch((err) => console.error("Runtime migration failed:", err));
  }
}
