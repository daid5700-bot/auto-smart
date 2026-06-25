"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store";
import { getDefaultPath } from "@/config/rbac";
import { Car, Lock, Mail, Eye, EyeOff, Zap, Shield, BarChart3, Wrench } from "lucide-react";

// Roles used for initial routing inside getDefaultPath

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const success = await login(email, password);
    if (success) {
      const state = useAuth.getState();
      const u = state.user;
      const branches = state.branches;
      if (u) {
        if (branches.length > 1) {
          router.push("/select-branch");
        } else {
          router.push(getDefaultPath(u.role));
        }
      }
    } else setError("Email hoặc mật khẩu không đúng. Thử: admin@autosmart.vn / admin123");
    setLoading(false);
  };



  return (
    <div className="min-h-screen flex bg-background bg-grid-pattern">
      {/* Left — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 gradient-primary opacity-[0.07]" />
        <div className="absolute inset-0 bg-dot-pattern opacity-30" />
        <div className="relative z-10 px-16 animate-slide-in-left">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center glow-blue"><Car size={28} className="text-white" /></div>
            <div><h1 className="text-3xl font-bold">AUTO-SMART</h1><p className="text-sm text-muted-foreground font-medium">CRM & ERP Platform</p></div>
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-6"><span className="gradient-text">Số hóa toàn diện</span><br />Đại lý & Garage Ô tô</h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-lg">Quản lý kho phụ tùng, xưởng sửa chữa, bán xe và chăm sóc khách hàng — tất cả trong một nền tảng.</p>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            {[
              { icon: <BarChart3 size={20} />, t: "Phân tích Realtime", d: "Báo cáo doanh thu tức thì" },
              { icon: <Wrench size={20} />, t: "Xưởng thông minh", d: "Quản lý KTV & lệnh sửa chữa" },
              { icon: <Zap size={20} />, t: "Tự động hóa", d: "ZNS nhắc lịch bảo dưỡng" },
              { icon: <Shield size={20} />, t: "Phân quyền RBAC", d: "Bảo mật theo phòng ban" },
            ].map((f, i) => (
              <div key={i} className="glass-card rounded-xl p-4 hover:-translate-y-0.5 transition-transform duration-300">
                <div className="text-primary mb-2">{f.icon}</div>
                <h3 className="text-sm font-semibold">{f.t}</h3>
                <p className="text-xs text-muted-foreground mt-1">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-slide-in-bottom">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center"><Car size={24} className="text-white" /></div>
            <div><h1 className="text-2xl font-bold">AUTO-SMART</h1><p className="text-xs text-muted-foreground">CRM & ERP</p></div>
          </div>

          <div className="glass-card rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-1">Đăng nhập</h2>
            <p className="text-muted-foreground text-sm mb-8">Vui lòng đăng nhập để tiếp tục</p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium mb-2">Email</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@autosmart.vn" className="w-full pl-10 pr-4 py-3 bg-secondary/50 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all" />
                </div>
              </div>
              <div>
                <label htmlFor="login-password" className="block text-sm font-medium mb-2">Mật khẩu</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input id="login-password" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-10 pr-12 py-3 bg-secondary/50 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showPw ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>
              {error && <p className="text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" disabled={loading} className="w-full py-3 rounded-xl gradient-primary text-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Đăng nhập"}
              </button>
            </form>
          </div>


        </div>
      </div>
    </div>
  );
}
