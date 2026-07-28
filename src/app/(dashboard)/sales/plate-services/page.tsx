"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Car,
  CircleDollarSign,
  ClipboardCheck,
  Edit,
  Eye,
  EyeOff,
  Frame,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { CustomSelect } from "@/components/CustomSelect";
import { ModalPortal } from "@/components/modal-portal";
import { useModal } from "@/components/ModalProvider";
import { Pagination } from "@/components/Pagination";
import { formatCurrency } from "@/lib/utils";

type VehicleOption = {
  id: number;
  vin: string;
  model: string;
  variant?: string | null;
  color?: string | null;
  customer?: { id: number; name: string; phone: string } | null;
};

type ProductOption = {
  id: number;
  sku: string;
  name: string;
  stockCount: number;
  movingAvgCost: number;
};

type PlateService = {
  id: number;
  vehicleId: number;
  registrationNumber: string;
  dossierCode: string;
  plateNumber?: string | null;
  totalRevenue: number;
  registrationTax: number;
  plateFee: number;
  policeFee: number;
  plateFrameProductId?: number | null;
  plateFrameQuantity: number;
  plateFrameUnitCost: number;
  plateFrameTotalCost: number;
  profit: number;
  status: string;
  notes?: string | null;
  createdAt: string;
  vehicle?: VehicleOption | null;
  plateFrameProduct?: { id: number; sku: string; name: string } | null;
};

type FormState = {
  vehicleId: string;
  registrationNumber: string;
  dossierCode: string;
  portalPassword: string;
  plateNumber: string;
  totalRevenue: number | "";
  registrationTax: number | "";
  plateFee: number | "";
  policeFee: number | "";
  profit: number | "";
  plateFrameProductId: string;
  plateFrameQuantity: number | "";
  status: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  vehicleId: "",
  registrationNumber: "",
  dossierCode: "",
  portalPassword: "",
  plateNumber: "",
  totalRevenue: "",
  registrationTax: "",
  plateFee: "",
  policeFee: "",
  profit: "",
  plateFrameProductId: "",
  plateFrameQuantity: 0,
  status: "TAX_SUBMITTED",
  notes: "",
};

const STATUS_OPTIONS = [
  { value: "TAX_SUBMITTED", label: "Đã nộp thuế" },
  { value: "DECLARED", label: "Đã khai báo" },
  { value: "PLATE_ISSUED", label: "Đã có biển" },
  { value: "DOCUMENTS_READY", label: "Đã có giấy tờ" },
  { value: "DELIVERED_TO_CUSTOMER", label: "Đã trả khách" },
  { value: "RETURNED_AFTER_TAX", label: "Trả lại hồ sơ sau nộp thuế" },
];

const statusLabel = (status: string) =>
  STATUS_OPTIONS.find((option) => option.value === status)?.label || status;

const statusClass = (status: string) => {
  if (status === "DELIVERED_TO_CUSTOMER") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600";
  if (status === "RETURNED_AFTER_TAX") return "border-rose-500/20 bg-rose-500/10 text-rose-600";
  if (status === "PLATE_ISSUED") return "border-violet-500/20 bg-violet-500/10 text-violet-600";
  if (status === "DOCUMENTS_READY") return "border-cyan-500/20 bg-cyan-500/10 text-cyan-600";
  if (status === "DECLARED") return "border-indigo-500/20 bg-indigo-500/10 text-indigo-600";
  if (status === "TAX_SUBMITTED") return "border-blue-500/20 bg-blue-500/10 text-blue-600";
  return "border-amber-500/20 bg-amber-500/10 text-amber-600";
};

function MoneyInput({
  id,
  value,
  onChange,
  placeholder = "0",
}: {
  id: string;
  value: number | "";
  onChange: (value: number | "") => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      id={id}
      required
      inputMode="numeric"
      value={
        focused
          ? value
          : value === ""
            ? ""
            : Number(value).toLocaleString("vi-VN")
      }
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(event) => {
        const raw = event.target.value.replace(/\D/g, "");
        onChange(raw ? Number(raw) : "");
      }}
      placeholder={placeholder}
      className="w-full rounded-xl border border-border bg-secondary/20 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
    />
  );
}

export default function PlateServicesPage() {
  const modal = useModal();
  const activeRequest = useRef<AbortController | null>(null);
  const [services, setServices] = useState<PlateService[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    returnedAfterTax: 0,
    totalProfit: 0,
    exportedQuantity: 0,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [eligibleVehicles, setEligibleVehicles] = useState<VehicleOption[]>([]);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productsLoading, setProductsLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const fetchServices = useCallback(async () => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const response = await fetch(`/api/sales/plate-services?${params}`, {
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể tải dịch vụ biển.");
      setServices(data.services || []);
      setStats(data.stats || {});
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error(error);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [page, search, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchServices();
    return () => activeRequest.current?.abort();
  }, [fetchServices]);

  const fetchEligibleVehicles = async (query = "", signal?: AbortSignal) => {
    const params = new URLSearchParams({ mode: "eligible", limit: "50" });
    if (query.trim()) params.set("search", query.trim());
    const response = await fetch(`/api/sales/plate-services?${params}`, { signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Không thể tải hồ sơ bán xe.");
    setEligibleVehicles(data.vehicles || []);
  };

  useEffect(() => {
    if (!formOpen || editingId) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetchEligibleVehicles(vehicleSearch, controller.signal).catch((error) => {
        if (error.name !== "AbortError") setFormError(error.message);
      });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [formOpen, editingId, vehicleSearch]);

  const fetchProducts = useCallback(async (
    query = "",
    signal?: AbortSignal,
    selectedProductId?: number,
  ) => {
    const params = new URLSearchParams({
      mode: "products",
      limit: "20",
    });
    if (query.trim()) params.set("search", query.trim());
    if (selectedProductId) params.set("selectedId", String(selectedProductId));
    setProductsLoading(true);
    const response = await fetch(`/api/sales/plate-services?${params}`, { signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Không thể tải phụ tùng.");
    setProducts(data.products || []);
    setProductsLoading(false);
  }, []);

  useEffect(() => {
    if (!formOpen) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetchProducts(
        productSearch,
        controller.signal,
        form.plateFrameProductId
          ? Number(form.plateFrameProductId)
          : undefined,
      )
        .catch((error) => {
          if (error.name !== "AbortError") setFormError(error.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setProductsLoading(false);
        });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [fetchProducts, form.plateFrameProductId, formOpen, productSearch]);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setVehicleSearch("");
    setProductSearch("");
    setShowPassword(false);
    setFormOpen(true);
  };

  const openEditForm = async (id: number) => {
    setEditingId(id);
    setFormError("");
    setShowPassword(false);
    setFormOpen(true);
    try {
      const response = await fetch(`/api/sales/plate-services/${id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể tải hồ sơ.");
      setForm({
        vehicleId: String(data.vehicleId),
        registrationNumber: data.registrationNumber || "",
        dossierCode: data.dossierCode || "",
        portalPassword: data.portalPassword || "",
        plateNumber: data.plateNumber || "",
        totalRevenue: Number(data.totalRevenue || 0),
        registrationTax: Number(data.registrationTax || 0),
        plateFee: Number(data.plateFee || 0),
        policeFee: Number(data.policeFee || 0),
        profit: Number(data.profit || 0),
        plateFrameProductId: data.plateFrameProductId
          ? String(data.plateFrameProductId)
          : "",
        plateFrameQuantity: Number(data.plateFrameQuantity || 0),
        status: data.status || "TAX_SUBMITTED",
        notes: data.notes || "",
      });
      if (data.vehicle) setEligibleVehicles([data.vehicle]);
      setProductSearch(data.plateFrameProduct?.sku || "");
    } catch (error: any) {
      setFormError(error.message);
    }
  };

  const submitForm = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      if (!editingId && !form.vehicleId) {
        throw new Error("Vui lòng chọn hồ sơ bán xe.");
      }
      const payload = {
        ...form,
        vehicleId: Number(form.vehicleId),
        plateFrameProductId: form.plateFrameProductId
          ? Number(form.plateFrameProductId)
          : null,
        plateFrameQuantity: form.plateFrameProductId
          ? Number(form.plateFrameQuantity || 0)
          : 0,
        totalRevenue: Number(form.totalRevenue || 0),
        registrationTax: Number(form.registrationTax || 0),
        plateFee: Number(form.plateFee || 0),
        policeFee: Number(form.policeFee || 0),
        profit: Number(form.profit || 0),
        plateNumber: form.plateNumber || null,
        notes: form.notes || null,
      };
      if (editingId) delete (payload as any).vehicleId;
      const response = await fetch(
        editingId
          ? `/api/sales/plate-services/${editingId}`
          : "/api/sales/plate-services",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        const firstFieldError = data.fields
          ? Object.values(data.fields).flat().find(Boolean)
          : null;
        throw new Error(String(firstFieldError || data.error || "Không thể lưu hồ sơ."));
      }
      setFormOpen(false);
      await modal.alert({
        title: "Thành công",
        message: editingId
          ? "Đã cập nhật dịch vụ biển."
          : "Đã tạo dịch vụ biển và xuất ốp biển khỏi kho.",
        type: "success",
      });
      await fetchServices();
    } catch (error: any) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dịch vụ biển</h1>
          </div>
          <button
            type="button"
            onClick={openCreateForm}
            className="gradient-primary flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
          >
            <Plus size={17} /> Tạo hồ sơ dịch vụ
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            { label: "Tổng hồ sơ", value: stats.total, icon: ClipboardCheck, color: "text-primary" },
            { label: "Đã trả khách", value: stats.completed, icon: BadgeCheck, color: "text-emerald-600" },
            { label: "Trả lại sau nộp thuế", value: stats.returnedAfterTax, icon: RotateCcw, color: "text-rose-600" },
            { label: "Tổng lợi nhuận", value: formatCurrency(stats.totalProfit), icon: CircleDollarSign, color: "text-blue-600" },
            { label: "Số lượng ốp biển xuất", value: stats.exportedQuantity, icon: Frame, color: "text-amber-600" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Icon size={15} className={item.color} />
                  {item.label}
                </div>
                <p className={`mt-2 text-xl font-black ${item.color}`}>{item.value}</p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-3 rounded-xl border border-border bg-card p-3 md:grid-cols-[minmax(240px,1fr)_190px_150px_150px]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm mã hồ sơ, số đăng ký, biển số, khách hàng..."
              className="min-h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <CustomSelect
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            options={[{ value: "ALL", label: "Tất cả trạng thái" }, ...STATUS_OPTIONS]}
            size="sm"
          />
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPage(1);
            }}
            aria-label="Từ ngày"
            className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPage(1);
            }}
            aria-label="Đến ngày"
            className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-xs">
              <thead className="border-b border-border bg-secondary/30 text-muted-foreground">
                <tr>
                  <th className="p-4">Hồ sơ</th>
                  <th className="p-4">Khách hàng</th>
                  <th className="p-4">Xe</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4">Tổng thu / Chi phí</th>
                  <th className="p-4">Lợi nhuận</th>
                  <th className="p-4">Ốp biển xuất</th>
                  <th className="p-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                    </td>
                  </tr>
                ) : services.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-muted-foreground">
                      Chưa có hồ sơ dịch vụ biển phù hợp.
                    </td>
                  </tr>
                ) : (
                  services.map((service) => (
                    <tr key={service.id} className="transition-colors hover:bg-secondary/10">
                      <td className="p-4">
                        <p className="font-bold text-foreground">{service.dossierCode || "—"}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Số ĐK: {service.registrationNumber || "—"}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold">{service.vehicle?.customer?.name || "—"}</p>
                        <p className="mt-1 text-muted-foreground">{service.vehicle?.customer?.phone || "—"}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold">{service.vehicle?.model || "—"}</p>
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground">{service.vehicle?.vin || "—"}</p>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${statusClass(service.status)}`}>
                          {statusLabel(service.status)}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-emerald-600">{formatCurrency(service.totalRevenue)}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Chi: {formatCurrency(
                            service.registrationTax +
                              service.plateFee +
                              service.policeFee +
                              service.plateFrameTotalCost,
                          )}
                        </p>
                      </td>
                      <td className={`p-4 font-black ${service.profit < 0 ? "text-rose-600" : "text-blue-600"}`}>
                        {formatCurrency(service.profit)}
                      </td>
                      <td className="p-4">
                        {service.plateFrameQuantity > 0 ? (
                          <>
                            <p className="font-semibold">{service.plateFrameQuantity} đơn vị</p>
                            <p className="mt-1 max-w-36 truncate text-[10px] text-muted-foreground">
                              {service.plateFrameProduct?.name || "—"}
                            </p>
                          </>
                        ) : (
                          <span className="font-medium text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => openEditForm(service.id)}
                          aria-label={`Sửa hồ sơ ${service.dossierCode}`}
                          className="rounded-lg p-2 text-primary transition hover:bg-primary/10"
                        >
                          <Edit size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={stats.total}
            itemLabel="hồ sơ"
            onPageChange={setPage}
          />
        </div>
      </div>

      {formOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm">
            <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5 text-primary">
                    <BadgeCheck size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">
                      {editingId ? "Cập nhật dịch vụ biển" : "Tạo hồ sơ dịch vụ biển"}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Lợi nhuận được nhập trực tiếp; tồn kho ốp biển được hệ thống cập nhật tự động.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  aria-label="Đóng biểu mẫu"
                  className="rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                >
                  <X size={19} />
                </button>
              </div>

              <form onSubmit={submitForm} className="overflow-y-auto p-5">
                {formError && (
                  <div role="alert" className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                    {formError}
                  </div>
                )}

                <div className="space-y-5">
                  {/* Section 1: Hồ sơ xe */}
                  <section>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                      <Car size={16} className="text-primary" /> Hồ sơ bán xe
                    </h3>
                    <div>
                      <label htmlFor="plate-vehicle" className="mb-1.5 block text-xs font-bold text-muted-foreground">
                        Hồ sơ có chọn dịch vụ biển <span className="text-destructive">*</span>
                      </label>
                      <CustomSelect
                        id="plate-vehicle"
                        value={form.vehicleId}
                        onChange={(value) => setForm((current) => ({ ...current, vehicleId: String(value) }))}
                        disabled={Boolean(editingId)}
                        searchable
                        placeholder="-- Chọn hồ sơ bán xe --"
                        options={eligibleVehicles.map((vehicle) => ({
                          value: String(vehicle.id),
                          label: `${vehicle.customer?.name || "Chưa có khách"} — ${vehicle.model}`,
                          sublabel: `${vehicle.customer?.phone || "—"} · VIN ${vehicle.vin}`,
                        }))}
                      />
                    </div>
                  </section>

                  {/* Section 2: Thông tin hồ sơ & Tài khoản (3 cột) */}
                  <section className="grid gap-4 grid-cols-1 md:grid-cols-3">
                    <div>
                      <label htmlFor="registration-number" className="mb-1.5 block text-xs font-bold text-muted-foreground">
                        Số đăng ký
                      </label>
                      <input
                        id="registration-number"
                        maxLength={100}
                        value={form.registrationNumber}
                        onChange={(event) => setForm((current) => ({ ...current, registrationNumber: event.target.value }))}
                        className="w-full rounded-xl border border-border bg-secondary/20 px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label htmlFor="dossier-code" className="mb-1.5 block text-xs font-bold text-muted-foreground">
                        Mã hồ sơ
                      </label>
                      <input
                        id="dossier-code"
                        maxLength={100}
                        value={form.dossierCode}
                        onChange={(event) => setForm((current) => ({ ...current, dossierCode: event.target.value }))}
                        className="w-full rounded-xl border border-border bg-secondary/20 px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label htmlFor="portal-password" className="mb-1.5 block text-xs font-bold text-muted-foreground">
                        Mật khẩu hồ sơ
                      </label>
                      <div className="relative">
                        <input
                          id="portal-password"
                          type={showPassword ? "text" : "password"}
                          maxLength={200}
                          value={form.portalPassword}
                          onChange={(event) => setForm((current) => ({ ...current, portalPassword: event.target.value }))}
                          className="w-full rounded-xl border border-border bg-secondary/20 px-3 py-2.5 pr-10 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((visible) => !visible)}
                          aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-secondary"
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* Section 3: Tài chính & Chi phí (3 cột) */}
                  <section className="grid gap-4 grid-cols-1 md:grid-cols-3">
                    <div>
                      <label htmlFor="plate-number" className="mb-1.5 block text-xs font-bold text-muted-foreground">
                        Biển số
                      </label>
                      <input
                        id="plate-number"
                        maxLength={30}
                        value={form.plateNumber}
                        onChange={(event) => setForm((current) => ({ ...current, plateNumber: event.target.value.toUpperCase() }))}
                        placeholder="VD: 51A-123.45"
                        className="w-full rounded-xl border border-border bg-secondary/20 px-3 py-2.5 text-sm font-semibold uppercase outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    {[
                      ["totalRevenue", "Tổng thu"],
                      ["registrationTax", "Lệ phí trước bạ"],
                      ["plateFee", "Phí biển"],
                      ["policeFee", "Phí công an"],
                    ].map(([field, label]) => (
                      <div key={field}>
                        <label htmlFor={field} className="mb-1.5 block text-xs font-bold text-muted-foreground">
                          {label} (VNĐ)
                        </label>
                        <MoneyInput
                          id={field}
                          value={form[field as keyof FormState] as number | ""}
                          onChange={(value) => setForm((current) => ({ ...current, [field]: value }))}
                        />
                      </div>
                    ))}
                    <div>
                      <label htmlFor="profit" className="mb-1.5 block text-xs font-bold text-muted-foreground">
                        Lợi nhuận nhập trực tiếp (VNĐ)
                      </label>
                      <input
                        id="profit"
                        type="number"
                        inputMode="decimal"
                        min={-10_000_000_000}
                        max={10_000_000_000}
                        value={form.profit}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            profit: event.target.value === "" ? "" : Number(event.target.value),
                          }))
                        }
                        placeholder="Nhập lợi nhuận"
                        className="w-full rounded-xl border border-border bg-secondary/20 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </section>

                  {/* Section 4: Ốp biển & Trạng thái (3 cột) */}
                  <section className="grid gap-4 grid-cols-1 md:grid-cols-3">
                    <div className="md:col-span-2">
                      <label htmlFor="plate-frame-product" className="mb-1.5 block text-xs font-bold text-muted-foreground">
                        Ốp biển từ kho phụ tùng
                      </label>
                      <CustomSelect
                        id="plate-frame-product"
                        value={form.plateFrameProductId}
                        onChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            plateFrameProductId: String(value),
                            plateFrameQuantity: value ? Math.max(1, Number(current.plateFrameQuantity || 0)) : 0,
                          }))
                        }
                        searchable
                        clearable
                        onSearchChange={setProductSearch}
                        searchLoading={productsLoading}
                        placeholder="-- Không xuất ốp biển --"
                        options={[
                          { value: "", label: "-- Không xuất ốp biển --" },
                          ...products.map((product) => ({
                            value: String(product.id),
                            label: `${product.sku} — ${product.name}`,
                            sublabel: `Tồn: ${product.stockCount} · Giá vốn: ${formatCurrency(product.movingAvgCost)}`,
                            disabled: product.stockCount <= 0,
                          })),
                        ]}
                      />
                    </div>
                    <div>
                      <label htmlFor="plate-frame-quantity" className="mb-1.5 block text-xs font-bold text-muted-foreground">
                        Số lượng xuất
                      </label>
                      <input
                        id="plate-frame-quantity"
                        type="number"
                        min={form.plateFrameProductId ? 1 : 0}
                        max={100}
                        disabled={!form.plateFrameProductId}
                        value={form.plateFrameQuantity}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            plateFrameQuantity: event.target.value ? Number(event.target.value) : "",
                          }))
                        }
                        className="w-full rounded-xl border border-border bg-secondary/20 px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label htmlFor="plate-service-status" className="mb-1.5 block text-xs font-bold text-muted-foreground">
                        Trạng thái hồ sơ
                      </label>
                      <CustomSelect
                        id="plate-service-status"
                        value={form.status}
                        onChange={(value) => setForm((current) => ({ ...current, status: value }))}
                        options={STATUS_OPTIONS}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="plate-service-notes" className="mb-1.5 block text-xs font-bold text-muted-foreground">
                        Ghi chú
                      </label>
                      <input
                        id="plate-service-notes"
                        maxLength={5000}
                        value={form.notes}
                        onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                        placeholder="Ghi chú thêm..."
                        className="w-full rounded-xl border border-border bg-secondary/20 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </section>
                </div>

                <div className="mt-5 flex justify-end gap-3 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="min-h-11 rounded-xl border border-border px-5 text-sm font-bold transition hover:bg-secondary"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="gradient-primary flex min-h-11 min-w-40 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    {editingId ? "Lưu cập nhật" : "Tạo dịch vụ"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
