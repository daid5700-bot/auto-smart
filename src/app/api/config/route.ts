import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRole } from "@/lib/auth";
import { ZALO_CREDENTIAL_KEYS } from "@/lib/zalo";
import { getActiveBranchId } from "@/lib/branch";
import {
  LEGACY_ZALO_BRANCH_KEY,
  setBranchConfigValue,
} from "@/lib/branch-config";

const DEFAULT_CONFIGS: Record<string, string> = {
  zns_template: "Kính gửi quý khách [NAME], xe [PLATE] đã đến hạn bảo dưỡng thay dầu nhớt. Vui lòng liên hệ Xe Máy Toàn Thắng để đặt lịch!",
  lease_rate: "7.9",
  points_rate: "1",
};

function isYamahaBranch(branch: { name: string; code: string | null }) {
  return /yamaha/i.test(`${branch.code || ""} ${branch.name}`);
}

// GET /api/config — admin-only configuration for the branch selected in the header.
export async function GET(req: NextRequest) {
  try {
    const role = await verifyRole(req.cookies.get("user_role")?.value);
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Chỉ quản trị viên mới có quyền xem cấu hình" }, { status: 403 });
    }

    const branchId = await getActiveBranchId();
    if (!branchId) return NextResponse.json({ error: "Chưa chọn chi nhánh ở header" }, { status: 400 });

    const [branchSettings, legacyRows, branch] = await Promise.all([
      prisma.branchSetting.findMany({ where: { branchId }, select: { key: true, value: true } }),
      prisma.systemConfig.findMany({
        where: { key: { in: [LEGACY_ZALO_BRANCH_KEY, ...Object.keys(DEFAULT_CONFIGS), ...ZALO_CREDENTIAL_KEYS] } },
        select: { key: true, value: true },
      }),
      prisma.branch.findFirst({
        where: { id: branchId, isDeleted: false },
        select: { id: true, name: true, code: true },
      }),
    ]);
    if (!branch) return NextResponse.json({ error: "Chi nhánh hiện tại không tồn tại" }, { status: 404 });

    const configByKey = Object.fromEntries(branchSettings.map((row) => [row.key, row.value]));
    const legacyConfig = Object.fromEntries(legacyRows.map((row) => [row.key, row.value]));
    const legacyBranchId = Number(legacyConfig[LEGACY_ZALO_BRANCH_KEY]) || null;
    const usesLegacyConfig = legacyBranchId
      ? legacyBranchId === branch.id
      : isYamahaBranch(branch);
    const readConfig = (key: string) =>
      configByKey[key]
      ?? (usesLegacyConfig ? legacyConfig[key] : undefined)
      ?? DEFAULT_CONFIGS[key]
      ?? "";
    const zaloConfig = Object.fromEntries(
      ZALO_CREDENTIAL_KEYS.map((key) => [
        key,
        configByKey[key]
          ?? (usesLegacyConfig ? legacyConfig[key] : "")
          ?? "",
      ])
    );

    return NextResponse.json({
      branch,
      activeBranchId: branch.id,
      legacyBranchId,
      usesLegacyConfig,
      config: { ...zaloConfig, lease_rate: readConfig("lease_rate"), points_rate: readConfig("points_rate"), zns_template: readConfig("zns_template") },
    });
  } catch (error: any) {
    console.error("❌ [API_CONFIG] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/config — saves general settings or Zalo credentials for one branch (Admin only).
export async function POST(req: NextRequest) {
  try {
    const role = await verifyRole(req.cookies.get("user_role")?.value);
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Chỉ quản trị viên mới có quyền thay đổi cấu hình" }, { status: 403 });
    }

    const body = await req.json();
    const branchId = await getActiveBranchId();
    if (!branchId) return NextResponse.json({ error: "Chưa chọn chi nhánh ở header" }, { status: 400 });
    const branch = await prisma.branch.findFirst({ where: { id: branchId, isDeleted: false } });
    if (!branch) return NextResponse.json({ error: "Chi nhánh hiện tại không tồn tại" }, { status: 404 });

    // Keep the legacy marker pointing at Yamaha, while all newly saved values
    // are written to the active branch scope.
    if (isYamahaBranch(branch)) {
      await prisma.systemConfig.upsert({
        where: { key: LEGACY_ZALO_BRANCH_KEY },
        update: { value: String(branchId) },
        create: { key: LEGACY_ZALO_BRANCH_KEY, value: String(branchId) },
      });
    }

    for (const key of ["lease_rate", "points_rate", "zns_template"]) {
      if (body[key] !== undefined) await setBranchConfigValue(key, String(body[key]), branchId);
    }

    const allowed = new Set<string>(ZALO_CREDENTIAL_KEYS);
    const credentials = body.credentials || {};
    for (const [key, value] of Object.entries(credentials)) {
      if (!allowed.has(key)) continue;
      await setBranchConfigValue(key, String(value), branchId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
