import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signRole } from "@/lib/auth";

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

    // Verify using bcrypt first, fallback to plaintext comparison for legacy seeded accounts
    let isMatch = false;
    try {
      isMatch = bcrypt.compareSync(password, user.password);
    } catch (e) {
      isMatch = false;
    }
    if (!isMatch) {
      isMatch = user.password === password;
    }

    if (!isMatch) return NextResponse.json({ error: "Mật khẩu không đúng" }, { status: 401 });

    const { password: _, branches, ...safeUser } = user as any;
    let userBranches;
    if (user.role === "ADMIN") {
      userBranches = await prisma.branch.findMany({
        orderBy: { createdAt: "desc" },
      });
    } else {
      userBranches = (branches as any[] || []).map((b: any) => b.branch);
    }

    const response = NextResponse.json({ user: safeUser, branches: userBranches });
    
    const signedRole = await signRole(safeUser.role);
    console.log("LOGIN ROUTE: signedRole =", signedRole);
    response.cookies.set("user_role", signedRole, {
      path: "/",
      maxAge: 86400,
      httpOnly: false, // client needs to check layout role visibility, but cannot forge it
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
