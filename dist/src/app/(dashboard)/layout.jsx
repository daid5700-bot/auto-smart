"use strict";
"use client";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardLayout;
var react_1 = require("react");
var navigation_1 = require("next/navigation");
var link_1 = __importDefault(require("next/link"));
var store_1 = require("@/lib/store");
var navigation_2 = require("@/config/navigation");
var rbac_1 = require("@/config/rbac");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
function DashboardLayout(_a) {
    var children = _a.children;
    var router = (0, navigation_1.useRouter)();
    var pathname = (0, navigation_1.usePathname)();
    var _b = (0, store_1.useAuth)(), user = _b.user, isAuth = _b.isAuth, logout = _b.logout, hydrate = _b.hydrate;
    var _c = (0, react_1.useState)(false), collapsed = _c[0], setCollapsed = _c[1];
    var _d = (0, react_1.useState)(false), mobileOpen = _d[0], setMobileOpen = _d[1];
    var _e = (0, react_1.useState)([]), openSections = _e[0], setOpenSections = _e[1];
    var _f = (0, react_1.useState)(false), hydrated = _f[0], setHydrated = _f[1];
    (0, react_1.useEffect)(function () {
        hydrate();
        setHydrated(true);
    }, []);
    (0, react_1.useEffect)(function () {
        if (hydrated && (!isAuth || !user)) {
            router.replace("/login");
        }
    }, [hydrated, isAuth, user, router]);
    if (!hydrated || !user) {
        return (<div className="flex items-center justify-center h-screen bg-background">
        <lucide_react_1.Loader2 className="w-8 h-8 animate-spin text-primary"/>
      </div>);
    }
    var nav = (0, navigation_2.getNavForRole)(user.role);
    var activeSection = nav.find(function (s) { return s.items.some(function (i) { return pathname === i.href || pathname.startsWith(i.href + "/"); }); });
    var toggle = function (t) { return setOpenSections(function (p) { return p.includes(t) ? p.filter(function (x) { return x !== t; }) : __spreadArray(__spreadArray([], p, true), [t], false); }); };
    var isOpen = function (t) { return openSections.includes(t) || (activeSection === null || activeSection === void 0 ? void 0 : activeSection.title) === t; };
    var doLogout = function () { logout(); router.push("/login"); };
    var currentItem = nav.flatMap(function (s) { return s.items; }).find(function (i) { return pathname === i.href || pathname.startsWith(i.href + "/"); });
    return (<div className="flex h-screen overflow-hidden">
      {/* SIDEBAR */}
      <aside className={(0, utils_1.cn)("fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300", collapsed ? "w-[72px]" : "w-64", mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0 glow-blue">
            <lucide_react_1.Car size={20} className="text-white"/>
          </div>
          {!collapsed && <div className="animate-fade-in"><h1 className="text-sm font-bold leading-tight">AUTO-SMART</h1><p className="text-[10px] text-muted-foreground">CRM & ERP</p></div>}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {nav.map(function (section) { return (<div key={section.title} className="mb-1">
              {!collapsed && (<button onClick={function () { return toggle(section.title); }} className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                  {section.title}
                  <lucide_react_1.ChevronDown size={12} className={(0, utils_1.cn)("transition-transform", isOpen(section.title) && "rotate-180")}/>
                </button>)}
              {(isOpen(section.title) || collapsed) && (<div className="space-y-0.5">
                  {section.items.map(function (item) {
                    var Icon = item.icon;
                    var active = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (<link_1.default key={item.href} href={item.href} onClick={function () { return setMobileOpen(false); }} className={(0, utils_1.cn)("sidebar-link", active && "active")} title={collapsed ? item.title : undefined}>
                        <Icon size={18} className="shrink-0"/>
                        {!collapsed && <span className="truncate">{item.title}</span>}
                      </link_1.default>);
                })}
                </div>)}
            </div>); })}
        </nav>

        {/* User */}
        <div className="border-t border-sidebar-border p-3 shrink-0">
          <div className={(0, utils_1.cn)("flex items-center gap-3", collapsed && "justify-center")}>
            <div className={"w-9 h-9 rounded-full bg-gradient-to-br ".concat((0, rbac_1.roleColor)(user.role), " flex items-center justify-center text-white text-sm font-bold shrink-0")}>
              {user.name.charAt(0)}
            </div>
            {!collapsed && (<>
                <div className="flex-1 min-w-0 animate-fade-in">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-[10px] text-primary">{(0, rbac_1.roleName)(user.role)}</p>
                </div>
                <button onClick={doLogout} className="text-muted-foreground hover:text-destructive transition-colors" title="Đăng xuất"><lucide_react_1.LogOut size={16}/></button>
              </>)}
          </div>
        </div>

        {/* Collapse */}
        <button onClick={function () { return setCollapsed(!collapsed); }} className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all z-10">
          {collapsed ? <lucide_react_1.ChevronRight size={12}/> : <lucide_react_1.ChevronLeft size={12}/>}
        </button>
      </aside>

      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={function () { return setMobileOpen(false); }}/>}

      {/* MAIN */}
      <main className={(0, utils_1.cn)("flex-1 flex flex-col overflow-hidden transition-all duration-300", collapsed ? "lg:ml-[72px]" : "lg:ml-64")}>
        {/* Header */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={function () { return setMobileOpen(true); }} className="lg:hidden text-muted-foreground hover:text-foreground"><lucide_react_1.Menu size={20}/></button>
            <h1 className="text-lg font-semibold">{(currentItem === null || currentItem === void 0 ? void 0 : currentItem.title) || "Dashboard"}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 border border-transparent focus-within:border-primary/30 transition-all">
              <lucide_react_1.Search size={14} className="text-muted-foreground"/>
              <input type="text" placeholder="Tìm kiếm..." className="bg-transparent border-none outline-none text-sm w-48 placeholder:text-muted-foreground"/>
            </div>
            <button className="relative w-9 h-9 rounded-lg bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
              <lucide_react_1.Bell size={16}/>
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center font-bold">3</span>
            </button>
            <button onClick={doLogout} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
              {user.name.charAt(0)}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-dot-pattern">{children}</div>
      </main>
    </div>);
}
