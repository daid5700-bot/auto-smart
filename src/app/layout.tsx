import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AUTO-SMART CRM & ERP",
  description: "Hệ thống quản lý toàn diện cho đại lý và garage ô tô",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="dark">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
