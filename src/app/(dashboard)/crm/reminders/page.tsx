"use client";
import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { Bell, Loader2, Send, CheckCircle2 } from "lucide-react";
import { sendOilChangeReminderAction } from "@/app/actions";

export default function RemindersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentMap, setSentMap] = useState<Record<number, boolean>>({});

  const fetchData = async () => {
    try {
      const res = await fetch("/api/crm?tab=customers");
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSendReminder = async (c: any, nextDate: Date) => {
    try {
      setLoading(true);
      const plate = c.vehiclePlates[0] || "xe của quý khách";
      const res = await sendOilChangeReminderAction({
        customerId: c.id,
        phone: c.phone,
        plateNumber: plate,
      });
      if (res.success) {
        setSentMap((prev) => ({ ...prev, [c.id]: true }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading && customers.length === 0) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 stagger">
      <div>
        <h2 className="text-2xl font-bold">Nhắc lịch bảo dưỡng & Thay dầu</h2>
        <p className="text-muted-foreground text-sm mt-1">Danh sách khách hàng sắp đến hoặc đã quá hạn thay dầu nhớt (định kỳ 6 tháng từ lần ghé thăm gần nhất)</p>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Khách hàng</th>
              <th>Số điện thoại</th>
              <th>Biển số xe</th>
              <th>Lần ghé gần nhất</th>
              <th>Ngày đến hạn thay dầu</th>
              <th>Tình trạng</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c: any) => {
              const baseDate = c.lastVisit ? new Date(c.lastVisit) : new Date(c.createdAt);
              const nextOilChange = new Date(baseDate);
              nextOilChange.setMonth(nextOilChange.getMonth() + 6);
              
              const isOverdue = nextOilChange < new Date();

              return (
                <tr key={c.id}>
                  <td className="font-semibold">{c.name}</td>
                  <td>{c.phone}</td>
                  <td>
                    {c.vehiclePlates.map((p: string, idx: number) => (
                      <span key={idx} className="badge badge-primary text-[10px] mr-1">{p}</span>
                    ))}
                    {c.vehiclePlates.length === 0 && <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td>{c.lastVisit ? formatDate(c.lastVisit) : "Chưa có lượt sửa"}</td>
                  <td className="font-semibold">{formatDate(nextOilChange.toISOString())}</td>
                  <td>
                    <span className={`badge ${isOverdue ? "badge-danger" : "badge-success"}`}>
                      {isOverdue ? "Quá hạn thay dầu" : "Sắp đến hạn"}
                    </span>
                  </td>
                  <td>
                    {sentMap[c.id] ? (
                      <span className="text-xs text-success font-semibold flex items-center gap-1"><CheckCircle2 size={12} /> Đã gửi nhắc lịch</span>
                    ) : (
                      <button onClick={() => handleSendReminder(c, nextOilChange)} className="px-3 py-1.5 gradient-primary text-white rounded-lg text-xs font-semibold flex items-center gap-1 hover:opacity-90">
                        <Send size={12} /> Gửi tin ZNS
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
