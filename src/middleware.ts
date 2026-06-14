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

  // Skip auth for login page and static assets
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/select-branch") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // Active security check using cookie session
  const userRole = request.cookies.get("user_role")?.value;

  if (!userRole) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const allowed = ROLE_PATHS[userRole] || [];
  const isAllowed = allowed.some((p) => pathname.startsWith(p));

  if (!isAllowed) {
    const defaultRedirect = allowed[0] || "/login";
    return NextResponse.redirect(new URL(defaultRedirect, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
