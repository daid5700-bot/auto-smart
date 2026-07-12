"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type Branch } from "@/lib/store";
import { getDefaultPath } from "@/config/rbac";
import { Building2, ArrowRight, LogOut, Car } from "lucide-react";

export default function SelectBranchPage() {
  const router = useRouter();
  const { user, branches, activeBranch, setActiveBranch, logout, hydrate } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [displayBranches, setDisplayBranches] = useState<any[]>([]);
  const [branchesLoaded, setBranchesLoaded] = useState(false);

  useEffect(() => {
    hydrate();
    setMounted(true);
  }, [hydrate]);

  useEffect(() => {
    if (mounted && user) {
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
  }, [mounted, user, branches]);

  useEffect(() => {
    if (mounted && branchesLoaded) {
      if (!user) {
        router.push("/login");
      } else if (displayBranches.length === 0) {
        // Fallback if no branch assigned, direct to home
        router.push(getDefaultPath(user.role));
      } else if (displayBranches.length === 1) {
        // Auto select and redirect
        setActiveBranch(displayBranches[0]);
        router.push(getDefaultPath(user.role));
      }
    }
  }, [mounted, user, displayBranches, branchesLoaded, router, setActiveBranch]);

  if (!mounted || !user || !branchesLoaded || displayBranches.length <= 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-grid-pattern">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Đang chuyển hướng...</p>
        </div>
      </div>
    );
  }

  const handleSelect = (branch: Branch) => {
    setActiveBranch(branch);
    router.push(getDefaultPath(user.role));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background bg-grid-pattern">
      <div className="w-full max-w-2xl animate-slide-in-bottom">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
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
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-blue">
                <Car size={20} className="text-white" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold">Xe Máy Toàn Thắng</h1>
              <p className="text-xs text-muted-foreground font-medium">Hệ thống CRM & ERP</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors py-2 px-3 rounded-lg hover:bg-destructive/10"
          >
            <LogOut size={14} />
            Đăng xuất
          </button>
        </div>

        <div className="glass-card rounded-2xl p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-1">Chọn Cơ sở Làm việc</h2>
            <p className="text-muted-foreground text-sm">
              Tài khoản của bạn thuộc nhiều cơ sở. Vui lòng chọn cơ sở hoạt động hiện tại để truy cập hệ thống.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayBranches.map((branch) => {
              const isActive = activeBranch?.id === branch.id;
              return (
                <button
                  key={branch.id}
                  onClick={() => handleSelect(branch)}
                  className={`group relative text-left p-6 rounded-xl border transition-all duration-300 flex flex-col justify-between h-40 ${
                    isActive
                      ? "border-primary bg-primary/5 hover:bg-primary/10"
                      : "border-border hover:border-primary/50 bg-card hover:bg-accent/30"
                  }`}
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform overflow-hidden shadow-sm">
                      {branch.logoUrl ? (
                        <div className="w-full h-full bg-white p-0.5 flex items-center justify-center"><img src={branch.logoUrl} alt={branch.name} className="w-full h-full object-contain" /></div>
                      ) : branch.name.toLowerCase().includes("vinfast") ? (
                        <div className="w-full h-full bg-white p-1 flex items-center justify-center"><img src="/vinfast.png" alt="Vinfast" className="w-full h-full object-contain" /></div>
                      ) : branch.name.toLowerCase().includes("yamaha") ? (
                        <div className="w-full h-full bg-white p-1 flex items-center justify-center"><img src="/yamaha.png" alt="Yamaha" className="w-full h-full object-contain" /></div>
                      ) : (
                        <Building2 size={20} />
                      )}
                    </div>
                    <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                      {branch.name}
                    </h3>
                    {branch.address && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {branch.address}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity self-end mt-4">
                    Truy cập
                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
