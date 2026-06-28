"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate, statusText, statusBadge, handleNumericInputChange } from "@/lib/utils";
import { Wrench, Plus, CheckCircle2, AlertTriangle, Eye, Edit, Trash2, X, Loader2, Printer, ClipboardList } from "lucide-react";
import { createPartsRequisition } from "@/app/actions";
import { useAuth } from "@/lib/store";

const RO_COLS = [
  { status: "WAITING_PARTS", label: "Chờ phụ tùng", border: "border-t-rose-500/50" },
  { status: "DOING", label: "Đang sửa", border: "border-t-purple-500/50" },
  { status: "DONE", label: "Hoàn thành", border: "border-t-emerald-500/50" },
];

export default function WorkshopPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "list" | "requisitions">("kanban");
  
  // Printing state
  const [printOpen, setPrintOpen] = useState(false);
  const [printRo, setPrintRo] = useState<any>(null);

  // Requisition states
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqModalOpen, setReqModalOpen] = useState(false);
  const [branchProducts, setBranchProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [detailReqOpen, setDetailReqOpen] = useState(false);
  const [detailReq, setDetailReq] = useState<any>(null);
  
  const [reqFormData, setReqFormData] = useState<{
    repairOrderId: string;
    reason: string;
    items: {
      productId: string;
      quantity: number | "";
      priceType: "RETAIL" | "WHOLESALE" | "INSURANCE";
      customUnitPrice?: number | "";
      searchQuery: string;
      showDropdown: boolean;
    }[];
  }>({
    repairOrderId: "",
    reason: "",
    items: [{ productId: "", quantity: 1, priceType: "RETAIL", searchQuery: "", showDropdown: false }],
  });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<{
    plateNumber: string;
    vehicleModel: string;
    kmIn: number | "";
    symptoms: string;
    status: string;
    technicianId: string;
    laborCost: number | "";
    partsCost: number | "";
    customerId: string;
    carCondition: string;
  }>({
    plateNumber: "",
    vehicleModel: "",
    kmIn: "",
    symptoms: "",
    status: "PENDING",
    technicianId: "",
    laborCost: "",
    partsCost: "",
    customerId: "", // auto-populated for demo
    carCondition: "",
  });

  const fetchRequisitions = () => {
    setReqLoading(true);
    fetch("/api/workshop/requisitions")
      .then((r) => r.json())
      .then((d) => setRequisitions(d.requisitions || []))
      .catch((err) => console.error(err))
      .finally(() => setReqLoading(false));
  };

  const fetchBranchProducts = () => {
    setProductsLoading(true);
    fetch("/api/inventory?scope=current")
      .then((r) => r.json())
      .then((d) => setBranchProducts(d.products || []))
      .catch((err) => console.error(err))
      .finally(() => setProductsLoading(false));
  };

  const updateItem = (idx: number, fields: Partial<typeof reqFormData.items[0]>) => {
    const newItems = [...reqFormData.items];
    newItems[idx] = { ...newItems[idx], ...fields };
    
    if (fields.priceType !== undefined || fields.productId !== undefined) {
      const targetProductId = fields.productId ?? newItems[idx].productId;
      const targetPriceType = fields.priceType ?? newItems[idx].priceType;
      
      if (targetProductId) {
        const prod = branchProducts.find((p) => p.id.toString() === targetProductId);
        if (prod) {
          const price = prod.prices.find((p: any) => p.type === targetPriceType)?.amount || 0;
          newItems[idx].customUnitPrice = Number(price);
        }
      }
    }
    
    setReqFormData({ ...reqFormData, items: newItems });
  };

  const addItemRow = () => {
    setReqFormData({
      ...reqFormData,
      items: [...reqFormData.items, { productId: "", quantity: 1, priceType: "RETAIL", searchQuery: "", showDropdown: false }],
    });
  };

  const removeItemRow = (idx: number) => {
    const newItems = reqFormData.items.filter((_, i) => i !== idx);
    setReqFormData({
      ...reqFormData,
      items: newItems.length > 0 ? newItems : [{ productId: "", quantity: 1, priceType: "RETAIL", searchQuery: "", showDropdown: false }]
    });
  };

  const calculateTotalRequisition = () => {
    return reqFormData.items.reduce((sum, item) => {
      if (!item.productId) return sum;
      const prod = branchProducts.find((p) => p.id.toString() === item.productId);
      if (!prod) return sum;
      const unitPrice = item.customUnitPrice ?? Number(prod.prices.find((p: any) => p.type === item.priceType)?.amount || 0);
      return sum + ((Number(unitPrice) || 0) * (Number(item.quantity) || 0));
    }, 0);
  };

  const handleSaveRequisition = async () => {
    if (!reqFormData.repairOrderId) {
      alert("Vui lòng chọn Lệnh sửa chữa (RO)!");
      return;
    }
    
    if (reqFormData.items.some((i) => !i.productId)) {
      alert("Vui lòng chọn phụ tùng cho tất cả các dòng!");
      return;
    }

    try {
      setReqLoading(true);
      const payload = {
        repairOrderId: parseInt(reqFormData.repairOrderId),
        reason: reqFormData.reason,
        createdBy: user?.name || "Cố vấn dịch vụ",
        items: reqFormData.items.map((i) => ({
          productId: parseInt(i.productId),
          quantity: Number(i.quantity) || 0,
          priceType: i.priceType,
          customUnitPrice: Number(i.customUnitPrice) || 0
        }))
      };

      const res = await createPartsRequisition(payload);
      
      if (res.success) {
        setReqModalOpen(false);
        setView("requisitions");
        fetchRequisitions();
        fetchData();
      } else {
        alert("Lập phiếu thất bại!");
      }
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setReqLoading(false);
    }
  };

  const fetchData = () => {
    fetch("/api/workshop")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa lệnh sửa chữa này?")) return;
    try {
      const res = await fetch(`/api/workshop/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      plateNumber: "",
      vehicleModel: "",
      kmIn: "",
      symptoms: "",
      status: "PENDING",
      technicianId: data?.technicians?.[0]?.id?.toString() || "",
      laborCost: "",
      partsCost: "",
      customerId: data?.customers?.[0]?.id?.toString() || "1",
      carCondition: "",
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (ro: any) => {
    setEditingId(ro.id);
    setFormData({
      plateNumber: ro.plateNumber,
      vehicleModel: ro.vehicleModel,
      kmIn: ro.kmIn,
      symptoms: ro.symptoms,
      status: ro.status,
      technicianId: ro.technicianId?.toString() || "",
      laborCost: Number(ro.laborCost),
      partsCost: Number(ro.partsCost),
      customerId: ro.customerId?.toString() || "",
      carCondition: ro.photos?.[0] || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `/api/workshop/${editingId}` : "/api/workshop";

      const payload = {
        plateNumber: formData.plateNumber,
        vehicleModel: formData.vehicleModel,
        kmIn: Number(formData.kmIn),
        symptoms: formData.symptoms,
        status: formData.status,
        laborCost: Number(formData.laborCost),
        partsCost: Number(formData.partsCost),
        technicianId: formData.technicianId ? parseInt(formData.technicianId) : null,
        customerId: formData.customerId ? parseInt(formData.customerId) : 1,
        photos: formData.carCondition ? [formData.carCondition] : [],
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setModalOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (roId: number, targetStatus: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/workshop/${roId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Không thể cập nhật trạng thái");
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const roId = e.dataTransfer.getData("text/plain");
    if (!roId) return;
    await handleUpdateStatus(parseInt(roId), targetStatus);
  };

  const getFilteredProducts = (query: string) => {
    const q = query.toLowerCase().trim();
    if (!q) return branchProducts.slice(0, 10);
    return branchProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const repairOrders = data?.repairOrders || [];
  const technicians = data?.technicians || [];
  const customers = data?.customers || [];

  return (
    <div className="space-y-6 stagger">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold">Xưởng dịch vụ</h2></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { fetchBranchProducts(); setReqFormData({ repairOrderId: "", reason: "", items: [{ productId: "", quantity: 1, priceType: "RETAIL", searchQuery: "", showDropdown: false }] }); setReqModalOpen(true); }} className="bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 w-fit">
            <ClipboardList size={16} /> Xin phụ tùng
          </button>
          <button onClick={() => router.push("/workshop/new")} className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 w-fit"><Plus size={16} />Tạo lệnh sửa chữa (RO)</button>
        </div>
      </div>

      {/* KTV status tracking */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {technicians.map((ktv: any) => (
          <div key={ktv.id} className="glass-card rounded-xl p-4 flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center text-sm font-bold text-primary">{ktv.name?.charAt(0)}</div>
              <span className={`status-dot absolute bottom-0 right-0 ${ktv.status === "IDLE" ? "online" : "busy"}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{ktv.name}</p>
              <p className="text-[10px] text-muted-foreground">{ktv.status === "IDLE" ? "Đang rảnh" : "Đang sửa xe"}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setView("kanban")} className={`px-4 py-2 rounded-xl text-xs font-semibold ${view === "kanban" ? "bg-primary text-white" : "bg-card border border-border"}`}>Kanban Board</button>
        <button onClick={() => setView("list")} className={`px-4 py-2 rounded-xl text-xs font-semibold ${view === "list" ? "bg-primary text-white" : "bg-card border border-border"}`}>Lệnh sửa chữa (RO)</button>
        <button onClick={() => { setView("requisitions"); fetchRequisitions(); }} className={`px-4 py-2 rounded-xl text-xs font-semibold ${view === "requisitions" ? "bg-primary text-white" : "bg-card border border-border"}`}>Phiếu xin phụ tùng</button>
      </div>

      {view === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
          {RO_COLS.map((col) => {
            const items = repairOrders.filter((ro: any) => ro.status === col.status);
            return (
              <div
                key={col.status}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, col.status)}
                className={`kanban-column p-3 border-t-2 ${col.border} min-h-[350px] transition-colors duration-200 hover:bg-secondary/15 rounded-b-xl`}
              >
                <div className="flex items-center justify-between mb-3"><h3 className="text-xs font-semibold text-muted-foreground uppercase">{col.label}</h3><span className="badge badge-primary text-[10px]">{items.length}</span></div>
                <div className="space-y-2">
                  {items.map((ro: any) => (
                    <div
                      key={ro.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", ro.id.toString())}
                      className="kanban-card group cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-primary">{ro.plateNumber}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => router.push(`/workshop/invoice/${ro.id}`)} className="p-1 hover:bg-secondary text-primary rounded" title="In hóa đơn"><Printer size={12} /></button>
                          <button onClick={() => handleOpenEdit(ro)} className="p-1 hover:bg-secondary text-primary rounded"><Edit size={12} /></button>
                          <button onClick={() => handleDelete(ro.id)} className="p-1 hover:bg-secondary text-destructive rounded"><Trash2 size={12} /></button>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-foreground mb-1">{ro.vehicleModel}</p>
                      <p className="text-[10px] text-muted-foreground mb-2 line-clamp-1">Khách: {ro.customer?.name}</p>
                      <p className="text-[10px] text-muted-foreground italic mb-2 line-clamp-2">" {ro.symptoms} "</p>
                      {ro.photos?.[0] && <p className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100/60 mb-2 truncate">⚠️ Tình trạng: {ro.photos[0]}</p>}
                      <div className="flex items-center justify-between pt-2 border-t border-border/30">
                        <span className="text-[10px] text-muted-foreground">KTV: {ro.technician?.name || "Chưa giao"}</span>
                        <span className="text-[10px] font-bold text-primary">{formatCurrency(Number(ro.totalAmount))}</span>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-6 opacity-40">Trống</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "list" && (
        <div className="glass-card rounded-xl overflow-hidden">
          <table className="data-table">
            <thead><tr><th>Biển số</th><th>Dòng xe</th><th>Khách hàng</th><th>KTV phụ trách</th><th>Triệu chứng</th><th>Chi phí</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>{repairOrders.map((ro: any) => (
              <tr key={ro.id}>
                <td><span className="font-semibold text-primary">{ro.plateNumber}</span></td>
                <td>
                  <div>
                    <p className="font-medium">{ro.vehicleModel}</p>
                    {ro.photos?.[0] && <p className="text-[10px] text-amber-600 font-medium">⚠️ {ro.photos[0]}</p>}
                  </div>
                </td>
                <td>{ro.customer?.name}</td><td>{ro.technician?.name || "Chưa giao"}</td>
                <td className="text-xs text-muted-foreground max-w-xs truncate">{ro.symptoms}</td>
                <td className="font-semibold">{formatCurrency(Number(ro.totalAmount))}</td>
                <td>
                  <select
                    value={ro.status}
                    onChange={(e) => handleUpdateStatus(ro.id, e.target.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold border outline-none cursor-pointer transition-all text-white ${
                      ro.status === "PENDING" ? "bg-amber-600 border-amber-700" :
                      ro.status === "DIAGNOSING" ? "bg-blue-600 border-blue-700" :
                      ro.status === "DOING" ? "bg-purple-600 border-purple-700" :
                      ro.status === "WAITING_PARTS" ? "bg-red-600 border-red-700" :
                      ro.status === "DONE" ? "bg-emerald-600 border-emerald-700" :
                      ro.status === "DELIVERED" ? "bg-teal-600 border-teal-700" :
                      "bg-secondary text-secondary-foreground border-border"
                    }`}
                  >
                    <option value="PENDING" className="bg-card text-foreground">Chờ tiếp nhận</option>
                    <option value="DIAGNOSING" className="bg-card text-foreground">Chẩn đoán</option>
                    <option value="WAITING_PARTS" className="bg-card text-foreground">Chờ phụ tùng</option>
                    <option value="DOING" className="bg-card text-foreground">Đang sửa</option>
                    <option value="DONE" className="bg-card text-foreground">Hoàn thành</option>
                    <option value="DELIVERED" className="bg-card text-foreground">Đã giao xe</option>
                  </select>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <button onClick={() => router.push(`/workshop/invoice/${ro.id}`)} className="p-1 hover:bg-secondary rounded text-primary" title="In hóa đơn"><Printer size={14} /></button>
                    <button onClick={() => handleOpenEdit(ro)} className="p-1 hover:bg-secondary rounded text-primary"><Edit size={14} /></button>
                    <button onClick={() => handleDelete(ro.id)} className="p-1 hover:bg-secondary rounded text-destructive"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {view === "requisitions" && (
        <div className="space-y-4">
          {reqLoading ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <div className="glass-card rounded-xl overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã phiếu</th>
                    <th>Biển số xe / RO</th>
                    <th>Lý do xin phụ tùng</th>
                    <th>Tổng số lượng</th>
                    <th>Người tạo</th>
                    <th>Thời gian</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {requisitions.map((req: any) => {
                    const totalQty = req.items.reduce((s: number, i: any) => s + i.quantity, 0);
                    return (
                      <tr key={req.id}>
                        <td><span className="font-semibold text-primary">REQ-{req.id.toString().padStart(4, "0")}</span></td>
                        <td>
                          <div>
                            <p className="font-semibold">{req.repairOrder?.plateNumber}</p>
                            <p className="text-xs text-muted-foreground">{req.repairOrder?.vehicleModel}</p>
                          </div>
                        </td>
                        <td><p className="text-xs max-w-xs truncate">{req.reason || "—"}</p></td>
                        <td><span className="badge badge-secondary">{totalQty} sản phẩm</span></td>
                        <td>{req.createdBy}</td>
                        <td>{formatDate(req.createdAt)}</td>
                        <td>
                          <button
                            onClick={() => { setDetailReq(req); setDetailReqOpen(true); }}
                            className="p-1.5 hover:bg-secondary rounded-xl text-primary flex items-center gap-1.5 text-xs font-semibold border border-border"
                          >
                            <Eye size={12} /> Chi tiết / In
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {requisitions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground opacity-50">
                        Không tìm thấy phiếu xin phụ tùng nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CRUD Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in-bottom">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold">{editingId ? "Cập nhật lệnh sửa chữa (RO)" : "Tạo Lệnh sửa chữa mới (RO)"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Biển số xe</label>
                  <input required value={formData.plateNumber} onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: 30F-123.45" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Model xe</label>
                  <input required value={formData.vehicleModel} onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: Toyota Camry 2026" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Số KM vào xưởng</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9.]*"
                    required
                    value={formData.kmIn === "" ? "" : Number(formData.kmIn).toLocaleString("vi-VN")}
                    onChange={(e) => handleNumericInputChange(e, (c) => setFormData({ ...formData, kmIn: c === "" ? "" : parseInt(c, 10) }))}
                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Chỉ định Khách hàng</label>
                  <select value={formData.customerId} onChange={(e) => setFormData({ ...formData, customerId: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                    {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Giao KTV</label>
                  <select value={formData.technicianId} onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="">-- Chưa giao việc --</option>
                    {technicians.map((ktv: any) => <option key={ktv.id} value={ktv.id}>{ktv.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Trạng thái sửa chữa</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="PENDING">Chờ sửa (Pending)</option>
                    <option value="DIAGNOSING">Chẩn đoán (Diagnosing)</option>
                    <option value="DOING">Đang sửa (Doing)</option>
                    <option value="WAITING_PARTS">Chờ phụ tùng (Waiting Parts)</option>
                    <option value="DONE">Hoàn thành (Done)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Tiền công thợ</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9.]*"
                    required
                    value={formData.laborCost === "" ? "" : Number(formData.laborCost).toLocaleString("vi-VN")}
                    onChange={(e) => handleNumericInputChange(e, (c) => setFormData({ ...formData, laborCost: c === "" ? "" : parseInt(c, 10) }))}
                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm font-semibold text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Tiền phụ tùng thay thế</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9.]*"
                    required
                    value={formData.partsCost === "" ? "" : Number(formData.partsCost).toLocaleString("vi-VN")}
                    onChange={(e) => handleNumericInputChange(e, (c) => setFormData({ ...formData, partsCost: c === "" ? "" : parseInt(c, 10) }))}
                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm font-semibold text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Triệu chứng / Yêu cầu</label>
                  <textarea required value={formData.symptoms} onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[60px]" placeholder="VD: Động cơ kêu to khi khởi động, cần bảo dưỡng lọc dầu..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Tình trạng xe (Trầy xước/Móp méo/Ảnh)</label>
                  <textarea value={formData.carCondition} onChange={(e) => setFormData({ ...formData, carCondition: e.target.value })} className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[60px]" placeholder="VD: Trầy xước nhẹ tai xe bên lái, kính lái bình thường..." />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary/40">Hủy</button>
                <button type="submit" className="gradient-primary text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {printOpen && printRo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:p-0 print:bg-white animate-fade-in">
          <div className="w-full max-w-2xl bg-card border border-border rounded-2xl overflow-hidden shadow-2xl print:border-none print:shadow-none print:bg-white print:w-full print:max-w-none print:h-full flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border print:hidden bg-secondary/10">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Printer size={18} />
                Xem trước báo giá (Quotation Preview)
              </h3>
              <button onClick={() => { setPrintOpen(false); setPrintRo(null); }} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            
            <div id="print-area" className="p-8 space-y-6 overflow-y-auto flex-1 text-foreground print:text-black print:p-0 print:overflow-visible">
              <div className="flex justify-between items-start border-b border-border/60 pb-4">
                <div>
                  <h2 className="text-xl font-bold uppercase tracking-wider text-primary print:text-black">Auto-Smart CRM & ERP</h2>
                  <p className="text-xs text-muted-foreground print:text-black">Hệ thống quản lý dịch vụ Garage thế hệ mới</p>
                  <p className="text-xs text-muted-foreground print:text-black mt-1">Hotline: 1900.8888 - Địa chỉ: Hà Nội, Việt Nam</p>
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-bold uppercase">Phiếu báo giá sửa chữa</h3>
                  <p className="text-xs text-muted-foreground font-mono print:text-black">Mã RO: RO-{printRo.id.toString().padStart(4, "0")}</p>
                  <p className="text-xs text-muted-foreground print:text-black">Ngày: {formatDate(printRo.createdAt)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 bg-secondary/10 p-4 rounded-xl border border-border/50 print:bg-transparent print:border-none print:p-0">
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1 print:text-black">Khách hàng</h4>
                  <p className="text-sm font-bold">{printRo.customer?.name || "Khách vãng lai"}</p>
                  <p className="text-xs text-muted-foreground print:text-black">SĐT: {printRo.customer?.phone}</p>
                  <p className="text-xs text-muted-foreground print:text-black">Email: {printRo.customer?.email || "—"}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1 print:text-black">Thông tin xe</h4>
                  <p className="text-sm font-bold text-primary print:text-black font-mono">{printRo.plateNumber}</p>
                  <p className="text-xs text-muted-foreground print:text-black">Dòng xe: {printRo.vehicleModel || "—"}</p>
                  <p className="text-xs text-muted-foreground print:text-black">Số KM vào xưởng: {printRo.kmIn} km</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1 print:text-black">Triệu chứng & Tình trạng xe lúc nhận</h4>
                <div className="bg-card border border-border p-3 rounded-lg text-xs space-y-1.5 print:bg-white print:text-black">
                  <p><strong>Triệu chứng của khách:</strong> {printRo.symptoms || "Không ghi nhận"}</p>
                  {printRo.photos?.[0] && (
                    <p className="text-amber-600 dark:text-amber-400 print:text-black font-semibold">
                      <strong>⚠️ Tình trạng ngoại thất (Trầy xước/Móp méo):</strong> {printRo.photos[0]}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2 print:text-black">Chi tiết báo giá dịch vụ</h4>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/80 text-muted-foreground uppercase font-semibold">
                      <th className="py-2">Hạng mục công việc</th>
                      <th className="py-2 text-right">Chi phí ước tính</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/40">
                      <td className="py-3">
                        <p className="font-semibold">Tiền công thợ (Labor Fee)</p>
                        <p className="text-[10px] text-muted-foreground print:text-black">Thực hiện bởi KTV: {printRo.technician?.name || "Chưa phân phối"}</p>
                      </td>
                      <td className="py-3 text-right font-medium">{formatCurrency(Number(printRo.laborCost))}</td>
                    </tr>
                    <tr className="border-b border-border/40">
                      <td className="py-3">
                        <p className="font-semibold">Chi phí phụ tùng thay thế (Parts Cost)</p>
                        <p className="text-[10px] text-muted-foreground print:text-black">Vật tư chính hãng Auto-Smart</p>
                      </td>
                      <td className="py-3 text-right font-medium">{formatCurrency(Number(printRo.partsCost))}</td>
                    </tr>
                    {(() => {
                      const labor = Number(printRo.laborCost) || 0;
                      const parts = Number(printRo.partsCost) || 0;
                      const total = Number(printRo.totalAmount) || 0;
                      const discount = Math.round(labor + parts - total);
                      if (discount >= 1000) {
                        return (
                          <tr className="border-b border-border/40 text-success">
                            <td className="py-3">
                              <p className="font-semibold">Chiết khấu đổi điểm (Loyalty Discount)</p>
                              <p className="text-[10px] text-success">Khấu trừ từ điểm tích lũy của khách hàng</p>
                            </td>
                            <td className="py-3 text-right font-semibold text-success">-{formatCurrency(discount)}</td>
                          </tr>
                        );
                      }
                      return null;
                    })()}
                    <tr className="font-bold text-sm">
                      <td className="py-4 text-right pr-4">Tổng cộng tạm tính (VND):</td>
                      <td className="py-4 text-right text-primary print:text-black text-base">{formatCurrency(Number(printRo.totalAmount))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center text-xs pt-8 border-t border-border/40">
                <div>
                  <p className="font-semibold uppercase mb-12">Khách hàng xác nhận</p>
                  <p className="text-[10px] text-muted-foreground print:text-black">(Ký và ghi rõ họ tên)</p>
                </div>
                <div>
                  <p className="font-semibold uppercase mb-12">Đại diện cố vấn dịch vụ</p>
                  <p className="text-[10px] text-muted-foreground print:text-black">(Ký và ghi rõ họ tên)</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end p-6 border-t border-border print:hidden bg-secondary/10">
              <button
                type="button"
                onClick={() => { setPrintOpen(false); setPrintRo(null); }}
                className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary/40"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="gradient-primary text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 flex items-center gap-1.5"
              >
                <Printer size={16} />
                In báo giá (Print)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Requisition Creation Modal */}
      {reqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-6xl bg-card border border-border rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[90vh] max-h-[95vh] animate-slide-in-bottom">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/10">
              <div>
                <h3 className="text-lg font-bold">Lập Phiếu Xin Phụ Tùng</h3>
                <p className="text-xs text-muted-foreground">Chọn Lệnh sửa chữa (RO) và các phụ tùng cần yêu cầu để trừ kho và thêm vào hóa đơn</p>
              </div>
              <button onClick={() => setReqModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Lệnh sửa chữa (RO)</label>
                  <select
                    required
                    value={reqFormData.repairOrderId}
                    onChange={(e) => setReqFormData({ ...reqFormData, repairOrderId: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="">-- Chọn lệnh sửa chữa --</option>
                    {repairOrders.filter((ro: any) => ro.status !== "DONE" && ro.status !== "DELIVERED").map((ro: any) => (
                      <option key={ro.id} value={ro.id}>
                        {ro.plateNumber} - {ro.vehicleModel} ({ro.customer?.name || "Khách vãng lai"})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Lý do yêu cầu</label>
                  <input
                    type="text"
                    value={reqFormData.reason}
                    onChange={(e) => setReqFormData({ ...reqFormData, reason: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="VD: Thay thế bảo dưỡng định kỳ"
                  />
                </div>
              </div>

              <div className="border-t border-border/60 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase">Danh sách phụ tùng yêu cầu</h4>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus size={14} /> Thêm dòng
                  </button>
                </div>

                <div className="space-y-3">
                  {reqFormData.items.map((item, idx) => {
                    const selectedProduct = branchProducts.find((p) => p.id.toString() === item.productId);
                    
                    // getFilteredProducts is defined at component level to avoid recreation on every render

                    return (
                      <div key={idx} className="flex flex-col md:flex-row gap-3 p-3 bg-secondary/15 rounded-xl border border-border/40 relative">
                        {/* Product Search Selection */}
                        {item.productId ? (
                          <div className="flex-1 min-w-0 bg-secondary/20 border border-border px-3 py-2 rounded-xl text-sm flex items-center justify-between">
                            <div className="truncate">
                              <span className="font-bold text-primary">{selectedProduct?.sku}</span> - <span className="font-medium">{selectedProduct?.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">({selectedProduct?.unit} | Tồn: <span className={selectedProduct?.stockCount && selectedProduct.stockCount > 0 ? "text-emerald-500 font-semibold" : "text-rose-500 font-semibold"}>{selectedProduct?.stockCount}</span>)</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateItem(idx, { productId: "", searchQuery: "" })}
                              className="text-primary hover:text-primary-hover text-xs font-bold"
                            >
                              Thay đổi
                            </button>
                          </div>
                        ) : (
                          <div className="relative flex-1">
                            <input
                              type="text"
                              value={item.searchQuery}
                              onChange={(e) => updateItem(idx, { searchQuery: e.target.value, showDropdown: true })}
                              onFocus={() => updateItem(idx, { showDropdown: true })}
                              placeholder="Nhập tên hoặc mã phụ tùng để tìm..."
                              className="w-full px-3 py-2 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            {item.showDropdown && (
                              <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                                {getFilteredProducts(item.searchQuery).map((p) => {
                                  const matchingPrice = p.prices.find((pr: any) => pr.type === item.priceType)?.amount || 0;
                                  return (
                                    <div
                                      key={p.id}
                                      onClick={() => {
                                        updateItem(idx, {
                                          productId: p.id.toString(),
                                          searchQuery: p.name,
                                          showDropdown: false,
                                          customUnitPrice: Number(matchingPrice)
                                        });
                                      }}
                                      className="px-4 py-2 hover:bg-secondary/40 cursor-pointer text-xs border-b border-border/40 last:border-b-0 flex justify-between items-center"
                                    >
                                      <div>
                                        <p className="font-semibold text-primary">{p.sku} - {p.name}</p>
                                        <p className="text-[10px] text-muted-foreground">Đơn vị: {p.unit} | Danh mục: {p.category}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-bold">{formatCurrency(Number(matchingPrice))}</p>
                                        <p className={`text-[10px] ${p.stockCount > 0 ? "text-emerald-500 font-semibold" : "text-rose-500 font-semibold"}`}>Tồn: {p.stockCount}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                                {getFilteredProducts(item.searchQuery).length === 0 && (
                                  <p className="p-3 text-xs text-muted-foreground text-center">Không tìm thấy phụ tùng phù hợp</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Quantity Input */}
                        <div className="w-full md:w-24">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9.]*"
                            required
                            placeholder="SL"
                            value={item.quantity === "" ? "" : Number(item.quantity).toLocaleString("vi-VN")}
                            onChange={(e) => handleNumericInputChange(e, (c) => updateItem(idx, { quantity: c === "" ? "" : parseInt(c, 10) }))}
                            className="w-full px-3 py-2 bg-card border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none text-center font-bold"
                          />
                        </div>

                        {/* Price Type Selector */}
                        <div className="w-full md:w-32">
                          <select
                            value={item.priceType}
                            onChange={(e) => updateItem(idx, { priceType: e.target.value as any })}
                            className="w-full px-3 py-2 bg-card border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                          >
                            <option value="RETAIL">Giá lẻ</option>
                            <option value="WHOLESALE">Giá sỉ</option>
                            <option value="INSURANCE">Giá bảo hiểm</option>
                          </select>
                        </div>

                        {/* Custom Unit Price */}
                        <div className="w-full md:w-36">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9.]*"
                            placeholder="Đơn giá"
                            value={item.customUnitPrice === undefined || item.customUnitPrice === "" ? "" : Number(item.customUnitPrice).toLocaleString("vi-VN")}
                            onChange={(e) => handleNumericInputChange(e, (c) => updateItem(idx, { customUnitPrice: c === "" ? "" : parseInt(c, 10) }))}
                            className="w-full px-3 py-2 bg-card border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none text-right font-semibold text-primary"
                          />
                        </div>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl self-end md:self-center"
                          title="Xóa dòng"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="px-6 py-4 border-t border-border bg-secondary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-muted-foreground font-semibold uppercase">Tổng giá trị phiếu xin:</span>
                <p className="text-lg font-bold text-primary">{formatCurrency(calculateTotalRequisition())}</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setReqModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary/40"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSaveRequisition}
                  disabled={productsLoading || reqFormData.items.some(i => !i.productId)}
                  className="gradient-primary text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {reqLoading ? <Loader2 size={16} className="animate-spin" /> : <ClipboardList size={16} />}
                  Lập phiếu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail / Print Requisition Modal */}
      {detailReqOpen && detailReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:p-0 print:bg-white animate-fade-in">
          <div className="w-full max-w-5xl bg-card border border-border rounded-2xl overflow-hidden shadow-2xl print:border-none print:shadow-none print:bg-white print:w-full print:max-w-none print:h-full flex flex-col h-[85vh] max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border print:hidden bg-secondary/10">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Printer size={18} />
                Chi tiết phiếu xin phụ tùng
              </h3>
              <button onClick={() => { setDetailReqOpen(false); setDetailReq(null); }} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div id="print-requisition-area" className="p-8 space-y-6 overflow-y-auto flex-1 text-foreground print:text-black print:p-0 print:overflow-visible">
              <div className="flex justify-between items-start border-b border-border/60 pb-4">
                <div>
                  <h2 className="text-xl font-bold uppercase tracking-wider text-primary print:text-black">Auto-Smart CRM & ERP</h2>
                  <p className="text-xs text-muted-foreground print:text-black">Hệ thống quản lý dịch vụ Garage thế hệ mới</p>
                  <p className="text-xs text-muted-foreground print:text-black mt-1">Chi nhánh: {detailReq.branch?.name || "Chi nhánh hiện tại"}</p>
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-bold uppercase text-primary print:text-black">Phiếu Xin Phụ Tùng</h3>
                  <p className="text-xs font-semibold text-muted-foreground font-mono print:text-black">Mã phiếu: REQ-{detailReq.id.toString().padStart(4, "0")}</p>
                  <p className="text-xs text-muted-foreground print:text-black">Ngày lập: {formatDate(detailReq.createdAt)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 bg-secondary/10 p-4 rounded-xl border border-border/50 print:bg-transparent print:border-none print:p-0">
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1 print:text-black">Yêu cầu từ RO</h4>
                  <p className="text-sm font-bold text-primary print:text-black font-mono">Biển số: {detailReq.repairOrder?.plateNumber}</p>
                  <p className="text-xs text-muted-foreground print:text-black">Model xe: {detailReq.repairOrder?.vehicleModel}</p>
                  <p className="text-xs text-muted-foreground print:text-black">Mã RO: RO-{detailReq.repairOrder?.id.toString().padStart(4, "0")}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1 print:text-black">Thông tin lập phiếu</h4>
                  <p className="text-sm font-bold">{detailReq.createdBy}</p>
                  <p className="text-xs text-muted-foreground print:text-black">Trạng thái: <span className="text-emerald-500 font-semibold">{detailReq.status}</span></p>
                  <p className="text-xs text-muted-foreground print:text-black">Lý do: {detailReq.reason || "—"}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2 print:text-black">Danh sách phụ tùng yêu cầu</h4>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/80 text-muted-foreground uppercase font-semibold">
                      <th className="py-2">Mã phụ tùng (SKU)</th>
                      <th className="py-2">Tên phụ tùng</th>
                      <th className="py-2">Đơn vị</th>
                      <th className="py-2 text-right">Số lượng yêu cầu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailReq.items.map((item: any) => (
                      <tr key={item.id} className="border-b border-border/40">
                        <td className="py-2.5 font-mono text-primary print:text-black">{item.product?.sku}</td>
                        <td className="py-2.5 font-medium">{item.product?.name}</td>
                        <td className="py-2.5">{item.product?.unit}</td>
                        <td className="py-2.5 text-right font-bold">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center text-xs pt-8 border-t border-border/40">
                <div>
                  <p className="font-semibold uppercase mb-12">Người lập phiếu</p>
                  <p className="text-[10px] text-muted-foreground print:text-black">(Ký và ghi rõ họ tên)</p>
                </div>
                <div>
                  <p className="font-semibold uppercase mb-12">Thủ kho xác nhận xuất</p>
                  <p className="text-[10px] text-muted-foreground print:text-black">(Ký và ghi rõ họ tên)</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end p-6 border-t border-border print:hidden bg-secondary/10">
              <button
                type="button"
                onClick={() => { setDetailReqOpen(false); setDetailReq(null); }}
                className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary/40"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="gradient-primary text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 flex items-center gap-1.5"
              >
                <Printer size={16} />
                In phiếu (Print)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
