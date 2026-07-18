import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const BASELINE_MIGRATION = "20260701000000_baseline";
const LEGACY_REMOVAL_MIGRATION = "20260710120000_remove_technician_commission";
const prisma = new PrismaClient();

function runPrisma(args) {
  const result = spawnSync("./node_modules/.bin/prisma", args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Prisma command failed: prisma ${args.join(" ")}`);
  }
}

async function main() {
  const [databaseState] = await prisma.$queryRawUnsafe(`
    SELECT
      to_regclass('public."Customer"') IS NOT NULL AS "hasCustomerTable",
      to_regclass('public."_prisma_migrations"') IS NOT NULL AS "hasMigrationTable",
      to_regclass('public."TechPerformance"') IS NOT NULL AS "hasTechPerformanceTable",
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Technician'
          AND column_name = 'commissionRate'
      ) AS "hasCommissionRate"
  `);

  if (!databaseState.hasCustomerTable) {
    console.log("[migration] Empty database detected; the full baseline will be applied.");
    await prisma.$disconnect();
    return;
  }

  let appliedMigrations = [];
  if (databaseState.hasMigrationTable) {
    appliedMigrations = await prisma.$queryRawUnsafe(`
      SELECT migration_name AS "migrationName", finished_at AS "finishedAt", rolled_back_at AS "rolledBackAt"
      FROM "_prisma_migrations"
    `);

    const failedMigration = appliedMigrations.find(
      (migration) => !migration.finishedAt && !migration.rolledBackAt,
    );
    if (failedMigration) {
      throw new Error(
        `Migration ${failedMigration.migrationName} failed previously. Resolve it manually before deploying.`,
      );
    }
  }

  const appliedNames = new Set(
    appliedMigrations
      .filter((migration) => migration.finishedAt && !migration.rolledBackAt)
      .map((migration) => migration.migrationName),
  );
  const migrationsToResolve = [];

  // Older Docker releases used `prisma db push`, so the database already has
  // the baseline schema but has no Prisma migration history.
  if (!appliedNames.has(BASELINE_MIGRATION)) {
    migrationsToResolve.push(BASELINE_MIGRATION);
  }

  // Mark the historical removal as applied only when db push has already
  // removed both legacy objects. Otherwise migrate deploy must execute it.
  if (
    !appliedNames.has(LEGACY_REMOVAL_MIGRATION) &&
    !databaseState.hasTechPerformanceTable &&
    !databaseState.hasCommissionRate
  ) {
    migrationsToResolve.push(LEGACY_REMOVAL_MIGRATION);
  }

  await prisma.$disconnect();

  for (const migration of migrationsToResolve) {
    console.log(`[migration] Registering existing production schema: ${migration}`);
    runPrisma(["migrate", "resolve", "--applied", migration]);
  }
}

main()
  .catch(async (error) => {
    await prisma.$disconnect().catch(() => undefined);
    console.error("[migration] Bootstrap failed:", error);
    const connectionErrors = new Set(["P1001", "P1002", "P1008", "P1017"]);
    process.exit(connectionErrors.has(error?.code) ? 75 : 1);
  });
