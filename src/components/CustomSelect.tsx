"use client";

import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";
import { ModalPortal } from "./modal-portal";

export interface SelectOption {
  value: string | number;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeVariant?: "default" | "success" | "warning" | "danger" | "info";
  colorDot?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface CustomSelectProps {
  options: SelectOption[];
  value?: string | number | null;
  onChange: (value: any) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  name?: string;
  id?: string;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "-- Chọn --",
  className = "",
  disabled = false,
  searchable,
  clearable = false,
  size = "md",
  icon,
  id,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [coords, setCoords] = useState<{ top: number; left: number; width: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    width: 200,
    placeAbove: false,
  });

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  // Determine if search should be enabled (explicit prop or if > 6 options)
  const isSearchable = searchable ?? options.length > 6;

  // Calculate dropdown position
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = Math.min(options.length * 40 + (isSearchable ? 50 : 20), 280);
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    setCoords({
      top: placeAbove ? rect.top - 8 : rect.bottom + 8,
      left: rect.left,
      width: Math.max(rect.width, 180),
      placeAbove,
    });
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener("scroll", handleScrollOrResize, true);
      window.addEventListener("resize", handleScrollOrResize);

      return () => {
        window.removeEventListener("scroll", handleScrollOrResize, true);
        window.removeEventListener("resize", handleScrollOrResize);
      };
    }
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen && isSearchable) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, isSearchable]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Escape") {
      setIsOpen(false);
      setSearch("");
    } else if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      if (!isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
    }
  };

  const filteredOptions = options.filter((opt) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
    );
  });

  const handleSelect = (val: string | number) => {
    onChange(val);
    setIsOpen(false);
    setSearch("");
  };

  // Size styling
  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs rounded-lg min-h-[32px]",
    md: "px-3 py-2 text-sm rounded-xl min-h-[40px]",
    lg: "px-4 py-2.5 text-base rounded-xl min-h-[46px]",
  }[size];

  const badgeVariantClasses = {
    default: "bg-secondary text-secondary-foreground border-border",
    success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    danger: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    info: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  };

  return (
    <div className="relative inline-block w-full">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between gap-2 border bg-secondary/30 border-border text-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary/40 hover:bg-secondary/50"
        } ${isOpen ? "border-primary ring-2 ring-primary/20 shadow-md" : ""} ${sizeClasses} ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
          {selectedOption ? (
            <div className="flex items-center gap-2 truncate">
              {selectedOption.colorDot && (
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${selectedOption.colorDot}`} />
              )}
              {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
              <span className="font-semibold text-foreground truncate">{selectedOption.label}</span>
              {selectedOption.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold border shrink-0 ${
                    badgeVariantClasses[selectedOption.badgeVariant || "default"]
                  }`}
                >
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground truncate font-medium">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {clearable && selectedOption && !disabled && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="p-0.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown
            size={16}
            className={`text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180 text-primary" : ""}`}
          />
        </div>
      </button>

      {/* Floating Dropdown Portal */}
      {isOpen && (
        <ModalPortal>
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: coords.placeAbove ? "auto" : `${coords.top}px`,
              bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : "auto",
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="bg-card border border-border/80 rounded-xl shadow-lg overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Search Bar */}
            {isSearchable && (
              <div className="p-2 border-b border-border/60 bg-secondary/20">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm kiếm..."
                    className="w-full pl-8 pr-3 py-1.5 bg-background border border-border/60 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto p-1 space-y-0.5">
              {filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);

                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition-colors ${
                      opt.disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                    } ${
                      isSelected
                        ? "bg-primary/10 text-primary font-bold"
                        : "hover:bg-secondary/60 text-foreground font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {opt.colorDot && (
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${opt.colorDot}`} />
                      )}
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <div className="min-w-0 truncate">
                        <div className="truncate">{opt.label}</div>
                        {opt.sublabel && (
                          <div className="text-[10px] text-muted-foreground truncate">{opt.sublabel}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {opt.badge && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                            badgeVariantClasses[opt.badgeVariant || "default"]
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check size={14} className="text-primary" />}
                    </div>
                  </button>
                );
              })}

              {filteredOptions.length === 0 && (
                <div className="p-3 text-center text-xs text-muted-foreground italic">
                  Không tìm thấy lựa chọn nào
                </div>
              )}
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
