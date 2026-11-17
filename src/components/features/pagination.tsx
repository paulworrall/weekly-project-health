"use client";

import { useId } from "react";
import { PAGE_SIZES, pageCount, pageItems, rangeText } from "@/lib/pagination";

const btn =
  "inline-flex min-h-11 min-w-11 items-center justify-center border border-navy px-3 text-[14px]";

/** Range text, rows-per-page select and page buttons with gaps. */
export function Pagination({
  label,
  page,
  size,
  total,
  onPage,
  onSize,
}: {
  label: string;
  page: number;
  size: number;
  total: number;
  onPage: (page: number) => void;
  onSize: (size: number) => void;
}) {
  const id = useId();
  const pages = pageCount(total, size);
  const p = Math.min(page, pages);
  return (
    <nav
      aria-label={label}
      className="flex flex-wrap items-center justify-between gap-4 border-t border-navy py-4"
    >
      <div className="flex flex-wrap items-center gap-4 text-[14px]">
        <span role="status">{rangeText(p, size, total)}</span>
        <label htmlFor={id} className="inline-flex items-center gap-2">
          Rows per page
          <select
            id={id}
            value={size}
            onChange={(e) => onSize(Number(e.target.value))}
            className="min-h-11 cursor-pointer border border-navy bg-white px-2.5 text-[14px]"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPage(p - 1)}
          disabled={p <= 1}
          className={`${btn} cursor-pointer bg-white disabled:cursor-not-allowed disabled:opacity-40`}
        >
          ← Previous
        </button>
        {pageItems(p, pages).map((it, i) =>
          it === "gap" ? (
            <span
              key={`gap-${i}`}
              aria-hidden="true"
              className="inline-flex min-w-8 justify-center"
            >
              …
            </span>
          ) : (
            <button
              key={it}
              type="button"
              onClick={() => onPage(it)}
              aria-label={`Page ${it}`}
              aria-current={it === p ? "page" : undefined}
              className={`${btn} cursor-pointer ${it === p ? "bg-navy font-medium text-white" : "bg-white"}`}
            >
              {it}
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => onPage(p + 1)}
          disabled={p >= pages}
          className={`${btn} cursor-pointer bg-white disabled:cursor-not-allowed disabled:opacity-40`}
        >
          Next →
        </button>
      </div>
    </nav>
  );
}
