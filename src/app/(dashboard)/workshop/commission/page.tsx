"use client";
import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TrendingUp, Loader2 } from "lucide-react";

export default function CommissionPage() {
  const [performances, setPerformances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/technicians");
      const data = await res.json();
      // Let's call a custom endpoint or fetch technician performances from existing seed
      // For simplicity, we can fetch all technicians and list their accumulated performances,
      // or fetch the tech performance transactions.
      // Let's fetch the list of technicians and show their accumulated totals.
      setPerformances(data.technicians || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 stagger">
      <div>
        <h2 className="text-2xl font-bold">Doanh số & Hoa hồng Kỹ thuật viên</h2>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {performances.map((tech: any) => (
          <div key={tech.id} className="glass-card rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase">{tech.code}</p>
                <h3 className="text-lg font-bold">{tech.name}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold">{tech.name.charAt(0)}</div>
            </div>
            <div className="border-t border-border/40 pt-3 flex justify-between">
              <span className="text-xs text-muted-foreground">Tỷ lệ hoa hồng</span>
              <span className="text-xs font-bold">{tech.commissionRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Lệnh hoàn thành</span>
              <span className="text-xs font-bold">{tech.completedOrders} lệnh</span>
            </div>
            <div className="border-t border-border/40 pt-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Tích lũy hoa hồng</span>
              <span className="text-lg font-black text-primary">{formatCurrency(tech.totalCommission)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
