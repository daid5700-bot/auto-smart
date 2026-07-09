import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRole } from "@/lib/auth";

const DEFAULT_CONFIGS: Record<string, string> = {
  zns_template: "Kính gửi quý khách [NAME], xe [PLATE] đã đến hạn bảo dưỡng thay dầu nhớt. Vui lòng liên hệ Xe Máy Toàn Thắng để đặt lịch!",
  lease_rate: "7.9",
  points_rate: "1",
};

// GET /api/config — return all system configs (with defaults)
export async function GET() {
  try {
    const rows = await prisma.$queryRaw<{ key: string; value: string }[]>`
      SELECT key, value FROM "SystemConfig"
    `;
    const config: Record<string, string> = { ...DEFAULT_CONFIGS };
    for (const row of rows) {
      config[row.key] = row.value;
    }
    return NextResponse.json({ config });
  } catch (error: any) {
    // If table doesn't exist yet, return defaults
    return NextResponse.json({ config: DEFAULT_CONFIGS });
  }
}

// POST /api/config — upsert one or many keys (Admin only)
export async function POST(req: NextRequest) {
  try {
    const role = await verifyRole(req.cookies.get("user_role")?.value);
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Chỉ quản trị viên mới có quyền thay đổi cấu hình" }, { status: 403 });
    }

    const body = await req.json();

    for (const [key, value] of Object.entries(body)) {
      const v = String(value);
      await prisma.systemConfig.upsert({
        where: { key },
        update: { value: v },
        create: { key, value: v }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
