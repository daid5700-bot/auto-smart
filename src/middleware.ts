import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyRole } from "@/lib/auth";

// Role-to-allowed-paths mapping for RBAC middleware
const ROLE_PATHS: Record<string, string[]> = {
  ADMIN: ["/admin", "/inventory", "/workshop", "/sales", "/crm", "/api"],
  WAREHOUSE: ["/inventory", "/api/inventory", "/api/stats", "/api/dashboard", "/api/search", "/api/config"],
  WORKSHOP: ["/workshop", "/inventory", "/crm", "/api/workshop", "/api/inventory", "/api/crm", "/api/stats", "/api/technicians", "/api/dashboard", "/api/search", "/api/config"],
  SALES: ["/sales", "/crm", "/api/sales", "/api/crm", "/api/stats", "/api/dashboard", "/api/search", "/api/config"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth for login page, API login, and static assets
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/select-branch") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/zalo_verifier") ||
    pathname.startsWith("/VT-E6ON10") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // Active security check using cookie session
  const userRoleCookie = request.cookies.get("user_role")?.value;
  console.log("MIDDLEWARE CHECK - path:", pathname, "cookie:", userRoleCookie);
  const userRole = await verifyRole(userRoleCookie);
  console.log("MIDDLEWARE CHECK - verified role:", userRole);

  if (!userRole) {
    // Return 401 for API requests instead of redirecting
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Role checking for ALL paths (including APIs)
  const allowed = ROLE_PATHS[userRole] || [];
  const isAllowed = allowed.some((p) => pathname.startsWith(p));

  if (!isAllowed) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Access denied. Insufficient permissions." }, { status: 403 });
    }
    const defaultRedirect = allowed[0] || "/login";
    return NextResponse.redirect(new URL(defaultRedirect, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
