"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/store";
import { getNavForRole } from "@/config/navigation";
import { roleName, roleColor } from "@/config/rbac";
import { Car, ChevronLeft, ChevronRight, LogOut, Search, Menu, ChevronDown, Loader2, X, Wrench, User, Sparkles, Building2, KeyRound, Pencil, Eye, EyeOff } from "lucide-react";
import { cn, formatCurrency, parseSymptoms } from "@/lib/utils";
import { toast } from "@/lib/toast";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuth, logout, hydrate, branches, activeBranch, setActiveBranch, updateUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [displayBranches, setDisplayBranches] = useState<any[]>([]);
  const [branchesLoaded, setBranchesLoaded] = useState(false);

  // Global Search State
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    customers: any[];
    vehicles: any[];
    repairOrders: any[];
  }>({ customers: [], vehicles: [], repairOrders: [] });
  const [searching, setSearching] = useState(false);
  const [pendingReqCount, setPendingReqCount] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const branchDropdownRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hydrate();
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && user) {
      if (user.role === "ADMIN" && branches.length === 0) {
        fetch("/api/branches")
          .then((res) => res.json())
          .then((data) => {
            setDisplayBranches(data.branches || []);
            setBranchesLoaded(true);
          })
          .catch((err) => {
            console.error(err);
            setDisplayBranches(branches);
            setBranchesLoaded(true);
          });
      } else {
        setDisplayBranches(branches);
        setBranchesLoaded(true);
      }
    }
  }, [hydrated, user, branches]);

  // Click outside to close branch dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
        setBranchDropdownOpen(false);
      }
    }
    if (branchDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [branchDropdownOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }
    if (accountMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [accountMenuOpen]);

  useEffect(() => {
    if (hydrated && (!isAuth || !user)) {
      router.replace("/login");
    } else if (hydrated && isAuth && user && branchesLoaded && displayBranches.length > 1 && !activeBranch) {
      router.replace("/select-branch");
    }
  }, [hydrated, isAuth, user, displayBranches, branchesLoaded, activeBranch, router]);

  // Command Palette keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Autofocus input when search modal opens
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery("");
      setSearchResults({ customers: [], vehicles: [], repairOrders: [] });
    }
  }, [searchOpen]);

  // Debounced search fetching
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults({ customers: [], vehicles: [], repairOrders: [] });
      return;
    }
    setSearching(true);
    const delayDebounceFn = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        .then((res) => res.json())
        .then((data) => {
          setSearchResults({
            customers: data.customers || [],
            vehicles: data.vehicles || [],
            repairOrders: data.repairOrders || [],
          });
        })
        .catch(console.error)
        .finally(() => setSearching(false));
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    if (!isAuth || !activeBranch?.id) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let stopped = false;

    const fetchPendingCount = () => {
      fetch("/api/inventory/requisitions/count")
        .then((r) => r.json())
        .then((data) => setPendingReqCount(Number(data.count) || 0))
        .catch((e) => console.error("Error fetching requisitions count:", e));
    };

    const connectRequisitionStream = () => {
      if (stopped) return;

      try {
        eventSource = new EventSource("/api/inventory/requisitions/stream");

        eventSource.addEventListener("count", (event) => {
          try {
            const data = JSON.parse(event.data);
            setPendingReqCount(Number(data.count) || 0);
          } catch (e) {
            console.error("Error parsing requisition stream message:", e);
          }
        });

        eventSource.onerror = () => {
          eventSource?.close();
          eventSource = null;
          fetchPendingCount();
          if (!stopped) {
            reconnectTimeout = setTimeout(connectRequisitionStream, 5000);
          }
        };

      } catch (err) {
        console.error("Failed to connect requisition stream, falling back to HTTP count:", err);
        fetchPendingCount();
        reconnectTimeout = setTimeout(connectRequisitionStream, 5000);
      }
    };

    connectRequisitionStream();

    return () => {
      stopped = true;
      eventSource?.close();
      clearTimeout(reconnectTimeout);
    };
  }, [isAuth, activeBranch?.id]);

  if (!hydrated || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const nav = getNavForRole(user.role);
  const allNavItemsSorted = nav.flatMap((s) => s.items).sort((a, b) => b.href.length - a.href.length);
  const currentItem = allNavItemsSorted.find((i) => pathname === i.href || pathname.startsWith(i.href + "/"));
  const activeSection = nav.find((s) => s.items.some((i) => currentItem?.href === i.href));
  const toggle = (t: string) => setOpenSections((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t]);
  const isOpen = (t: string) => openSections.includes(t) || activeSection?.title === t;
  const doLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    logout();
    router.push("/login");
  };

  const openProfileModal = () => {
    setAccountMenuOpen(false);
    setProfileName(user.name);
    setProfileModalOpen(true);
  };

  const openPasswordModal = () => {
    setAccountMenuOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordModalOpen(true);
  };

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileSaving(true);
    try {
      const response = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể cập nhật thông tin");
      updateUser(data.user);
      setProfileModalOpen(false);
      toast.success("Đã cập nhật thông tin cá nhân");
    } catch (error: any) {
      toast.error("Cập nhật thất bại", error.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordSaving(true);
    try {
      const response = await fetch("/api/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể đổi mật khẩu");
      setPasswordModalOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Đã đổi mật khẩu thành công");
    } catch (error: any) {
      toast.error("Đổi mật khẩu thất bại", error.message);
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleResultClick = (href: string) => {
    setSearchOpen(false);
    router.push(href);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* SIDEBAR */}
      <aside className={cn(
        "fixed inset-y-0 left-0 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64",
        mobileOpen ? "translate-x-0 z-50" : "-translate-x-full lg:translate-x-0 z-20"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
          {activeBranch?.logoUrl ? (
            <div className="w-10 h-10 rounded-xl bg-white border border-border flex items-center justify-center shrink-0 overflow-hidden p-0.5 shadow-sm">
              <img src={activeBranch.logoUrl} alt={`${activeBranch.name} Logo`} className="w-full h-full object-contain" />
            </div>
          ) : activeBranch?.name?.toLowerCase().includes("vinfast") ? (
            <div className="w-10 h-10 rounded-xl bg-white border border-border flex items-center justify-center shrink-0 overflow-hidden p-1 shadow-sm">
              <img src="/vinfast.png" alt="Vinfast Logo" className="w-full h-full object-contain" />
            </div>
          ) : activeBranch?.name?.toLowerCase().includes("yamaha") ? (
            <div className="w-10 h-10 rounded-xl bg-white border border-border flex items-center justify-center shrink-0 overflow-hidden p-1 shadow-sm">
              <img src="/yamaha.png" alt="Yamaha Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0 glow-blue">
              <Car size={20} className="text-white" />
            </div>
          )}
          {!collapsed && <div className="animate-fade-in"><h1 className="text-sm font-bold leading-tight">Xe Máy Toàn Thắng</h1><p className="text-[10px] text-muted-foreground">CRM & ERP</p></div>}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {nav.map((section) => (
            <div key={section.title} className="mb-2">
              {!collapsed && (
                <div className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider select-none">
                  {section.title}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = currentItem?.href === item.href;
                  const isRequisition = item.title === "Duyệt yêu cầu xuất";
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                      className={cn("sidebar-link", active && "active")}
                      title={collapsed ? item.title : undefined}>
                      <Icon size={18} className="shrink-0" />
                      {!collapsed && (
                        <div className="flex items-center justify-between w-full min-w-0">
                          <span className="truncate">{item.title}</span>
                          {isRequisition && pendingReqCount > 0 && (
                            <span className="ml-2 min-w-[20px] h-5 px-1 flex items-center justify-center text-[10px] font-medium bg-destructive text-white rounded-full shrink-0 animate-pulse">
                              {pendingReqCount}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="relative border-t border-sidebar-border p-3 shrink-0" ref={accountMenuRef}>
          <button
            onClick={() => setAccountMenuOpen((open) => !open)}
            className={cn("w-full flex items-center gap-3 rounded-xl p-1.5 hover:bg-sidebar-accent transition-colors text-left", collapsed && "justify-center")}
            title={collapsed ? `${user.name} - Mở menu tài khoản` : undefined}
          >
            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${roleColor(user.role)} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
              {user.name.charAt(0)}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0 animate-fade-in">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-[10px] text-primary">{roleName(user.role)}</p>
              </div>
            )}
            {!collapsed && <ChevronDown size={15} className={cn("text-muted-foreground transition-transform", accountMenuOpen && "rotate-180")} />}
          </button>

          {accountMenuOpen && (
            <div className={cn("absolute bottom-full mb-2 w-56 rounded-xl bg-card border border-border shadow-xl p-1.5 z-30 animate-fade-in", collapsed ? "left-14" : "left-3 right-3 w-auto")}>
              <button onClick={openProfileModal} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm hover:bg-accent transition-colors text-left">
                <Pencil size={15} className="text-primary" /> Thông tin cá nhân
              </button>
              <button onClick={openPasswordModal} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm hover:bg-accent transition-colors text-left">
                <KeyRound size={15} className="text-primary" /> Mật khẩu
              </button>
              <div className="my-1 border-t border-border" />
              <button onClick={doLogout} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors text-left">
                <LogOut size={15} /> Đăng xuất
              </button>
            </div>
          )}
        </div>

        {/* Collapse */}
        <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all z-10">
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* MAIN */}
      <main className={cn("flex-1 flex flex-col overflow-hidden transition-all duration-300", collapsed ? "lg:ml-[72px]" : "lg:ml-64")}>
        {/* Header */}
        <header className="relative h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground"><Menu size={20} /></button>
            <h1 className="text-lg font-semibold">{currentItem?.title || "Dashboard"}</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Branch Selector */}
            {displayBranches.length > 0 && (
              <div className="relative" ref={branchDropdownRef}>
                {displayBranches.length === 1 ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/50 text-xs font-semibold border border-border">
                    <Building2 size={13} className="text-primary" />
                    <span>{activeBranch?.name || displayBranches[0].name}</span>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary text-xs font-semibold border border-border transition-colors"
                    >
                      <Building2 size={13} className="text-primary mr-1" />
                      <span>{activeBranch?.name || "Chọn cơ sở..."}</span>
                      <ChevronDown size={12} className={cn("ml-1 transition-transform duration-200", branchDropdownOpen && "rotate-180")} />
                    </button>
                    {branchDropdownOpen && (
                      <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-card border border-border shadow-lg py-1.5 z-20 animate-fade-in">
                        <div className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cơ sở hoạt động</div>
                        {displayBranches.map((b) => (
                          <button
                            key={b.id}
                            onClick={() => {
                              setActiveBranch(b);
                              setBranchDropdownOpen(false);
                              window.location.reload();
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 text-xs font-medium hover:bg-accent hover:text-foreground transition-colors flex items-center justify-between",
                              activeBranch?.id === b.id && "text-primary bg-primary/5 font-semibold"
                            )}
                          >
                            {b.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Global Search Trigger Bar */}
            <div onClick={() => setSearchOpen(true)} className="hidden md:flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 border border-border hover:border-primary/40 cursor-pointer transition-all">
              <Search size={14} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground w-48 text-left select-none">Tìm kiếm nhanh...</span>
              <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-dot-pattern">{children}</div>
      </main>

      {/* Global Search Command Palette Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in pt-[10vh]">
          <div className="w-full max-w-2xl bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in-bottom flex flex-col max-h-[70vh]">
            {/* Input Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
              <Search className="text-primary shrink-0" size={20} />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm khách hàng, biển số, tên xe, hoặc ID... (Nhập từ 2 ký tự)"
                className="flex-1 bg-transparent border-none outline-none text-base placeholder:text-muted-foreground"
              />
              {searching ? (
                <Loader2 className="animate-spin text-muted-foreground shrink-0" size={16} />
              ) : (
                <button onClick={() => setSearchOpen(false)} className="text-muted-foreground hover:text-foreground shrink-0">
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Results Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {searchQuery.trim().length < 2 ? (
                <div className="text-center py-10 space-y-2">
                  <Sparkles className="mx-auto text-primary/40 animate-pulse" size={28} />
                  <p className="text-sm font-semibold text-muted-foreground">Thanh tìm kiếm toàn cục - Xe Máy Toàn Thắng</p>
                  <p className="text-xs text-muted-foreground/80 max-w-xs mx-auto">Nhập biển số xe, tên khách hàng hoặc tên dòng xe để tra cứu nhanh thông tin liên quan</p>
                </div>
              ) : (
                <>
                  {/* Category: Lệnh sửa chữa */}
                  {searchResults.repairOrders.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2">Lệnh sửa chữa dịch vụ</h4>
                      <div className="space-y-0.5">
                        {searchResults.repairOrders.map((ro) => (
                          <div
                            key={ro.id}
                            onClick={() => handleResultClick("/workshop")}
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-secondary/60 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600"><Wrench size={16} /></div>
                              <div>
                                <p className="text-sm font-bold">{ro.plateNumber} — <span className="text-xs text-muted-foreground font-normal">{ro.vehicleModel}</span></p>
                                <p className="text-[10px] text-muted-foreground">Khách hàng: {ro.customer?.name} | Triệu chứng: {parseSymptoms(ro.symptoms).summary}</p>
                              </div>
                            </div>
                            <span className="text-[10px] bg-secondary border border-border px-2 py-0.5 rounded font-bold uppercase">{ro.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category: Khách hàng */}
                  {searchResults.customers.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2">Khách hàng chính thức (CRM)</h4>
                      <div className="space-y-0.5">
                        {searchResults.customers.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => handleResultClick("/crm/customers")}
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-secondary/60 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-600"><User size={16} /></div>
                              <div>
                                <p className="text-sm font-bold">{c.name} — <span className="text-xs text-muted-foreground font-normal">{c.phone}</span></p>
                                <p className="text-[10px] text-muted-foreground">Email: {c.email || "Không có"} | Địa chỉ: {c.address || "Chưa có"}</p>
                              </div>
                            </div>
                            <span className="text-[10px] text-amber-600 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full">{c.loyaltyPoints} điểm</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category: Xe đang bán */}
                  {searchResults.vehicles.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2">Xe đang bán (Kinh doanh)</h4>
                      <div className="space-y-0.5">
                        {searchResults.vehicles.map((v) => (
                          <div
                            key={v.id}
                            onClick={() => handleResultClick("/sales")}
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-secondary/60 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-600"><Car size={16} /></div>
                              <div>
                                <p className="text-sm font-bold">{v.model} — <span className="text-xs font-mono text-muted-foreground font-normal">VIN: {v.vin}</span></p>
                                <p className="text-[10px] text-muted-foreground">Màu: {v.color}</p>
                              </div>
                            </div>
                            <span className="text-[11px] text-primary font-bold">{formatCurrency(Number(v.listPrice))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No results */}
                  {searchResults.customers.length === 0 &&
                    searchResults.vehicles.length === 0 &&
                    searchResults.repairOrders.length === 0 && (
                      <div className="text-center py-10">
                        <p className="text-sm text-muted-foreground">Không tìm thấy bản ghi nào trùng khớp</p>
                      </div>
                    )}
                </>
              )}
            </div>

            {/* Footer tips */}
            <div className="px-4 py-2 bg-muted/50 border-t border-border flex justify-between items-center text-[10px] text-muted-foreground">
              <span>Mẹo: Nhấn phím <kbd className="bg-card px-1 py-0.5 rounded border">Esc</kbd> để đóng nhanh</span>
              <span>Dữ liệu tìm kiếm thời gian thực</span>
            </div>
          </div>
        </div>
      )}

      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onMouseDown={(event) => event.target === event.currentTarget && setProfileModalOpen(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in-bottom">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 className="text-lg font-bold">Thông tin cá nhân</h3>
                <p className="text-xs text-muted-foreground mt-1">Cập nhật tên hiển thị của bạn</p>
              </div>
              <button onClick={() => setProfileModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <form onSubmit={handleProfileSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Họ và tên</label>
                <input required value={profileName} onChange={(event) => setProfileName(event.target.value)} className="w-full px-3 py-2.5 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Email</label>
                <input value={user.email} disabled className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-muted-foreground" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Vai trò</label>
                <input value={roleName(user.role)} disabled className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-muted-foreground" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setProfileModalOpen(false)} className="px-4 py-2 border border-border rounded-xl text-sm hover:bg-secondary/40">Hủy</button>
                <button type="submit" disabled={profileSaving} className="gradient-primary text-white px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-60">{profileSaving ? "Đang lưu..." : "Lưu thay đổi"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onMouseDown={(event) => event.target === event.currentTarget && setPasswordModalOpen(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in-bottom">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 className="text-lg font-bold">Đổi mật khẩu</h3>
                <p className="text-xs text-muted-foreground mt-1">Mật khẩu mới cần có ít nhất 6 ký tự</p>
              </div>
              <button onClick={() => setPasswordModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
              {[
                ["Mật khẩu hiện tại", currentPassword, setCurrentPassword, showCurrentPassword, setShowCurrentPassword],
                ["Mật khẩu mới", newPassword, setNewPassword, showNewPassword, setShowNewPassword],
                ["Xác nhận mật khẩu mới", confirmPassword, setConfirmPassword, showConfirmPassword, setShowConfirmPassword],
              ].map(([label, value, setter, visible, setVisible]) => (
                <div key={label as string}>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{label as string}</label>
                  <div className="relative">
                    <input required type={visible ? "text" : "password"} value={value as string} onChange={(event) => (setter as React.Dispatch<React.SetStateAction<string>>)(event.target.value)} className="w-full px-3 py-2.5 pr-10 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                    <button type="button" onClick={() => (setVisible as React.Dispatch<React.SetStateAction<boolean>>)(!visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setPasswordModalOpen(false)} className="px-4 py-2 border border-border rounded-xl text-sm hover:bg-secondary/40">Hủy</button>
                <button type="submit" disabled={passwordSaving} className="gradient-primary text-white px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-60">{passwordSaving ? "Đang lưu..." : "Đổi mật khẩu"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
