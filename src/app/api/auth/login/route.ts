import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signRole, signData } from "@/lib/auth";

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

    // Verify using bcrypt only
    let isMatch = false;
    try {
      isMatch = bcrypt.compareSync(password, user.password);
    } catch (e) {
      isMatch = false;
    }

    if (!isMatch) return NextResponse.json({ error: "Mật khẩu không đúng" }, { status: 401 });

    const { password: _, branches, ...safeUser } = user as any;
    let userBranches = (branches as any[] || []).map((b: any) => b.branch);
    if (user.role === "ADMIN" && userBranches.length === 0) {
      userBranches = await prisma.branch.findMany({
        orderBy: { createdAt: "desc" },
      });
    }

    const signedRole = await signRole(safeUser.role);
    const signedUserId = await signData(String(user.id));
    console.log("LOGIN ROUTE: signedRole =", signedRole);

    const branchIdsStr = (safeUser.role === "ADMIN" && (branches as any[] || []).length === 0)
      ? "ALL"
      : userBranches.map((b: any) => b.id).join(",");
    const signedBranches = await signData(branchIdsStr);

    const isProd = process.env.NODE_ENV === "production";

    const response = NextResponse.json({
      user: safeUser,
      branches: userBranches,
      signedRole,
      signedBranches,
    });
    
    response.cookies.set("user_role", signedRole, {
      path: "/",
      maxAge: 86400,
      httpOnly: false, // client needs to check layout role visibility, but cannot forge it
      sameSite: "lax",
      secure: isProd,
    });

    response.cookies.set("user_id", signedUserId, {
      path: "/",
      maxAge: 86400,
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
    });

    response.cookies.set("allowed_branches", signedBranches, {
      path: "/",
      maxAge: 86400,
      httpOnly: true, // secure from JS manipulation
      sameSite: "lax",
      secure: isProd,
    });

    if (userBranches.length === 1) {
      response.cookies.set("active_branch_id", String(userBranches[0].id), {
        path: "/",
        maxAge: 86400,
        httpOnly: false, // client needs to read it
        sameSite: "lax",
        secure: isProd,
      });
    }

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
