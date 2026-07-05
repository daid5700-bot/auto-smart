"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { formatCurrency, parseSymptoms } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ xử lý",
  DIAGNOSING: "Đang chẩn đoán",
  DOING: "Đang sửa chữa",
  WAITING_PARTS: "Chờ phụ tùng",
  DONE: "Hoàn thành",
  DELIVERED: "Đã giao xe",
};

export default function InvoicePage() {
  const params = useParams();
  const router = useRouter();
  const [ro, setRo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params?.id) return;
    fetch(`/api/workshop/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setRo(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !ro) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        {error || "Không tìm thấy lệnh sửa chữa"}
      </div>
    );
  }

  const handlePrint = () => window.print();

  return (
    <>
      {/* Controls — hidden on print */}
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-xl hover:bg-secondary/40"
        >
          <ArrowLeft size={16} /> Quay lại
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 gradient-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90"
        >
          <Printer size={16} /> In hóa đơn
        </button>
      </div>

      {/* Invoice — this part is printed */}
      <div className="max-w-2xl mx-auto bg-card border border-border rounded-2xl p-8 print:border-none print:shadow-none print:p-4 print:max-w-full">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-primary">Xe Máy Toàn Thắng</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ro.branch?.name || "Chi nhánh"} • {ro.branch?.address || ""}
            </p>
            <p className="text-xs text-muted-foreground">{ro.branch?.phone || ""}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Phiếu dịch vụ sửa chữa</p>
            <p className="text-xl font-bold mt-1">#{String(ro.id).padStart(6, "0")}</p>
            <span className={`badge mt-1 ${ro.status === "DONE" || ro.status === "DELIVERED" ? "badge-success" : "badge-warning"}`}>
              {STATUS_LABELS[ro.status] || ro.status}
            </span>
          </div>
        </div>

        {/* Customer & Vehicle Info */}
        <div className="grid grid-cols-2 gap-6 mb-8 pb-6 border-b border-border">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Thông tin khách hàng</p>
            <p className="font-bold text-lg">{ro.customer?.name}</p>
            <p className="text-sm text-muted-foreground">{ro.customer?.phone}</p>
            <p className="text-sm text-muted-foreground">{ro.customer?.address}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Thông tin xe</p>
            <p className="font-bold">{ro.vehicleModel || "—"}</p>
            <p className="text-sm text-muted-foreground">Biển số: <span className="font-semibold text-foreground">{ro.plateNumber}</span></p>
            <p className="text-sm text-muted-foreground">Km vào xưởng: {ro.kmIn?.toLocaleString() || 0} km</p>
            {ro.technician && (
              <p className="text-sm text-muted-foreground">KTV: {ro.technician.name}</p>
            )}
          </div>
        </div>

        {/* Symptom / Services list */}
        {(() => {
          const parsed = parseSymptoms(ro.symptoms);
          return (
            <div className="mb-6 space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Triệu chứng / Yêu cầu</p>
                <p className="text-sm bg-secondary/30 rounded-lg p-3">{parsed.summary || "Không ghi nhận"}</p>
              </div>

              {parsed.services.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Chi tiết dịch vụ / công việc thực hiện</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-semibold text-xs text-muted-foreground">Nội dung công việc</th>
                        <th className="text-right py-2 font-semibold text-xs text-muted-foreground">Chi phí</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.services.map((srv: any, idx: number) => (
                        <tr key={idx} className="border-b border-border/30">
                          <td className="py-2">{srv.name}</td>
                          <td className="py-2 text-right font-semibold">{formatCurrency(Number(srv.cost))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {/* Parts table */}
        {ro.items && ro.items.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Phụ tùng / Vật tư</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-semibold text-xs text-muted-foreground">Tên phụ tùng</th>
                  <th className="text-right py-2 font-semibold text-xs text-muted-foreground">SL</th>
                  <th className="text-right py-2 font-semibold text-xs text-muted-foreground">Đơn giá</th>
                  <th className="text-right py-2 font-semibold text-xs text-muted-foreground">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {ro.items.map((item: any) => (
                  <tr key={item.id} className="border-b border-border/30">
                    <td className="py-2">{item.product?.name}</td>
                    <td className="py-2 text-right">{item.quantity} {item.product?.unit}</td>
                    <td className="py-2 text-right">{formatCurrency(Number(item.unitPrice))}</td>
                    <td className="py-2 text-right font-semibold">{formatCurrency(Number(item.totalPrice))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Cost summary */}
        {(() => {
          const parsed = parseSymptoms(ro.symptoms);
          const hasServicesDiscount = parsed.serviceDiscountPercent > 0;
          const hasPartsDiscount = parsed.partsDiscountPercent > 0;

          const labor = Number(ro.laborCost) || 0;
          const parts = Number(ro.partsCost) || 0;
          const total = Number(ro.totalAmount) || 0;

          const serviceDiscountAmount = Math.round(labor * (parsed.serviceDiscountPercent / 100));
          const partsDiscountAmount = Math.round(parts * (parsed.partsDiscountPercent / 100));
          const totalDiscount = Math.round(labor + parts - total);
          const loyaltyDiscount = Math.max(0, totalDiscount - (serviceDiscountAmount + partsDiscountAmount));

          return (
            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tiền công sửa chữa</span>
                <span className="font-semibold">{formatCurrency(labor)}</span>
              </div>
              {hasServicesDiscount && (
                <div className="flex justify-between text-xs text-destructive font-medium pl-4">
                  <span>Giảm giá dịch vụ ({parsed.serviceDiscountPercent}%)</span>
                  <span>-{formatCurrency(serviceDiscountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tiền phụ tùng</span>
                <span className="font-semibold">{formatCurrency(parts)}</span>
              </div>
              {hasPartsDiscount && (
                <div className="flex justify-between text-xs text-destructive font-medium pl-4">
                  <span>Giảm giá phụ tùng ({parsed.partsDiscountPercent}%)</span>
                  <span>-{formatCurrency(partsDiscountAmount)}</span>
                </div>
              )}
              {loyaltyDiscount >= 1000 && (
                <div className="flex justify-between text-sm text-success font-medium">
                  <span>Giảm giá đổi điểm</span>
                  <span>-{formatCurrency(loyaltyDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-border pt-2 mt-2">
                <span>TỔNG CỘNG</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>
          );
        })()}

        {/* Dates */}
        <div className="flex justify-between text-xs text-muted-foreground mt-8 pt-4 border-t border-border">
          <span>Tiếp nhận: {new Date(ro.createdAt).toLocaleDateString("vi-VN")}</span>
          {ro.completedAt && (
            <span>Hoàn thành: {new Date(ro.completedAt).toLocaleDateString("vi-VN")}</span>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Cảm ơn Quý khách đã tin tưởng dịch vụ Xe Máy Toàn Thắng! ⭐
        </p>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          .max-w-2xl { visibility: visible; position: fixed; top: 0; left: 0; width: 100%; }
          .max-w-2xl * { visibility: visible; }
        }
      `}</style>
    </>
  );
}
