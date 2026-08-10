import { prisma } from "@/lib/prisma";

export const LEGACY_ZALO_BRANCH_KEY = "ZALO_LEGACY_BRANCH_ID";

function isYamahaBranch(branch: { name: string; code: string | null }) {
  return /yamaha/i.test(`${branch.code || ""} ${branch.name}`);
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
  if (!branchId) {
    const globalConfig = await prisma.systemConfig.findUnique({ where: { key } });
    return globalConfig?.value ?? fallback;
  }

  const scopedConfig = await prisma.branchSetting.findUnique({
    where: { branchId_key: { branchId, key } },
  });
  if (scopedConfig) return scopedConfig.value;

  const legacyBranch = await prisma.systemConfig.findUnique({
    where: { key: LEGACY_ZALO_BRANCH_KEY },
    select: { value: true },
  });
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { name: true, code: true },
  });
  const ownsLegacyConfig = legacyBranch?.value
    ? Number(legacyBranch.value) === branchId
    : Boolean(branch && isYamahaBranch(branch));

  if (!ownsLegacyConfig) return fallback;
  const globalConfig = await prisma.systemConfig.findUnique({ where: { key } });
  return globalConfig?.value ?? fallback;
}

export async function setBranchConfigValue(key: string, value: string, branchId: number) {
  return prisma.branchSetting.upsert({
    where: { branchId_key: { branchId, key } },
    update: { value },
    create: { branchId, key, value },
  });
}
