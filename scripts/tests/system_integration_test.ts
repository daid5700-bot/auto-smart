import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";

async function main() {
 try {
  const requiredColumns = await prisma.$queryRaw<Array<{ table_name: string; column_name: string }>>`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        (table_name = 'Product' AND column_name = 'vehicleModel')
        OR (table_name = 'RepairOrder' AND column_name = 'discountCodeId')
        OR (table_name = 'Vehicle' AND column_name = 'discountCodeId')
        OR (table_name = 'LoginRateLimit' AND column_name = 'lockedUntil')
      )
  `;
  assert.equal(requiredColumns.length, 4, "Database chưa có đủ các cột production mới.");

  const failedMigrations = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "_prisma_migrations"
    WHERE "finished_at" IS NULL AND "rolled_back_at" IS NULL
  `;
  assert.equal(Number(failedMigrations[0]?.count || 0), 0, "Có migration đang lỗi/chưa hoàn tất.");

  const duplicateDiscounts = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM (
      SELECT "branchId", "code", "scope"
      FROM "DiscountCode"
      GROUP BY "branchId", "code", "scope"
      HAVING COUNT(*) > 1
    ) duplicates
  `;
  assert.equal(Number(duplicateDiscounts[0]?.count || 0), 0, "Có mã giảm giá bị trùng.");

  const invalidDiscountUsage = await prisma.discountCode.count({
    where: {
      usageLimit: { not: null },
      usedCount: { lt: 0 },
    },
  });
  assert.equal(invalidDiscountUsage, 0, "Có bộ đếm mã giảm giá không hợp lệ.");

  console.log("Database integration checks passed.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
