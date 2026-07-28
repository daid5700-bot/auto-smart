"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { ModalPortal } from "@/components/modal-portal";

type CheckboxMultiSelectProps = {
  id?: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
};

const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi")
    .trim();

export function CheckboxMultiSelect({
  id,
  options,
  value,
  onChange,
  placeholder = "-- Không chọn --",
  searchPlaceholder = "Tìm kiếm...",
  disabled = false,
}: CheckboxMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    width: 240,
    placeAbove: false,
  });

  const uniqueOptions = Array.from(
    new Map(
      [...value, ...options]
        .map((option) => option.trim())
        .filter(Boolean)
        .map((option) => [option.toLocaleLowerCase("vi"), option] as const),
    ).values(),
  ).sort((a, b) => a.localeCompare(b, "vi"));

  const selectedKeys = new Set(value.map((item) => item.toLocaleLowerCase("vi")));
  const normalizedQuery = normalizeSearch(search);
  const filteredOptions = uniqueOptions.filter((option) =>
    normalizeSearch(option).includes(normalizedQuery),
  );

  const updatePosition = () => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const estimatedHeight = 310;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < estimatedHeight && rect.top > estimatedHeight;

    setCoords({
      top: placeAbove ? rect.top - 8 : rect.bottom + 8,
      left: rect.left,
      width: Math.max(rect.width, 260),
      placeAbove,
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    const handlePositionChange = () => updatePosition();
    window.addEventListener("scroll", handlePositionChange, true);
    window.addEventListener("resize", handlePositionChange);

    return () => {
      window.removeEventListener("scroll", handlePositionChange, true);
      window.removeEventListener("resize", handlePositionChange);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const focusTimer = window.setTimeout(() => searchInputRef.current?.focus(), 50);
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setSearch("");
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const toggleOption = (option: string) => {
    const optionKey = option.toLocaleLowerCase("vi");
    if (selectedKeys.has(optionKey)) {
      onChange(value.filter((item) => item.toLocaleLowerCase("vi") !== optionKey));
      return;
    }
    onChange([...value, option]);
  };

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border bg-secondary/30 px-3 py-2 text-left text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 ${
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer hover:border-primary/40 hover:bg-secondary/50"
        } ${isOpen ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border"}`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
          {value.length === 0 ? (
            <span className="truncate font-medium text-muted-foreground">{placeholder}</span>
          ) : (
            <>
              {value.slice(0, 2).map((item) => (
                <span
                  key={item}
                  className="max-w-[42%] truncate rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
                >
                  {item}
                </span>
              ))}
              {value.length > 2 && (
                <span className="shrink-0 rounded-md bg-secondary px-2 py-0.5 text-xs font-bold text-foreground">
                  +{value.length - 2}
                </span>
              )}
            </>
          )}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-muted-foreground transition-transform ${
            isOpen ? "rotate-180 text-primary" : ""
          }`}
        />
      </button>

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
            className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="border-b border-border/60 bg-secondary/20 p-2">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="w-full rounded-lg border border-border/60 bg-background py-2 pl-8 pr-8 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Xóa nội dung tìm kiếm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-border/60 px-3 py-2 text-[11px]">
              <span className="font-semibold text-muted-foreground">Đã chọn {value.length} tên xe</span>
              {value.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="font-bold text-primary hover:underline"
                >
                  Bỏ chọn tất cả
                </button>
              )}
            </div>

            <div
              role="listbox"
              aria-multiselectable="true"
              className="max-h-56 space-y-0.5 overflow-y-auto p-1.5"
            >
              {filteredOptions.map((option) => {
                const isSelected = selectedKeys.has(option.toLocaleLowerCase("vi"));
                return (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => toggleOption(option)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors ${
                      isSelected
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-secondary/60"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background"
                      }`}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span className="truncate">{option}</span>
                  </button>
                );
              })}

              {filteredOptions.length === 0 && (
                <div className="px-3 py-5 text-center text-xs italic text-muted-foreground">
                  Không tìm thấy tên xe phù hợp
                </div>
              )}
            </div>

            <div className="border-t border-border/60 bg-secondary/10 p-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setSearch("");
                  triggerRef.current?.focus();
                }}
                className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Xong
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
