import { prisma } from "@/lib/prisma";
import {
  BRANCH_ID,
  isVinFastBranchId,
  isYamahaBranchId,
} from "@/lib/branch-identity";

export const LEGACY_ZALO_BRANCH_KEY = "ZALO_LEGACY_BRANCH_ID";

export interface BranchConfigScope {
  branch: { id: number; name: string; code: string | null };
  legacyBranchId: number | null;
  usesLegacyConfig: boolean;
  values: Record<string, string>;
}

export { BRANCH_ID, isVinFastBranchId, isYamahaBranchId };

function rowsToConfig(rows: Array<{ key: string; value: string }>) {
  return Object.fromEntries(rows.map(({ key, value }) => [key, value]));
}

function parseLegacyBranchId(value?: string) {
  const branchId = Number(value);
  return Number.isInteger(branchId) && branchId > 0 ? branchId : null;
}

export async function getBranchConfigScope(
  branchId: number,
  keys: readonly string[],
  defaults: Readonly<Record<string, string>> = {},
): Promise<BranchConfigScope | null> {
  const uniqueKeys = [...new Set(keys)];
  const [branch, scopedRows, legacyRows] = await Promise.all([
    prisma.branch.findFirst({
      where: { id: branchId, isDeleted: false },
      select: { id: true, name: true, code: true },
    }),
    prisma.branchSetting.findMany({
      where: { branchId, key: { in: uniqueKeys } },
      select: { key: true, value: true },
    }),
    prisma.systemConfig.findMany({
      where: { key: { in: [LEGACY_ZALO_BRANCH_KEY, ...uniqueKeys] } },
      select: { key: true, value: true },
    }),
  ]);

  if (!branch) return null;

  const scopedConfig = rowsToConfig(scopedRows);
  const legacyConfig = rowsToConfig(legacyRows);
  const storedLegacyBranchId = parseLegacyBranchId(
    legacyConfig[LEGACY_ZALO_BRANCH_KEY],
  );
  const legacyBranchId =
    storedLegacyBranchId === BRANCH_ID.YAMAHA_TOAN_THANG
      ? storedLegacyBranchId
      : BRANCH_ID.YAMAHA_TOAN_THANG;
  const usesLegacyConfig = isYamahaBranchId(branchId);

  const values = Object.fromEntries(
    uniqueKeys.map((key) => [
      key,
      scopedConfig[key] ??
        (usesLegacyConfig ? legacyConfig[key] : undefined) ??
        defaults[key] ??
        "",
    ]),
  );

  return { branch, legacyBranchId, usesLegacyConfig, values };
}

export async function getBranchConfigValues(
  keys: readonly string[],
  branchId: number | null | undefined,
  defaults: Readonly<Record<string, string>> = {},
) {
  const uniqueKeys = [...new Set(keys)];
  if (!branchId) {
    const rows = await prisma.systemConfig.findMany({
      where: { key: { in: uniqueKeys } },
      select: { key: true, value: true },
    });
    const globalConfig = rowsToConfig(rows);
    return Object.fromEntries(
      uniqueKeys.map((key) => [key, globalConfig[key] ?? defaults[key] ?? ""]),
    );
  }

  const scope = await getBranchConfigScope(branchId, uniqueKeys, defaults);
  return (
    scope?.values ??
    Object.fromEntries(uniqueKeys.map((key) => [key, defaults[key] ?? ""]))
  );
}

/**
 * Read a configuration value for a branch. Existing global values are only
 * used as a compatibility fallback for the Yamaha branch that owns them.
 */
export async function getBranchConfigValue(
  key: string,
  branchId: number | null | undefined,
  fallback = "",
) {
  const values = await getBranchConfigValues([key], branchId, {
    [key]: fallback,
  });
  return values[key];
}

export async function setBranchConfigValues(
  values: Readonly<Record<string, string>>,
  branchId?: number | null,
) {
  const entries = Object.entries(values);
  if (entries.length === 0) return;

  await prisma.$transaction(async (tx) => {
    for (const [key, value] of entries) {
      if (branchId) {
        await tx.branchSetting.upsert({
          where: { branchId_key: { branchId, key } },
          update: { value },
          create: { branchId, key, value },
        });
      } else {
        await tx.systemConfig.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        });
      }
    }
  });
}

export async function setBranchConfigValue(
  key: string,
  value: string,
  branchId: number,
) {
  await setBranchConfigValues({ [key]: value }, branchId);
}

export async function ensureLegacyConfigOwner(branchId: number) {
  if (!isYamahaBranchId(branchId)) return;

  await prisma.systemConfig.upsert({
    where: { key: LEGACY_ZALO_BRANCH_KEY },
    update: { value: String(BRANCH_ID.YAMAHA_TOAN_THANG) },
    create: {
      key: LEGACY_ZALO_BRANCH_KEY,
      value: String(BRANCH_ID.YAMAHA_TOAN_THANG),
    },
  });
}
