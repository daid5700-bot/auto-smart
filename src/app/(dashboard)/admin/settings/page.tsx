"use client";
import { useEffect, useState } from "react";
import { Save, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/store";
import {
  createEmptyZaloCredentials,
  ZALO_AUTH_FIELDS,
  ZALO_CREDENTIAL_KEYS,
  ZALO_TEMPLATE_DEFINITIONS,
  type ZaloCredentialKey,
  type ZaloCredentialValues,
} from "@/lib/zalo-config";

interface SettingsFormState {
  leaseRate: string;
  pointsRate: string;
  credentials: ZaloCredentialValues;
}

const INITIAL_FORM_STATE: SettingsFormState = {
  leaseRate: "7.9",
  pointsRate: "1",
  credentials: createEmptyZaloCredentials(),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function sanitizeDecimal(value: string) {
  const sanitized = value.replace(/[^0-9.]/g, "");
  return sanitized.split(".").length <= 2 ? sanitized : null;
}

function buildFormState(config: Record<string, unknown>): SettingsFormState {
  const credentials = createEmptyZaloCredentials();
  for (const key of ZALO_CREDENTIAL_KEYS) {
    credentials[key] = typeof config[key] === "string" ? config[key] : "";
  }

  return {
    leaseRate:
      typeof config.lease_rate === "string" ? config.lease_rate : "7.9",
    pointsRate:
      typeof config.points_rate === "string" ? config.points_rate : "1",
    credentials,
  };
}

export default function SettingsPage() {
  const { activeBranch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<SettingsFormState>(INITIAL_FORM_STATE);

  useEffect(() => {
    if (!activeBranch?.id) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch("/api/config", { signal: controller.signal })
      .then(async (response) => {
        const data: unknown = await response.json();
        if (!response.ok) {
          const message =
            isRecord(data) && typeof data.error === "string"
              ? data.error
              : "Không thể tải cấu hình";
          throw new Error(message);
        }
        return data;
      })
      .then((data) => {
        if (isRecord(data) && isRecord(data.config)) {
          setForm(buildFormState(data.config));
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [activeBranch?.id]);

  const updateCredential = (key: ZaloCredentialKey, value: string) => {
    setForm((current) => ({
      ...current,
      credentials: { ...current.credentials, [key]: value },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        lease_rate: form.leaseRate,
        points_rate: form.pointsRate,
        credentials: form.credentials,
      };
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const message =
          isRecord(data) && typeof data.error === "string"
            ? data.error
            : "Lỗi lưu cấu hình";
        throw new Error(message);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2
          aria-label="Đang tải cấu hình"
          className="w-8 h-8 animate-spin text-primary"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 stagger">
      <div>
        <h2 className="text-2xl font-bold">Cấu hình Hệ thống</h2>
      </div>

      <form onSubmit={handleSave} className="w-full space-y-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Section 1: Vehicle Sales */}
          <section className="glass-card rounded-xl p-6 space-y-4">
            <h3 className="font-bold border-b border-border/40 pb-2">
              1. Cấu hình Kinh doanh xe
            </h3>
            <div>
              <label
                htmlFor="lease-rate"
                className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase"
              >
                Lãi suất trả góp ngân hàng cơ bản (% / năm)
              </label>
              <input
                id="lease-rate"
                type="text"
                inputMode="decimal"
                pattern="[0-9.]*"
                value={form.leaseRate}
                onChange={(e) => {
                  const value = sanitizeDecimal(e.target.value);
                  if (value !== null) {
                    setForm((current) => ({ ...current, leaseRate: value }));
                  }
                }}
                className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </section>

          {/* Section 2: Loyalty */}
          <section className="glass-card rounded-xl p-6 space-y-4">
            <h3 className="font-bold border-b border-border/40 pb-2">
              2. Chương trình khách hàng thân thiết
            </h3>
            <div>
              <label
                htmlFor="points-rate"
                className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase"
              >
                Tỷ lệ tích điểm (% trên tổng thanh toán)
              </label>
              <input
                id="points-rate"
                type="text"
                inputMode="decimal"
                pattern="[0-9.]*"
                value={form.pointsRate}
                onChange={(e) => {
                  const value = sanitizeDecimal(e.target.value);
                  if (value !== null) {
                    setForm((current) => ({ ...current, pointsRate: value }));
                  }
                }}
                className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Ví dụ: Tỷ lệ 1% → thanh toán 10.000.000đ sẽ tích được 100.000đ
                điểm quy đổi.
              </p>
            </div>
          </section>

          {/* Section 3: Zalo API Config */}
          <section className="glass-card rounded-xl p-6 space-y-4 xl:col-span-2">
            <div className="flex flex-col gap-1 border-b border-border/40 pb-2">
              <h3 className="font-bold">3. Zalo OA theo chi nhánh</h3>
              <p className="text-xs font-semibold text-primary">
                Đang cấu hình: {activeBranch?.name || "Chưa chọn chi nhánh"}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Các thông tin bên dưới được đọc và lưu theo chi nhánh đang chọn ở
              header.
            </p>
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ZALO_AUTH_FIELDS.map((field) => {
                  const inputId = field.key.toLowerCase().replaceAll("_", "-");
                  const className =
                    "fullWidth" in field && field.fullWidth
                      ? "md:col-span-2"
                      : "";

                  return (
                    <div key={field.key} className={className}>
                      <label
                        htmlFor={inputId}
                        className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase"
                      >
                        {field.label}
                      </label>
                      {field.inputType === "textarea" ? (
                        <textarea
                          id={inputId}
                          rows={3}
                          value={form.credentials[field.key]}
                          onChange={(e) =>
                            updateCredential(field.key, e.target.value)
                          }
                          placeholder={field.placeholder}
                          className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono resize-y"
                        />
                      ) : (
                        <input
                          id={inputId}
                          type={field.inputType}
                          value={form.credentials[field.key]}
                          onChange={(e) =>
                            updateCredential(field.key, e.target.value)
                          }
                          placeholder={field.placeholder}
                          className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {ZALO_TEMPLATE_DEFINITIONS.map((template) => {
                  const inputId = template.key
                    .toLowerCase()
                    .replaceAll("_", "-");
                  return (
                    <div key={template.key}>
                      <label
                        htmlFor={inputId}
                        className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase"
                      >
                        {template.label}
                      </label>
                      <input
                        id={inputId}
                        type="text"
                        value={form.credentials[template.key]}
                        onChange={(e) =>
                          updateCredential(template.key, e.target.value)
                        }
                        placeholder="Mã template ZNS..."
                        className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* Messages */}
        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 text-xs font-bold text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-xl"
          >
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {success && (
          <div
            role="status"
            className="flex items-center gap-2 text-xs font-bold text-success bg-success/10 border border-success/20 p-3 rounded-xl"
          >
            <CheckCircle2 size={16} /> Lưu cấu hình hệ thống thành công!
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 gradient-primary text-white font-semibold text-sm rounded-xl hover:opacity-90 flex items-center gap-2 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {saving ? "Đang lưu..." : "Lưu cấu hình"}
        </button>
      </form>
    </div>
  );
}
