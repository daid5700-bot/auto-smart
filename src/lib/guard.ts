/**
 * guard.ts — Lớp bảo vệ xác thực thứ 2 (Second-layer Auth Guard)
 *
 * Sử dụng trong các route handler (KHÔNG phải middleware) để:
 * 1. Verify cookie session một lần nữa tại tầng route (defense-in-depth)
 * 2. Kiểm tra user vẫn tồn tại trong DB (session revocation)
 * 3. Kiểm tra quyền role cụ thể nếu cần
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyRole, verifyData } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ============================================================
// In-memory blocklist — Lưu user ID đã bị xóa/vô hiệu hóa
// Tự động xóa sau 48h (đủ dài để session cookie hết hạn 24h)
// ============================================================
const revokedUserIds = new Map<number, number>(); // userId -> timestamp

const REVOKE_TTL_MS = 48 * 60 * 60 * 1000; // 48 giờ

export function revokeSession(userId: number): void {
  revokedUserIds.set(userId, Date.now());
}

function isRevoked(userId: number): boolean {
  const ts = revokedUserIds.get(userId);
  if (!ts) return false;
  if (Date.now() - ts > REVOKE_TTL_MS) {
    revokedUserIds.delete(userId);
    return false;
  }
  return true;
}

// ============================================================
// Auth Guard Result
// ============================================================
export type GuardResult =
  | { ok: true; role: string; userId: number }
  | { ok: false; response: NextResponse };

/**
 * requireAuth — Kiểm tra xác thực người dùng tại tầng route.
 *
 * - Verify cookie user_role (HMAC signature)
 * - Verify cookie user_id (HMAC signature)
 * - Kiểm tra user_id chưa bị thu hồi (blocklist)
 * - Kiểm tra user còn tồn tại trong DB
 * - (Tuỳ chọn) Kiểm tra role cụ thể
 *
 * @param req - NextRequest
 * @param allowedRoles - Nếu truyền vào thì chỉ cho phép các role này. Bỏ trống = chấp nhận mọi role đăng nhập.
 */
export async function requireAuth(
  req: NextRequest,
  allowedRoles?: string[]
): Promise<GuardResult> {
  // 1. Verify role cookie
  const role = await verifyRole(req.cookies.get("user_role")?.value);
  if (!role) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại." },
        { status: 401 }
      ),
    };
  }

  // 2. Verify user_id cookie
  const userIdStr = await verifyData(req.cookies.get("user_id")?.value);
  const userId = userIdStr ? parseInt(userIdStr, 10) : NaN;
  if (!userIdStr || isNaN(userId)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại." },
        { status: 401 }
      ),
    };
  }

  // 3. Kiểm tra blocklist (đã bị xóa tài khoản hoặc thu hồi session)
  if (isRevoked(userId)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên." },
        { status: 403 }
      ),
    };
  }

  // 4. Kiểm tra user còn tồn tại trong DB (session revocation khi bị xóa)
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      // Thêm vào blocklist để các request tiếp theo không cần query DB nữa
      revokeSession(userId);
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Tài khoản không còn tồn tại. Vui lòng liên hệ quản trị viên." },
          { status: 403 }
        ),
      };
    }
  } catch {
    // Nếu DB không trả về được (lỗi kết nối), fallback an toàn: vẫn cho qua
    // (tránh chặn toàn bộ hệ thống khi DB chậm)
  }

  // 5. Kiểm tra role nếu được yêu cầu
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Quyền truy cập bị từ chối. Yêu cầu quyền: ${allowedRoles.join(" hoặc ")}.` },
        { status: 403 }
      ),
    };
  }

  return { ok: true, role, userId };
}
