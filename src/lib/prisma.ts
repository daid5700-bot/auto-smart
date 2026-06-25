import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";


const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  
  if (!(globalThis as any).__db_migrated) {
    (globalThis as any).__db_migrated = true;
    prisma.$executeRawUnsafe('ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "image" TEXT;')
      .then(() => console.log("Runtime migration: Column 'image' checked/created."))
      .catch((err) => console.error("Runtime migration failed:", err));
  }
}
