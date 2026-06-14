import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/auth/login — simple auth (replace with NextAuth in production)
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        branches: {
          include: {
            branch: true,
          },
        },
      },
    });
    if (!user) return NextResponse.json({ error: "Email không tồn tại" }, { status: 401 });
    // In production: use bcrypt.compare(password, user.password)
        if (user.password !== password) return NextResponse.json({ error: "Mật khẩu không đúng" }, { status: 401 });
    const { password: _, branches, ...safeUser } = user as any;
    let userBranches;
    if (user.role === "ADMIN") {
      userBranches = await prisma.branch.findMany({
        orderBy: { createdAt: "desc" },
      });
    } else {
      userBranches = (branches as any[] || []).map((b: any) => b.branch);
    }
    return NextResponse.json({ user: safeUser, branches: userBranches });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
