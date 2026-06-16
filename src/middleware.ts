import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Role-to-allowed-paths mapping for RBAC middleware
const ROLE_PATHS: Record<string, string[]> = {
  ADMIN: ["/admin", "/inventory", "/workshop", "/sales", "/crm"],
  WAREHOUSE: ["/inventory"],
  WORKSHOP: ["/workshop", "/inventory"], // can view inventory
  SALES: ["/sales", "/crm"],
  CRM: ["/crm"],
};

export function middleware(request: NextRequest) {
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
  const userRole = request.cookies.get("user_role")?.value;

  if (!userRole) {
    // Return 401 for API requests instead of redirecting
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Role checking for pages (non-API)
  if (!pathname.startsWith("/api")) {
    const allowed = ROLE_PATHS[userRole] || [];
    const isAllowed = allowed.some((p) => pathname.startsWith(p));

    if (!isAllowed) {
      const defaultRedirect = allowed[0] || "/login";
      return NextResponse.redirect(new URL(defaultRedirect, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
