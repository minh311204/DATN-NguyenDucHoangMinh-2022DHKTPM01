"use client";

import { ChevronsLeft, ChevronsRight } from "lucide-react";

const DEFAULT_PAGE_SIZES = [5, 9, 10, 15, 20, 50];

/** Trang đang chọn — cam giống mockup thương mại điện tử */
const ACTIVE_PAGE =
  "min-w-[2.25rem] rounded-md bg-[#ff6600] px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm";

const PAGE_BTN =
  "min-w-[2.25rem] rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900";

const EDGE_BTN =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300";

function visiblePages(current: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const set = new Set<number>();
  set.add(1);
  set.add(totalPages);
  for (let i = current - 2; i <= current + 2; i++) {
    if (i >= 1 && i <= totalPages) set.add(i);
  }
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push("ellipsis");
    out.push(p);
    prev = p;
  }
  return out;
}

function mergePageSizeOptions(current: number, custom?: number[]): number[] {
  const base = custom?.length ? [...custom] : [...DEFAULT_PAGE_SIZES];
  if (!base.includes(current)) base.push(current);
  return [...new Set(base)].sort((a, b) => a - b);
}

export type AdminPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (next: number) => void;
  /** Ví dụ: "tour", "user", "booking", "giao dịch", "nhà cung cấp" */
  itemsLabel: string;
  onPageSizeChange?: (nextPageSize: number) => void;
  /** Mặc định [5, 9, 10, 15, 20, 50]; luôn gộp thêm `pageSize` hiện tại nếu thiếu */
  pageSizeOptions?: number[];
};

export function AdminPagination({
  page,
  pageSize,
  total,
  onPageChange,
  itemsLabel,
  onPageSizeChange,
  pageSizeOptions,
}: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const from = Math.min(total, (page - 1) * pageSize + 1);
  const to = Math.min(page * pageSize, total);
  const pages = visiblePages(page, totalPages);
  const sizeChoices = mergePageSizeOptions(pageSize, pageSizeOptions);

  function goTo(next: number) {
    const clamped = Math.min(Math.max(1, next), totalPages);
    onPageChange(clamped);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div
      className="border-t border-slate-200 bg-slate-50/90 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/50"
      role="navigation"
      aria-label="Phân trang"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between xl:gap-6">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          <span className="whitespace-normal">
            Hiển thị từ <strong className="text-slate-900 dark:text-slate-100">{from}</strong>{" "}
            tới <strong className="text-slate-900 dark:text-slate-100">{to}</strong> trong tổng{" "}
            <strong className="text-slate-900 dark:text-slate-100">{total}</strong> {itemsLabel}
          </span>
        </p>

        {onPageSizeChange ? (
          <label className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span className="shrink-0">
              Giới hạn hiển thị {itemsLabel} mỗi trang:
            </span>
            <select
              value={String(pageSize)}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (Number.isFinite(next)) onPageSizeChange(next);
              }}
              className="h-9 min-w-[4.5rem] rounded-md border border-slate-200 bg-white px-2.5 pr-8 text-sm font-medium text-slate-800 shadow-sm focus:border-[#ff6600] focus:outline-none focus:ring-2 focus:ring-[#ff6600]/25 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              {sizeChoices.map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-1 sm:justify-end">
          <span className="sr-only">
            Trang {page} trên {totalPages}, {total} bản ghi, {pageSize} mục mỗi trang.
          </span>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => goTo(1)}
            className={EDGE_BTN}
            aria-label="Trang đầu"
            title="Trang đầu"
          >
            <ChevronsLeft className="h-4 w-4" strokeWidth={2} />
          </button>
          <div className="flex flex-wrap items-center justify-center gap-0.5 px-1">
            {pages.map((item, idx) =>
              item === "ellipsis" ? (
                <span
                  key={`e-${idx}`}
                  className="px-1.5 text-sm font-medium text-slate-400"
                  aria-hidden
                >
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => goTo(item)}
                  className={item === page ? ACTIVE_PAGE : PAGE_BTN}
                  aria-label={`Trang ${item}`}
                  aria-current={item === page ? "page" : undefined}
                >
                  {item}
                </button>
              ),
            )}
          </div>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => goTo(totalPages)}
            className={EDGE_BTN}
            aria-label="Trang cuối"
            title="Trang cuối"
          >
            <ChevronsRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
