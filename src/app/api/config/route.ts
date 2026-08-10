import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRole } from "@/lib/auth";
import { ZALO_CREDENTIAL_KEYS } from "@/lib/zalo";

const LEGACY_ZALO_BRANCH_KEY = "ZALO_LEGACY_BRANCH_ID";
const DEFAULT_CONFIGS: Record<string, string> = {
  zns_template: "Kính gửi quý khách [NAME], xe [PLATE] đã đến hạn bảo dưỡng thay dầu nhớt. Vui lòng liên hệ Xe Máy Toàn Thắng để đặt lịch!",
  lease_rate: "7.9",
  points_rate: "1",
};

function isYamahaBranch(branch: { name: string; code: string | null }) {
  return /yamaha/i.test(`${branch.code || ""} ${branch.name}`);
}

// GET /api/config?branchId=1 — admin-only configuration for one selected branch.
export async function GET(req: NextRequest) {
  try {
    const role = await verifyRole(req.cookies.get("user_role")?.value);
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Chỉ quản trị viên mới có quyền xem cấu hình" }, { status: 403 });
    }

    const requestedBranchId = Number(req.nextUrl.searchParams.get("branchId"));
    const [rows, branches] = await Promise.all([
      prisma.systemConfig.findMany({ select: { key: true, value: true } }),
      prisma.branch.findMany({
        where: { isDeleted: false },
        select: { id: true, name: true, code: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    const allConfig = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    const legacyBranchId = Number(allConfig[LEGACY_ZALO_BRANCH_KEY]) || null;

    if (!requestedBranchId) {
      return NextResponse.json({
        config: { ...DEFAULT_CONFIGS, ...allConfig },
        branches,
        legacyBranchId,
      });
    }

    const branch = branches.find((item) => item.id === requestedBranchId);
    if (!branch) return NextResponse.json({ error: "Chi nhánh không tồn tại" }, { status: 404 });

    const usesLegacyConfig = legacyBranchId
      ? legacyBranchId === branch.id
      : isYamahaBranch(branch);
    const zaloConfig = Object.fromEntries(
      ZALO_CREDENTIAL_KEYS.map((key) => [
        key,
        allConfig[usesLegacyConfig ? key : `ZALO_BRANCH_${branch.id}_${key}`] || "",
      ])
    );

    return NextResponse.json({ branch, branches, legacyBranchId, usesLegacyConfig, config: zaloConfig });
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
    const branchId = Number(body.branchId) || null;

    if (branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: branchId, isDeleted: false } });
      if (!branch) return NextResponse.json({ error: "Chi nhánh không tồn tại" }, { status: 404 });

      if (body.useLegacyConfig && !isYamahaBranch(branch)) {
        return NextResponse.json(
          { error: "Chỉ chi nhánh Yamaha mới được dùng bộ thông tin Zalo OA hiện tại." },
          { status: 400 },
        );
      }

      const useLegacyConfig = Boolean(body.useLegacyConfig);
      if (useLegacyConfig) {
        await prisma.systemConfig.upsert({
          where: { key: LEGACY_ZALO_BRANCH_KEY },
          update: { value: String(branchId) },
          create: { key: LEGACY_ZALO_BRANCH_KEY, value: String(branchId) },
        });
      }

      const allowed = new Set<string>(ZALO_CREDENTIAL_KEYS);
      const credentials = body.credentials || {};
      for (const [key, value] of Object.entries(credentials)) {
        if (!allowed.has(key)) continue;
        const configKey = useLegacyConfig ? key : `ZALO_BRANCH_${branchId}_${key}`;
        await prisma.systemConfig.upsert({
          where: { key: configKey },
          update: { value: String(value) },
          create: { key: configKey, value: String(value) },
        });
      }
      return NextResponse.json({ success: true });
    }

    for (const [key, value] of Object.entries(body)) {
      await prisma.systemConfig.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
