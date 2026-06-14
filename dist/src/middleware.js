"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.middleware = middleware;
var server_1 = require("next/server");
// Role-to-allowed-paths mapping for RBAC middleware
var ROLE_PATHS = {
    ADMIN: ["/admin", "/inventory", "/workshop", "/sales", "/crm"],
    WAREHOUSE: ["/inventory"],
    WORKSHOP: ["/workshop", "/inventory"], // can view inventory
    SALES: ["/sales", "/crm"],
    CRM: ["/crm"],
};
function middleware(request) {
    var _a;
    var pathname = request.nextUrl.pathname;
    // Skip auth for login page and static assets
    if (pathname.startsWith("/login") ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api") ||
        pathname === "/") {
        return server_1.NextResponse.next();
    }
    // Active security check using cookie session
    var userRole = (_a = request.cookies.get("user_role")) === null || _a === void 0 ? void 0 : _a.value;
    if (!userRole) {
        return server_1.NextResponse.redirect(new URL("/login", request.url));
    }
    var allowed = ROLE_PATHS[userRole] || [];
    var isAllowed = allowed.some(function (p) { return pathname.startsWith(p); });
    if (!isAllowed) {
        var defaultRedirect = allowed[0] || "/login";
        return server_1.NextResponse.redirect(new URL(defaultRedirect, request.url));
    }
    return server_1.NextResponse.next();
}
exports.config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
