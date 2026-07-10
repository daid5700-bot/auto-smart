import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { verifyData, verifyRole } from "@/lib/auth";
import { validatePasswordChange } from "@/lib/account-security";

async function getCurrentUserId(req: NextRequest) {
  const role = await verifyRole(req.cookies.get("user_role")?.value);
  const signedUserId = await verifyData(req.cookies.get("user_id")?.value);
  const userId = signedUserId ? Number.parseInt(signedUserId, 10) : NaN;

  if (!role || !Number.isInteger(userId) || userId <= 0) return null;
  return userId;
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Phiên đăng nhập không hợp lệ" }, { status: 401 });
    }

    const body = await req.json();
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });
    }

    const validation = validatePasswordChange(user.password, currentPassword, newPassword, confirmPassword);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { password: bcrypt.hashSync(newPassword, 10) },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
