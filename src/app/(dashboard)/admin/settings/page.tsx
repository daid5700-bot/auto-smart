"use client";
import { useEffect, useState } from "react";
import { Settings, Save, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [leaseRate, setLeaseRate] = useState("7.9");
  const [pointsRate, setPointsRate] = useState("1");
  const [zaloAppId, setZaloAppId] = useState("");
  const [zaloAppSecret, setZaloAppSecret] = useState("");
  
  const [zaloAccessToken, setZaloAccessToken] = useState("");
  const [zaloRefreshToken, setZaloRefreshToken] = useState("");
  
  // Track initial values to check if they are dirty before saving
  const [initialZaloAccessToken, setInitialZaloAccessToken] = useState("");
  const [initialZaloRefreshToken, setInitialZaloRefreshToken] = useState("");

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.config) {
          setLeaseRate(data.config.lease_rate || "7.9");
          setPointsRate(data.config.points_rate || "1");
          setZaloAppId(data.config.ZALO_APP_ID || "");
          setZaloAppSecret(data.config.ZALO_APP_SECRET || "");
          setZaloAccessToken(data.config.ZALO_OA_ACCESS_TOKEN || "");
          setZaloRefreshToken(data.config.ZALO_REFRESH_TOKEN || "");
          setInitialZaloAccessToken(data.config.ZALO_OA_ACCESS_TOKEN || "");
          setInitialZaloRefreshToken(data.config.ZALO_REFRESH_TOKEN || "");
        }
      })
      .catch(() => setError("Không thể tải cấu hình"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, string> = {
        lease_rate: leaseRate,
        points_rate: pointsRate,
        ZALO_APP_ID: zaloAppId,
        ZALO_APP_SECRET: zaloAppSecret,
      };

      // Only save tokens if they were manually edited/dirty to avoid overwriting background-refreshed tokens
      if (zaloAccessToken !== initialZaloAccessToken) {
        payload.ZALO_OA_ACCESS_TOKEN = zaloAccessToken;
      }
      if (zaloRefreshToken !== initialZaloRefreshToken) {
        payload.ZALO_REFRESH_TOKEN = zaloRefreshToken;
      }

      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi lưu cấu hình");
      
      // Update initial values so they are clean again
      setInitialZaloAccessToken(zaloAccessToken);
      setInitialZaloRefreshToken(zaloRefreshToken);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 stagger">
      <div>
        <h2 className="text-2xl font-bold">Cấu hình Hệ thống</h2>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl glass-card rounded-xl p-6 space-y-6">
        {/* Section 1: Vehicle Sales */}
        <div className="space-y-4">
          <h3 className="font-bold border-b border-border/40 pb-2">1. Cấu hình Kinh doanh xe</h3>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">
              Lãi suất trả góp ngân hàng cơ bản (% / năm)
            </label>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9.]*"
              value={leaseRate}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, "");
                const parts = val.split(".");
                if (parts.length > 2) return;
                setLeaseRate(val);
              }}
              className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Section 2: Loyalty */}
        <div className="space-y-4">
          <h3 className="font-bold border-b border-border/40 pb-2">2. Chương trình khách hàng thân thiết</h3>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">
              Tỷ lệ tích điểm (% trên tổng thanh toán)
            </label>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9.]*"
              value={pointsRate}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, "");
                const parts = val.split(".");
                if (parts.length > 2) return;
                setPointsRate(val);
              }}
              className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Ví dụ: Tỷ lệ 1% → thanh toán 10.000.000đ sẽ tích được 100.000đ điểm quy đổi.
            </p>
          </div>
        </div>

        {/* Section 3: Zalo API Config */}
        <div className="space-y-4">
          <h3 className="font-bold border-b border-border/40 pb-2">3. Cấu hình Zalo API</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">
                  Zalo App ID
                </label>
                <input
                  type="text"
                  value={zaloAppId}
                  onChange={(e) => setZaloAppId(e.target.value)}
                  placeholder="Nhập Zalo App ID..."
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">
                  Zalo App Secret Key
                </label>
                <input
                  type="password"
                  value={zaloAppSecret}
                  onChange={(e) => setZaloAppSecret(e.target.value)}
                  placeholder="Nhập Zalo App Secret..."
                  className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">
                Zalo Access Token
              </label>
              <textarea
                rows={3}
                value={zaloAccessToken}
                onChange={(e) => setZaloAccessToken(e.target.value)}
                placeholder="Nhập Zalo Access Token..."
                className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono resize-y"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">
                Zalo Refresh Token
              </label>
              <input
                type="text"
                value={zaloRefreshToken}
                onChange={(e) => setZaloRefreshToken(e.target.value)}
                placeholder="Nhập Zalo Refresh Token..."
                className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="flex items-center gap-2 text-xs font-bold text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-xl">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-xs font-bold text-success bg-success/10 border border-success/20 p-3 rounded-xl">
            <CheckCircle2 size={16} /> Lưu cấu hình hệ thống thành công!
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 gradient-primary text-white font-semibold text-sm rounded-xl hover:opacity-90 flex items-center gap-2 disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Đang lưu..." : "Lưu cấu hình"}
        </button>
      </form>
    </div>
  );
}
