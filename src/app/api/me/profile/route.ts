import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyData, verifyRole } from "@/lib/auth";

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
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Họ tên không được để trống" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { name },
      select: { id: true, name: true, email: true, role: true, avatar: true },
    });

    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
