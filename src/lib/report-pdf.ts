import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Registers the VietNamese-safe font (latin extended via built-in helvetica)
// jsPDF built-in fonts handle ASCII + Latin-1. For Vietnamese, we convert to
// closest ASCII via a simple transliteration map so text is readable in PDF.

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Cho xu ly",
  DIAGNOSING: "Dang chuan doan",
  DOING: "Dang sua",
  WAITING_PARTS: "Cho phu tung",
  DONE: "Hoan thanh",
  DELIVERED: "Da giao xe",
};

const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: "Moi",
  CONSULTING: "Dang tu van",
  POTENTIAL: "Tiem nang",
  CONVERTED: "Da chuyen doi",
  LOST: "Da mat",
};

const SOURCE_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook",
  WEBSITE: "Website",
  WALKIN: "Truc tiep",
  REFERRAL: "Gioi thieu",
};

function fmt(val: number): string {
  return new Intl.NumberFormat("vi-VN").format(val) + " VND";
}

function removeVietnamese(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, (c) => (c === "đ" ? "d" : "D"));
}

function safe(str: string | null | undefined): string {
  return removeVietnamese(str || "—");
}

interface ReportData {
  branchId: number | null;
  summary: {
    totalWorkshopRevenue: number;
    currentMonthRevenue: number;
    revenueGrowth: number | null;
    completedRepairOrders: number;
    currentMonthROCount: number;
    roGrowth: number | null;
    activeKtv: number;
    totalCustomers: number;
    newCustomersThisMonth: number;
    newLeadsThisMonth: number;
    convertedLeads: number;
    totalVehiclesAvailable: number;
    totalVehiclesSold: number;
  };
  monthlyRevenue: { month: string; revenue: number }[];
  topProducts: { name: string; sku: string; qty: number; revenue: number }[];
  recentOrders: {
    id: number;
    plateNumber: string;
    vehicleModel: string | null;
    customer: string;
    technician: string;
    totalAmount: number;
    status: string;
    completedAt: string;
  }[];
  leadsBreakdown: Record<string, number>;
  customerSources: Record<string, number>;
}

export function generateReportPDF(data: ReportData, startDate?: string, endDate?: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = margin;

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const addPageIfNeeded = (neededHeight: number) => {
    if (y + neededHeight > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const sectionTitle = (title: string) => {
    addPageIfNeeded(12);
    doc.setFillColor(37, 99, 235); // blue-600
    doc.rect(margin, y, contentW, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(safe(title), margin + 3, y + 5);
    doc.setTextColor(0, 0, 0);
    y += 10;
  };

  // ─── PAGE 1 HEADER ───────────────────────────────────────────────────────────
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("BAO CAO & PHAN TICH ERP", pageW / 2, 12, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const periodText = startDate || endDate
    ? `Ky bao cao: ${startDate || "..."} den ${endDate || "..."}`
    : `Ngay in: ${new Date().toLocaleDateString("vi-VN")}`;
  doc.text(periodText, pageW / 2, 20, { align: "center" });
  doc.setTextColor(0, 0, 0);
  y = 34;

  // ─── KPI SUMMARY ────────────────────────────────────────────────────────────
  sectionTitle("TONG QUAN HOAT DONG");

  const kpiData = [
    ["Doanh thu xuong (ky nay)", fmt(data.summary.currentMonthRevenue),
      data.summary.revenueGrowth !== null ? `${data.summary.revenueGrowth > 0 ? "+" : ""}${data.summary.revenueGrowth}%` : "Chua du du lieu"],
    ["Tong doanh thu xuong", fmt(data.summary.totalWorkshopRevenue), ""],
    ["Lenh sua chua hoan thanh", `${data.summary.completedRepairOrders} lenh`, `Ky nay: ${data.summary.currentMonthROCount}`],
    ["KTV dang hoat dong", `${data.summary.activeKtv} KTV`, ""],
    ["Tong khach hang", data.summary.totalCustomers.toLocaleString("vi-VN"), `Moi trong ky: ${data.summary.newCustomersThisMonth}`],
    ["Leads moi trong ky", `${data.summary.newLeadsThisMonth} leads`, `Da chuyen doi: ${data.summary.convertedLeads}`],
    ["Xe san co / Da ban", `${data.summary.totalVehiclesAvailable} / ${data.summary.totalVehiclesSold}`, ""],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Chi so", "Gia tri", "Chi tiet"]],
    body: kpiData,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [219, 234, 254], textColor: [30, 64, 175], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 75 },
      1: { halign: "right", cellWidth: 55 },
      2: { textColor: [100, 116, 139], cellWidth: contentW - 130 },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ─── MONTHLY REVENUE BAR CHART ───────────────────────────────────────────────
  addPageIfNeeded(60);
  sectionTitle("BIEU DO DOANH THU XUONG 6 THANG GAN NHAT");

  const chartH = 45;
  const chartW = contentW;
  const chartX = margin;
  const chartY = y;
  const maxRev = Math.max(...data.monthlyRevenue.map((m) => m.revenue), 1);
  const barCount = data.monthlyRevenue.length;
  const barAreaW = chartW / barCount;
  const barW = barAreaW * 0.55;

  // Grid lines
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  for (let i = 0; i <= 4; i++) {
    const lineY = chartY + chartH - (chartH * i) / 4;
    doc.line(chartX, lineY, chartX + chartW, lineY);
    const label = fmt((maxRev * i) / 4).replace(" VND", "");
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text(label, chartX - 1, lineY, { align: "right" });
  }

  data.monthlyRevenue.forEach((m, i) => {
    const bx = chartX + i * barAreaW + (barAreaW - barW) / 2;
    const barH = maxRev > 0 ? Math.max((m.revenue / maxRev) * chartH, m.revenue > 0 ? 3 : 1) : 1;
    const by = chartY + chartH - barH;

    if (m.revenue > 0) {
      // Gradient simulation: draw 2 rects
      doc.setFillColor(37, 99, 235);
      doc.rect(bx, by, barW, barH, "F");
      doc.setFillColor(103, 232, 249);
      doc.rect(bx, by, barW, barH / 3, "F");
    } else {
      doc.setFillColor(229, 231, 235);
      doc.rect(bx, by, barW, barH, "F");
    }

    // Month label
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(safe(m.month), bx + barW / 2, chartY + chartH + 4, { align: "center" });

    // Value label on top
    if (m.revenue > 0) {
      const labelVal = (m.revenue / 1_000_000).toFixed(1) + "M";
      doc.setFontSize(6);
      doc.setTextColor(37, 99, 235);
      doc.text(labelVal, bx + barW / 2, by - 1, { align: "center" });
    }
  });

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH);
  doc.setTextColor(0, 0, 0);
  y = chartY + chartH + 12;

  // ─── TOP PRODUCTS ────────────────────────────────────────────────────────────
  // Chỉ cần đủ chỗ cho title + header + >=2 dòng; autoTable tự ngắt trang khi overflow
  addPageIfNeeded(30);
  sectionTitle("PHU TUNG BAN CHAY NHAT");

  if (data.topProducts.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("Chua co du lieu phu tung.", margin, y);
    doc.setTextColor(0, 0, 0);
    y += 6;
  } else {
    autoTable(doc, {
      startY: y,
      head: [["#", "Ten phu tung", "SKU", "So luong", "Doanh thu"]],
      body: data.topProducts.map((p, i) => [
        i + 1,
        safe(p.name),
        safe(p.sku),
        `${p.qty} don vi`,
        fmt(p.revenue),
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [219, 234, 254], textColor: [30, 64, 175], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { fontStyle: "bold" },
        2: { cellWidth: 30 },
        3: { halign: "right", cellWidth: 28 },
        4: { halign: "right", cellWidth: 40, textColor: [37, 99, 235], fontStyle: "bold" },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ─── LEADS + SOURCES + WORKSHOP (3 columns) ───────────────────────────────
  // 3 bảng song song: cần đủ chỗ title + header + nội dung; ước tính ~50mm
  addPageIfNeeded(50);
  sectionTitle("PHAN LOAI LEADS — NGUON KHACH HANG — HIEU SUAT XUONG");

  const colW = (contentW - 8) / 3;

  // Leads breakdown
  const leadsEntries = Object.entries(data.leadsBreakdown);
  if (leadsEntries.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Trang thai Lead", "So luong"]],
      body: leadsEntries.map(([s, c]) => [LEAD_STATUS_LABELS[s] ?? s, c]),
      margin: { left: margin },
      tableWidth: colW,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [219, 234, 254], textColor: [30, 64, 175], fontStyle: "bold" },
    });
  }

  // Customer sources
  const srcEntries = Object.entries(data.customerSources);
  const leadsEndY = (doc as any).lastAutoTable?.finalY ?? y;
  if (srcEntries.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Nguon khach", "So luong"]],
      body: srcEntries.map(([s, c]) => [SOURCE_LABELS[s] ?? s, c]),
      margin: { left: margin + colW + 4 },
      tableWidth: colW,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [219, 234, 254], textColor: [30, 64, 175], fontStyle: "bold" },
    });
  }

  // Workshop perf
  const srcEndY = (doc as any).lastAutoTable?.finalY ?? y;
  autoTable(doc, {
    startY: y,
    head: [["Chi so xuong", "Gia tri"]],
    body: [
      ["KTV dang hoat dong", `${data.summary.activeKtv} KTV`],
      ["Tong lenh hoan thanh", `${data.summary.completedRepairOrders}`],
      ["Tong doanh thu", fmt(data.summary.totalWorkshopRevenue)],
    ],
    margin: { left: margin + (colW + 4) * 2 },
    tableWidth: colW,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [219, 234, 254], textColor: [30, 64, 175], fontStyle: "bold" },
  });

  y = Math.max(leadsEndY, srcEndY, (doc as any).lastAutoTable.finalY) + 8;

  // ─── RECENT REPAIR ORDERS ─────────────────────────────────────────────────
  // Đủ chỗ cho title + header + >=3 dòng; autoTable tự tiếp tục trang sau
  addPageIfNeeded(40);
  sectionTitle("LENH SUA CHUA HOAN THANH GAN NHAT");

  if (data.recentOrders.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("Chua co lenh hoan thanh.", margin, y);
    doc.setTextColor(0, 0, 0);
    y += 6;
  } else {
    autoTable(doc, {
      startY: y,
      head: [["Bien so", "Dong xe", "Khach hang", "KTV", "Trang thai", "Thanh tien", "Ngay HT"]],
      body: data.recentOrders.map((ro) => [
        safe(ro.plateNumber),
        safe(ro.vehicleModel),
        safe(ro.customer),
        safe(ro.technician),
        STATUS_LABELS[ro.status] ?? ro.status,
        fmt(ro.totalAmount),
        new Date(ro.completedAt).toLocaleDateString("vi-VN"),
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2.5, overflow: "linebreak" },
      headStyles: { fillColor: [219, 234, 254], textColor: [30, 64, 175], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 22 },
        1: { cellWidth: 28 },
        2: { cellWidth: 28 },
        3: { cellWidth: 24 },
        4: { cellWidth: 22 },
        5: { halign: "right", cellWidth: 32, textColor: [37, 99, 235], fontStyle: "bold" },
        6: { halign: "center", cellWidth: 22 },
      },
      didDrawPage: () => {
        // Repeat header accent on new pages
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, pageW, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.text("BAO CAO ERP — LENH SUA CHUA", pageW / 2, 5.5, { align: "center" });
        doc.setTextColor(0, 0, 0);
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ─── FOOTER ON EACH PAGE ─────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Bao cao duoc tao tu dong boi He thong ERP — Trang ${p}/${totalPages}`,
      pageW / 2,
      pageH - 6,
      { align: "center" }
    );
    doc.setTextColor(0, 0, 0);
  }

  // ─── SAVE ────────────────────────────────────────────────────────────────
  const filename = `Bao_cao_ERP_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}
