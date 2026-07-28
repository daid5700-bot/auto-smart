"use client";

import React from "react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemLabel?: string;
  className?: string;
  hideOnSinglePage?: boolean;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  itemLabel = "bản ghi",
  className = "",
  hideOnSinglePage = true,
}: PaginationProps) {
  if (hideOnSinglePage && (totalPages <= 1 || !totalPages)) {
    return null;
  }

  const maxPages = Math.max(1, totalPages || 1);
  const currentPage = Math.max(1, Math.min(page, maxPages));

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs bg-secondary/10 ${className}`}>
      <p className="text-muted-foreground">
        {totalItems !== undefined && (
          <>
            Tổng <span className="font-semibold text-foreground">{totalItems}</span> {itemLabel} ·{" "}
          </>
        )}
        Trang <span className="font-semibold text-foreground">{currentPage}</span> /{" "}
        <span className="font-semibold text-foreground">{maxPages}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          title="Trang đầu"
          className="rounded-lg border border-border px-2 py-1 font-medium transition hover:bg-secondary/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          «
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage <= 1}
          title="Trang trước"
          className="rounded-lg border border-border px-3 py-1 font-medium transition hover:bg-secondary/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ‹
        </button>

        {Array.from({ length: Math.min(5, maxPages) }, (_, i) => {
          const p = Math.max(1, Math.min(currentPage - 2, maxPages - 4)) + i;
          if (p > maxPages) return null;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`rounded-lg border px-3 py-1 font-semibold transition ${
                p === currentPage
                  ? "border-primary bg-primary text-white"
                  : "border-border hover:bg-secondary/40"
              }`}
            >
              {p}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(currentPage + 1, maxPages))}
          disabled={currentPage >= maxPages}
          title="Trang sau"
          className="rounded-lg border border-border px-3 py-1 font-medium transition hover:bg-secondary/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ›
        </button>
        <button
          type="button"
          onClick={() => onPageChange(maxPages)}
          disabled={currentPage >= maxPages}
          title="Trang cuối"
          className="rounded-lg border border-border px-2 py-1 font-medium transition hover:bg-secondary/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          »
        </button>
      </div>
    </div>
  );
}

export default Pagination;
