import type { Metadata } from "next";
import ToastProvider from "@/components/ToastProvider";
import ModalProvider from "@/components/ModalProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Xe Máy Toàn Thắng - CRM & ERP",
  description: "Hệ thống quản lý toàn diện cho Xe Máy Toàn Thắng",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="dark">
      <body className="min-h-screen">
        <ModalProvider>
          {children}
        </ModalProvider>
        <ToastProvider />
      </body>
    </html>
  );
}

