"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { ModalPortal } from "./modal-portal";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export type ModalType = "success" | "error" | "warning" | "info" | "danger";

interface ModalOptions {
  title?: string;
  message: string | React.ReactNode;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
}

interface ModalContextType {
  alert: (options: ModalOptions | string) => Promise<void>;
  confirm: (options: ModalOptions | string) => Promise<boolean>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
}

export default function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirm, setIsConfirm] = useState(false);
  const [options, setOptions] = useState<Required<ModalOptions>>({
    title: "",
    message: "",
    type: "info",
    confirmText: "Xác nhận",
    cancelText: "Hủy",
  });

  const resolver = useRef<((value: boolean) => void) | null>(null);

  const showAlert = useCallback((opts: ModalOptions | string): Promise<void> => {
    return new Promise((resolve) => {
      resolver.current = () => resolve();
      setIsConfirm(false);
      
      const titleDefault = typeof opts === "string" ? "Thông báo" : (opts.title || "Thông báo");
      const message = typeof opts === "string" ? opts : opts.message;
      const type = typeof opts === "string" ? "info" : (opts.type || "info");
      const confirmText = typeof opts === "string" ? "Đóng" : (opts.confirmText || "Đóng");

      setOptions({
        title: titleDefault,
        message,
        type,
        confirmText,
        cancelText: "",
      });
      setIsOpen(true);
    });
  }, []);

  const showConfirm = useCallback((opts: ModalOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      resolver.current = (val) => resolve(val);
      setIsConfirm(true);

      const titleDefault = typeof opts === "string" ? "Xác nhận" : (opts.title || "Xác nhận");
      const message = typeof opts === "string" ? opts : opts.message;
      const type = typeof opts === "string" ? "warning" : (opts.type || "warning");
      const confirmText = typeof opts === "string" ? "Đồng ý" : (opts.confirmText || "Đồng ý");
      const cancelText = typeof opts === "string" ? "Hủy" : (opts.cancelText || "Hủy");

      setOptions({
        title: titleDefault,
        message,
        type,
        confirmText,
        cancelText,
      });
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolver.current) {
      resolver.current(true);
      resolver.current = null;
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolver.current) {
      resolver.current(false);
      resolver.current = null;
    }
  };

  // Color mappings and styling for different types of alerts
  const typeStyles = {
    success: {
      icon: <CheckCircle2 className="w-8 h-8 text-emerald-500 animate-bounce" />,
      bg: "bg-emerald-500/10 border-emerald-500/20",
      btnClass: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25",
    },
    error: {
      icon: <AlertCircle className="w-8 h-8 text-destructive animate-pulse" />,
      bg: "bg-destructive/10 border-destructive/20",
      btnClass: "bg-destructive hover:bg-destructive/90 text-white shadow-lg shadow-destructive/25",
    },
    danger: {
      icon: <AlertCircle className="w-8 h-8 text-destructive animate-pulse" />,
      bg: "bg-destructive/10 border-destructive/20",
      btnClass: "bg-destructive hover:bg-destructive/90 text-white shadow-lg shadow-destructive/25",
    },
    warning: {
      icon: <AlertTriangle className="w-8 h-8 text-amber-500" />,
      bg: "bg-amber-500/10 border-amber-500/20",
      btnClass: "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25",
    },
    info: {
      icon: <Info className="w-8 h-8 text-sky-500" />,
      bg: "bg-sky-500/10 border-sky-500/20",
      btnClass: "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25",
    },
  };

  const currentStyle = typeStyles[options.type] || typeStyles.info;

  return (
    <ModalContext.Provider value={{ alert: showAlert, confirm: showConfirm }}>
      {children}
      {isOpen && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
            onMouseDown={(e) => e.target === e.currentTarget && handleCancel()}
          >
            <div className="w-full max-w-md bg-card/95 border border-border/80 rounded-2xl p-6 shadow-2xl animate-scale-up relative overflow-hidden flex flex-col gap-4">
              
              {/* Close Button */}
              <button 
                onClick={handleCancel}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>

              <div className="flex items-start gap-4 mt-2">
                <div className={`p-3 rounded-2xl border ${currentStyle.bg} flex items-center justify-center shrink-0`}>
                  {currentStyle.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-foreground select-none">{options.title}</h3>
                  <div className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap leading-relaxed select-text">
                    {options.message}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-border/40">
                {isConfirm && (
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary/40 text-foreground transition-colors"
                  >
                    {options.cancelText}
                  </button>
                )}
                <button
                  onClick={handleConfirm}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${currentStyle.btnClass}`}
                >
                  {options.confirmText}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </ModalContext.Provider>
  );
}
