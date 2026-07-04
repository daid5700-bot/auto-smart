import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyRole, verifyData } from "@/lib/auth";

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
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico") ||
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

  // Verify allowed branches for this user session
  const allowedBranchesCookie = request.cookies.get("allowed_branches")?.value;
  const allowedBranchesStr = await verifyData(allowedBranchesCookie);
  if (!allowedBranchesStr) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Session invalid or expired. Please login again." }, { status: 401 });
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

  // Branch access check for active_branch_id
  const isBranchRelatedApi = pathname.startsWith("/api/branches");
  if (!isBranchRelatedApi) {
    const activeBranchIdStr = request.cookies.get("active_branch_id")?.value;
    if (!activeBranchIdStr) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Please select an active branch first." }, { status: 400 });
      }
      return NextResponse.redirect(new URL("/select-branch", request.url));
    }

    const activeBranchId = parseInt(activeBranchIdStr, 10);
    if (isNaN(activeBranchId)) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Invalid active branch ID." }, { status: 400 });
      }
      return NextResponse.redirect(new URL("/select-branch", request.url));
    }

    if (allowedBranchesStr !== "ALL") {
      const allowedBranchIds = allowedBranchesStr.split(",").map((id) => parseInt(id, 10));
      if (!allowedBranchIds.includes(activeBranchId)) {
        if (pathname.startsWith("/api")) {
          return NextResponse.json({ error: "Access denied. You do not have access to this branch." }, { status: 403 });
        }
        const response = NextResponse.redirect(new URL("/select-branch", request.url));
        response.cookies.delete("active_branch_id");
        return response;
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
