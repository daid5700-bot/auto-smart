import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signRole, signData } from "@/lib/auth";
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  getLoginAccountRateLimitKey,
  getLoginRateLimitKey,
  recordFailedLogin,
} from "@/lib/login-rate-limit";

// ============================================================
// POST /api/auth/login
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password || email.length > 254 || password.length > 500) {
      return NextResponse.json(
        { error: "Email hoặc mật khẩu không đúng." },
        { status: 401 },
      );
    }

    const rateLimitKeys = [
      getLoginRateLimitKey(req),
      getLoginAccountRateLimitKey(email),
    ];
    const rateChecks = await Promise.all(
      rateLimitKeys.map(checkLoginRateLimit),
    );
    const blockedCheck = rateChecks.find((check) => !check.allowed);
    if (blockedCheck) {
      const retryAfter = blockedCheck.retryAfterSec || 900;
      return NextResponse.json(
        {
          error: `Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau ${Math.ceil(retryAfter / 60)} phút.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        branches: {
          where: { branch: { isDeleted: false } },
          include: {
            branch: true,
          },
        },
      },
    });

    if (!user) {
      await Promise.all(rateLimitKeys.map(recordFailedLogin));
      return NextResponse.json(
        { error: "Email hoặc mật khẩu không đúng." },
        { status: 401 },
      );
    }

    // Verify using bcrypt only
    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, user.password);
    } catch (e) {
      isMatch = false;
    }

    if (!isMatch) {
      const failures = await Promise.all(rateLimitKeys.map(recordFailedLogin));
      const attemptsLeft = Math.min(
        ...failures.map((failure) => failure.attemptsLeft),
      );
      return NextResponse.json(
        {
          error:
            attemptsLeft > 0
              ? `Email hoặc mật khẩu không đúng. Còn ${attemptsLeft} lần thử trước khi bị khóa.`
              : "Email hoặc mật khẩu không đúng. Đăng nhập đã bị tạm khóa 15 phút.",
        },
        { status: 401 },
      );
    }

    // 2. Đăng nhập thành công — xóa bộ đếm thất bại
    await Promise.all(rateLimitKeys.map(clearLoginRateLimit));

    const { password: _, branches, ...safeUser } = user as any;
    let userBranches = ((branches as any[]) || []).map((b: any) => b.branch);
    if (user.role === "ADMIN" && userBranches.length === 0) {
      userBranches = await prisma.branch.findMany({
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
      });
    }

    const signedRole = await signRole(safeUser.role);
    const signedUserId = await signData(String(user.id));

    const branchIdsStr =
      safeUser.role === "ADMIN" && ((branches as any[]) || []).length === 0
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

    response.cookies.set("user_name", encodeURIComponent(safeUser.name || user.name || ""), {
      path: "/",
      maxAge: 86400,
      httpOnly: false,
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
    } else {
      // A prior session may point to an ID that has been changed/deleted.
      // Force a fresh, explicit selection for users with multiple branches.
      response.cookies.delete("active_branch_id");
    }

    return response;
  } catch (error: any) {
    console.error("[AUTH_LOGIN]", error);
    return NextResponse.json(
      { error: "Không thể đăng nhập lúc này. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}
