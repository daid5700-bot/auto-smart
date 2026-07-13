import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRole } from "@/lib/auth";

const DEFAULT_CONFIGS: Record<string, string> = {
  zns_template: "Kính gửi quý khách [NAME], xe [PLATE] đã đến hạn bảo dưỡng thay dầu nhớt. Vui lòng liên hệ Xe Máy Toàn Thắng để đặt lịch!",
  lease_rate: "7.9",
  points_rate: "1",
  ZALO_OA_ACCESS_TOKEN: "",
  ZALO_REFRESH_TOKEN: "",
};

export async function GET() {
  try {
    const rows = await prisma.systemConfig.findMany({
      select: {
        key: true,
        value: true,
      },
    });
    const config: Record<string, string> = { ...DEFAULT_CONFIGS };
    for (const row of rows) {
      config[row.key] = row.value;
    }
    return NextResponse.json({ config });
  } catch (error: any) {
    console.error("❌ [API_CONFIG] GET error:", error);
    return NextResponse.json({ config: DEFAULT_CONFIGS, error: error.message });
  }
}

// POST /api/config — upsert one or many keys (Admin only)
export async function POST(req: NextRequest) {
  try {
    const role = await verifyRole(req.cookies.get("user_role")?.value);
    if (role !== "ADMIN") {
      console.warn("⚠️ [API_CONFIG] POST Từ chối truy cập: Quyền không phải ADMIN, role hiện tại:", role);
      return NextResponse.json({ error: "Chỉ quản trị viên mới có quyền thay đổi cấu hình" }, { status: 403 });
    }

    const body = await req.json();
    console.log("📥 [API_CONFIG] POST body nhận được để lưu:", body);

    for (const [key, value] of Object.entries(body)) {
      const v = String(value);
      console.log(`💾 [API_CONFIG] Đang lưu cấu hình: key=${key}, value=${v.substring(0, 30)}${v.length > 30 ? "..." : ""}`);
      await prisma.systemConfig.upsert({
        where: { key },
        update: { value: v },
        create: { key, value: v }
      });
    }

    console.log("✅ [API_CONFIG] Lưu cấu hình thành công!");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ [API_CONFIG] POST lỗi:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
