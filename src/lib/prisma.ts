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

    (async () => {
      await prisma.$executeRawUnsafe('ALTER TABLE "PartsRequisition" ADD COLUMN IF NOT EXISTS "vehicleId" INTEGER;');
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "PartsRequisition_vehicleId_idx" ON "PartsRequisition"("vehicleId");');
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'PartsRequisition_vehicleId_fkey'
          ) THEN
            ALTER TABLE "PartsRequisition"
            ADD CONSTRAINT "PartsRequisition_vehicleId_fkey"
            FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"(id)
            ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$;
      `);
    })()
      .then(() => console.log("Runtime migration: PartsRequisition vehicle relation checked/created."))
      .catch((err) => console.error("Runtime requisition vehicle migration failed:", err));


    prisma.$executeRawUnsafe('UPDATE "User" SET role = \'SALES\' WHERE role::text = \'CRM\';')
      .then((count) => {
        if (count > 0) {
          console.log(`Runtime migration: Migrated ${count} users from CRM to SALES role.`);
        }
      })
      .catch((err) => console.error("Runtime user role migration failed:", err));
  }
}
