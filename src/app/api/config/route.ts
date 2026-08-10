import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRole } from "@/lib/auth";
import { getActiveBranchId } from "@/lib/branch";
import {
  ensureLegacyConfigOwner,
  getBranchConfigScope,
  setBranchConfigValues,
} from "@/lib/branch-config";
import { ZALO_CREDENTIAL_KEYS } from "@/lib/zalo-config";

const DEFAULT_CONFIGS: Readonly<Record<string, string>> = {
  zns_template:
    "Kính gửi quý khách [NAME], xe [PLATE] đã đến hạn bảo dưỡng thay dầu nhớt. Vui lòng liên hệ Xe Máy Toàn Thắng để đặt lịch!",
  lease_rate: "7.9",
  points_rate: "1",
};
const GENERAL_CONFIG_KEYS = Object.keys(DEFAULT_CONFIGS);
const EDITABLE_ZALO_KEYS = new Set<string>(ZALO_CREDENTIAL_KEYS);
const ALL_CONFIG_KEYS = [...GENERAL_CONFIG_KEYS, ...ZALO_CREDENTIAL_KEYS];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function pickEditableValues(
  source: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
) {
  return Object.fromEntries(
    Object.entries(source)
      .filter(([key, value]) => allowedKeys.has(key) && value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
}

// GET /api/config — admin-only configuration for the branch selected in the header.
export async function GET(req: NextRequest) {
  try {
    const role = await verifyRole(req.cookies.get("user_role")?.value);
    if (role !== "ADMIN") {
      return NextResponse.json(
        { error: "Chỉ quản trị viên mới có quyền xem cấu hình" },
        { status: 403 },
      );
    }

    const branchId = await getActiveBranchId();
    if (!branchId) {
      return NextResponse.json(
        { error: "Chưa chọn chi nhánh ở header" },
        { status: 400 },
      );
    }

    const scope = await getBranchConfigScope(
      branchId,
      ALL_CONFIG_KEYS,
      DEFAULT_CONFIGS,
    );
    if (!scope) {
      return NextResponse.json(
        { error: "Chi nhánh hiện tại không tồn tại" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      branch: scope.branch,
      activeBranchId: scope.branch.id,
      legacyBranchId: scope.legacyBranchId,
      usesLegacyConfig: scope.usesLegacyConfig,
      config: scope.values,
    });
  } catch (error) {
    console.error("[API_CONFIG] GET error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

// POST /api/config — saves general settings or Zalo credentials for one branch (Admin only).
export async function POST(req: NextRequest) {
  try {
    const role = await verifyRole(req.cookies.get("user_role")?.value);
    if (role !== "ADMIN") {
      return NextResponse.json(
        { error: "Chỉ quản trị viên mới có quyền thay đổi cấu hình" },
        { status: 403 },
      );
    }

    const body: unknown = await req.json();
    if (!isRecord(body)) {
      return NextResponse.json(
        { error: "Dữ liệu cấu hình không hợp lệ" },
        { status: 400 },
      );
    }

    const branchId = await getActiveBranchId();
    if (!branchId) {
      return NextResponse.json(
        { error: "Chưa chọn chi nhánh ở header" },
        { status: 400 },
      );
    }

    const branch = await prisma.branch.findFirst({
      where: { id: branchId, isDeleted: false },
      select: { id: true, name: true, code: true },
    });
    if (!branch) {
      return NextResponse.json(
        { error: "Chi nhánh hiện tại không tồn tại" },
        { status: 404 },
      );
    }

    const generalValues = pickEditableValues(
      body,
      new Set(GENERAL_CONFIG_KEYS),
    );
    const credentialValues = isRecord(body.credentials)
      ? pickEditableValues(body.credentials, EDITABLE_ZALO_KEYS)
      : {};

    await ensureLegacyConfigOwner(branch);
    await setBranchConfigValues(
      { ...generalValues, ...credentialValues },
      branchId,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API_CONFIG] POST error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
