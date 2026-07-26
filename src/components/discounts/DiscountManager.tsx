"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Edit,
  Loader2,
  Plus,
  Search,
  TicketPercent,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { NumericInput } from "@/components/NumericInput";
import { useModal } from "@/components/ModalProvider";
import { ModalPortal } from "@/components/modal-portal";
import { CustomSelect } from "@/components/CustomSelect";
import { formatCurrency, formatDate } from "@/lib/utils";

type Scope = "SALES" | "WORKSHOP";

interface Discount {
  id: number;
  code: string;
  name: string;
  scope: Scope;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  target: "ORDER" | "SERVICE" | "PARTS";
  value: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number;
  usageLimit: number | null;
  usedCount: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
}

type DiscountForm = {
  code: string;
  name: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  target: "ORDER" | "SERVICE" | "PARTS";
  value: string;
  maxDiscountAmount: string;
  minOrderAmount: string;
  usageLimit: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

const PAGE_SIZE = 20;

const emptyForm: DiscountForm = {
  code: "",
  name: "",
  discountType: "PERCENTAGE" as const,
  target: "ORDER" as const,
  value: "",
  maxDiscountAmount: "",
  minOrderAmount: "",
  usageLimit: "",
  startsAt: "",
  endsAt: "",
  isActive: true,
};

const toDateInput = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(value))
    : "";

export function DiscountManager({ scope }: { scope: Scope }) {
  const { alert, confirm } = useModal();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<DiscountForm>(emptyForm);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          scope,
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (search.trim()) params.set("search", search.trim());
        const response = await fetch(`/api/discounts?${params}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Không thể tải mã giảm giá");
        setDiscounts(data.discounts || []);
        setTotal(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
      } catch (error: any) {
        if (error?.name === "AbortError") return;
        await alert({
          title: "Không thể tải dữ liệu",
          message: error.message,
          type: "error",
        });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, search.trim() ? 350 : 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [scope, page, search, reloadKey, alert]);

  const reloadDiscounts = () => {
    setReloadKey((value) => value + 1);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (discount: Discount) => {
    setEditingId(discount.id);
    setForm({
      code: discount.code,
      name: discount.name,
      discountType: discount.discountType,
      target: discount.target,
      value: String(discount.value),
      maxDiscountAmount:
        discount.maxDiscountAmount === null ? "" : String(discount.maxDiscountAmount),
      minOrderAmount: String(discount.minOrderAmount || ""),
      usageLimit: discount.usageLimit === null ? "" : String(discount.usageLimit),
      startsAt: toDateInput(discount.startsAt),
      endsAt: toDateInput(discount.endsAt),
      isActive: discount.isActive,
    });
    setFormOpen(true);
  };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      const response = await fetch(
        editingId ? `/api/discounts/${editingId}` : "/api/discounts",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            scope,
            target: scope === "SALES" ? "ORDER" : form.target,
            value: Number(form.value),
            maxDiscountAmount:
              form.discountType === "PERCENTAGE" && form.maxDiscountAmount
                ? Number(form.maxDiscountAmount)
                : null,
            minOrderAmount: Number(form.minOrderAmount || 0),
            usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
            startsAt: form.startsAt || null,
            endsAt: form.endsAt || null,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể lưu mã giảm giá");
      setFormOpen(false);
      setPage(1);
      reloadDiscounts();
      await alert({
        title: "Thành công",
        message: editingId ? "Đã cập nhật mã giảm giá." : "Đã tạo mã giảm giá mới.",
        type: "success",
      });
    } catch (error: any) {
      await alert({ title: "Lưu thất bại", message: error.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const toggleDiscount = async (discount: Discount) => {
    const action = discount.isActive ? "ngừng" : "kích hoạt lại";
    const confirmed = await confirm({
      title: `${discount.isActive ? "Ngừng" : "Kích hoạt"} mã ${discount.code}`,
      message: `Bạn có chắc muốn ${action} mã này? Lịch sử đã sử dụng không bị thay đổi.`,
      type: discount.isActive ? "warning" : "success",
      confirmText: discount.isActive ? "Ngừng mã" : "Kích hoạt",
      cancelText: "Hủy",
    });
    if (!confirmed) return;

    try {
      const response = discount.isActive
        ? await fetch(`/api/discounts/${discount.id}`, { method: "DELETE" })
        : await fetch(`/api/discounts/${discount.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: true }),
          });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Không thể ${action} mã`);
      reloadDiscounts();
    } catch (error: any) {
      await alert({ title: "Thao tác thất bại", message: error.message, type: "error" });
    }
  };

  const targetLabel = (target: Discount["target"]) =>
    target === "SERVICE"
      ? "Tiền công"
      : target === "PARTS"
        ? "Phụ tùng"
        : scope === "SALES"
          ? "Giá xe"
          : "Toàn lệnh";

  const periodLabel = (discount: Discount) => {
    if (!discount.startsAt && !discount.endsAt) return "Không giới hạn";
    return `${discount.startsAt ? formatDate(discount.startsAt) : "Bây giờ"} – ${
      discount.endsAt ? formatDate(discount.endsAt) : "Không giới hạn"
    }`;
  };

  return (
    <div className="space-y-6 stagger">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Quản lý giảm giá</h2>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="min-h-11 gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90"
        >
          <Plus size={16} /> Thêm mã giảm giá
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <label htmlFor="discount-search" className="sr-only">Tìm mã giảm giá</label>
        <input
          id="discount-search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Tìm theo mã hoặc tên chương trình..."
          className="w-full min-h-11 pl-10 pr-4 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-border/50">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[920px]">
            <thead>
              <tr>
                <th>Mã / Chương trình</th>
                <th>Giá trị</th>
                <th>Áp dụng</th>
                <th>Điều kiện tối thiểu</th>
                <th>Thời hạn</th>
                <th>Lượt dùng</th>
                <th>Trạng thái</th>
                <th className="w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {discounts.map((discount) => (
                <tr key={discount.id}>
                  <td>
                    <div className="font-bold text-primary">{discount.code}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{discount.name}</div>
                  </td>
                  <td className="font-semibold">
                    {discount.discountType === "PERCENTAGE"
                      ? `${discount.value}%`
                      : formatCurrency(discount.value)}
                    {discount.maxDiscountAmount !== null && (
                      <div className="text-[10px] text-muted-foreground">
                        Tối đa {formatCurrency(discount.maxDiscountAmount)}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-primary/10 text-primary">
                      {targetLabel(discount.target)}
                    </span>
                  </td>
                  <td>{formatCurrency(discount.minOrderAmount)}</td>
                  <td>
                    <div className="flex items-center gap-1.5 text-xs">
                      <CalendarDays size={13} className="text-muted-foreground" />
                      {periodLabel(discount)}
                    </div>
                  </td>
                  <td className="font-semibold">
                    {discount.usedCount}
                    {discount.usageLimit !== null ? ` / ${discount.usageLimit}` : ""}
                  </td>
                  <td>
                    <span className={`badge ${discount.isActive ? "badge-success" : "badge-danger"}`}>
                      {discount.isActive ? "Đang hoạt động" : "Đã ngừng"}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(discount)}
                        className="min-w-10 min-h-10 inline-flex items-center justify-center rounded-lg text-primary hover:bg-primary/10"
                        aria-label={`Sửa mã ${discount.code}`}
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleDiscount(discount)}
                        className={`min-w-10 min-h-10 inline-flex items-center justify-center rounded-lg ${
                          discount.isActive
                            ? "text-destructive hover:bg-destructive/10"
                            : "text-success hover:bg-success/10"
                        }`}
                        aria-label={`${discount.isActive ? "Ngừng" : "Kích hoạt"} mã ${discount.code}`}
                      >
                        {discount.isActive ? <ToggleLeft size={18} /> : <ToggleRight size={18} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && discounts.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    Chưa có mã giảm giá phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 size={18} className="animate-spin text-primary" /> Đang tải mã giảm giá...
          </div>
        )}
        {!loading && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground font-semibold">
              Hiển thị {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} / {total} mã
            </span>
            <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-0.5 sm:pb-0">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2 py-1 rounded-lg text-xs font-medium border border-border hover:bg-secondary/40 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Trang đầu"
              >
                «
              </button>
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded-lg text-xs font-medium border border-border hover:bg-secondary/40 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Trang trước"
              >
                ‹
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                const targetPage =
                  Math.max(1, Math.min(page - 2, totalPages - 4)) + index;
                if (targetPage > totalPages) return null;
                return (
                  <button
                    key={targetPage}
                    type="button"
                    onClick={() => setPage(targetPage)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                      targetPage === page
                        ? "border-primary bg-primary text-white"
                        : "border-border hover:bg-secondary/40"
                    }`}
                    aria-label={`Trang ${targetPage}`}
                    aria-current={targetPage === page ? "page" : undefined}
                  >
                    {targetPage}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded-lg text-xs font-medium border border-border hover:bg-secondary/40 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Trang sau"
              >
                ›
              </button>
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-2 py-1 rounded-lg text-xs font-medium border border-border hover:bg-secondary/40 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Trang cuối"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {formOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl">
              <div className="sticky top-0 bg-card z-10 flex items-center gap-3 px-6 py-4 border-b border-border">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <TicketPercent size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">
                    {editingId ? "Cập nhật mã giảm giá" : "Thêm mã giảm giá"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Số tiền giảm thực tế luôn được kiểm tra lại trên máy chủ.
                  </p>
                </div>
              </div>

              <form onSubmit={submitForm} className="p-6 space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="space-y-1.5 text-xs font-semibold">
                    <span>Mã giảm giá *</span>
                    <input
                      required
                      value={form.code}
                      onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
                      placeholder="VD: BAODUONG10"
                      className="w-full min-h-11 px-3 bg-secondary/20 border border-border rounded-xl text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                  <label className="space-y-1.5 text-xs font-semibold">
                    <span>Tên chương trình *</span>
                    <input
                      required
                      value={form.name}
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                      placeholder="VD: Ưu đãi bảo dưỡng tháng 7"
                      className="w-full min-h-11 px-3 bg-secondary/20 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 text-xs font-semibold">
                    <span>Loại giảm *</span>
                    <CustomSelect
                      value={form.discountType}
                      onChange={(val) =>
                        setForm({
                          ...form,
                          discountType: val as typeof form.discountType,
                          maxDiscountAmount: "",
                        })
                      }
                      options={[
                        { value: "PERCENTAGE", label: "Theo phần trăm" },
                        { value: "FIXED_AMOUNT", label: "Số tiền cố định" },
                      ]}
                    />
                  </div>
                  <label className="space-y-1.5 text-xs font-semibold">
                    <span>Giá trị *</span>
                    <NumericInput
                      required
                      value={form.value}
                      onChange={(value) => setForm({ ...form, value })}
                      placeholder={form.discountType === "PERCENTAGE" ? "VD: 10" : "VD: 500.000"}
                      className="w-full min-h-11 px-3 bg-secondary/20 border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                  <div className="space-y-1.5 text-xs font-semibold">
                    <span>Áp dụng vào *</span>
                    <CustomSelect
                      value={scope === "SALES" ? "ORDER" : form.target}
                      disabled={scope === "SALES"}
                      onChange={(val) =>
                        setForm({ ...form, target: val as typeof form.target })
                      }
                      options={[
                        { value: "ORDER", label: scope === "SALES" ? "Giá xe" : "Toàn lệnh" },
                        ...(scope === "WORKSHOP"
                          ? [
                              { value: "SERVICE", label: "Tiền công dịch vụ" },
                              { value: "PARTS", label: "Tiền phụ tùng" },
                            ]
                          : []),
                      ]}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <label className="space-y-1.5 text-xs font-semibold">
                    <span>Đơn tối thiểu</span>
                    <NumericInput
                      value={form.minOrderAmount}
                      onChange={(value) => setForm({ ...form, minOrderAmount: value })}
                      placeholder="Không giới hạn"
                      className="w-full min-h-11 px-3 bg-secondary/20 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                  <label className="space-y-1.5 text-xs font-semibold">
                    <span>Giảm tối đa</span>
                    <NumericInput
                      disabled={form.discountType !== "PERCENTAGE"}
                      value={form.maxDiscountAmount}
                      onChange={(value) => setForm({ ...form, maxDiscountAmount: value })}
                      placeholder="Không giới hạn"
                      className="w-full min-h-11 px-3 bg-secondary/20 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    />
                  </label>
                  <label className="space-y-1.5 text-xs font-semibold">
                    <span>Giới hạn lượt dùng</span>
                    <NumericInput
                      value={form.usageLimit}
                      onChange={(value) => setForm({ ...form, usageLimit: value })}
                      placeholder="Không giới hạn"
                      className="w-full min-h-11 px-3 bg-secondary/20 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="space-y-1.5 text-xs font-semibold">
                    <span>Ngày bắt đầu</span>
                    <input
                      type="date"
                      value={form.startsAt}
                      onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
                      className="w-full min-h-11 px-3 bg-secondary/20 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                  <label className="space-y-1.5 text-xs font-semibold">
                    <span>Ngày kết thúc</span>
                    <input
                      type="date"
                      value={form.endsAt}
                      onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
                      className="w-full min-h-11 px-3 bg-secondary/20 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                </div>

                <label className="flex items-center gap-3 min-h-11 px-3 rounded-xl border border-border bg-secondary/10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm font-semibold">Cho phép sử dụng mã ngay</span>
                </label>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="min-h-11 px-5 rounded-xl border border-border text-sm font-semibold hover:bg-secondary/40"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="min-h-11 px-5 rounded-xl gradient-primary text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60"
                  >
                    {saving && <Loader2 size={15} className="animate-spin" />}
                    {editingId ? "Lưu thay đổi" : "Tạo mã"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
