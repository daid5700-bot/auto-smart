import { NextRequest, NextResponse } from "next/server";
import { refreshZaloToken } from "@/lib/zalo";
import { verifyRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const role = await verifyRole(req.cookies.get("user_role")?.value);
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Chỉ quản trị viên mới có quyền làm mới token Zalo" }, { status: 403 });
    }

    const accessToken = await refreshZaloToken();
    return NextResponse.json({ success: true, accessToken });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
