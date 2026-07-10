import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Starting migration of String to JSONB...");

  try {
    // Ép kiểu cột accessoriesJson trong Vehicle thành JSONB
    await prisma.$executeRawUnsafe(`ALTER TABLE "Vehicle" ALTER COLUMN "accessoriesJson" DROP DEFAULT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Vehicle" ALTER COLUMN "accessoriesJson" TYPE JSONB USING "accessoriesJson"::jsonb;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Vehicle" ALTER COLUMN "accessoriesJson" SET DEFAULT '[]'::jsonb;`);
    console.log("✅ Successfully altered Vehicle.accessoriesJson to JSONB");
  } catch (error) {
    console.error("⚠️ Failed to alter Vehicle.accessoriesJson:", error);
  }

  try {
    // Ép kiểu cột servicesJson trong RepairOrder thành JSONB
    await prisma.$executeRawUnsafe(`ALTER TABLE "RepairOrder" ALTER COLUMN "servicesJson" TYPE JSONB USING "servicesJson"::jsonb;`);
    console.log("✅ Successfully altered RepairOrder.servicesJson to JSONB");
  } catch (error) {
    console.error("⚠️ Failed to alter RepairOrder.servicesJson:", error);
  }

  console.log("Migration complete!");
}

main()
  .catch(e => {
    console.error("Migration fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
