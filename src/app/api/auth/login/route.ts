import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signRole, signData } from "@/lib/auth";

// ============================================================
// Rate Limiting — In-memory: 5 lần thất bại / 15 phút / IP
// ============================================================
interface AttemptRecord { count: number; firstAt: number; lockedUntil?: number; }
const loginAttempts = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 phút
const LOCK_MS    = 15 * 60 * 1000; // Khóa 15 phút sau khi vượt giới hạn

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record) return { allowed: true };

  // Đang bị khóa?
  if (record.lockedUntil && now < record.lockedUntil) {
    return { allowed: false, retryAfterSec: Math.ceil((record.lockedUntil - now) / 1000) };
  }

  // Cửa sổ thời gian đã hết, reset
  if (now - record.firstAt > WINDOW_MS) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now - record.firstAt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAt: now });
    return;
  }

  record.count++;
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCK_MS;
  }
  loginAttempts.set(ip, record);
}

function clearAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

// Tự động dọn dẹp các IP đã hết TTL mỗi giờ
setInterval(() => {
  const now = Date.now();
  loginAttempts.forEach((record, ip) => {
    if (now - record.firstAt > WINDOW_MS * 2) loginAttempts.delete(ip);
  });
}, 60 * 60 * 1000);

// ============================================================
// POST /api/auth/login
// ============================================================
export async function POST(req: NextRequest) {
  const ip = getClientIP(req);

  // 1. Kiểm tra rate limit trước khi xử lý bất kỳ thứ gì
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: `Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau ${Math.ceil((rateCheck.retryAfterSec || 900) / 60)} phút.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateCheck.retryAfterSec || 900) },
      }
    );
  }

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

    if (!user) {
      recordFailedAttempt(ip);
      return NextResponse.json({ error: "Email không tồn tại" }, { status: 401 });
    }

    // Verify using bcrypt only
    let isMatch = false;
    try {
      isMatch = bcrypt.compareSync(password, user.password);
    } catch (e) {
      isMatch = false;
    }

    if (!isMatch) {
      recordFailedAttempt(ip);
      const remaining = loginAttempts.get(ip);
      const attemptsLeft = Math.max(0, MAX_ATTEMPTS - (remaining?.count || 0));
      return NextResponse.json(
        {
          error: attemptsLeft > 0
            ? `Mật khẩu không đúng. Còn ${attemptsLeft} lần thử trước khi bị khóa.`
            : "Mật khẩu không đúng. Tài khoản đã bị tạm khóa 15 phút.",
        },
        { status: 401 }
      );
    }

    // 2. Đăng nhập thành công — xóa bộ đếm thất bại
    clearAttempts(ip);

    const { password: _, branches, ...safeUser } = user as any;
    let userBranches = (branches as any[] || []).map((b: any) => b.branch);
    if (user.role === "ADMIN" && userBranches.length === 0) {
      userBranches = await prisma.branch.findMany({
        orderBy: { createdAt: "desc" },
      });
    }

    const signedRole = await signRole(safeUser.role);
    const signedUserId = await signData(String(user.id));

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

