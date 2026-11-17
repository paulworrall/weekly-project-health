/** Pagination maths for lists (25 / 50 / 100 rows). */

export const PAGE_SIZES = [25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export function pageCount(total: number, size: number): number {
  return Math.max(1, Math.ceil(total / size));
}

/** Clamp a page number into range. */
export function clampPage(page: number, total: number, size: number): number {
  return Math.min(Math.max(1, Math.floor(page)), pageCount(total, size));
}

/** "Showing 1–25 of 181", or "Showing 0 of 0". */
export function rangeText(page: number, size: number, total: number): string {
  if (total === 0) return "Showing 0 of 0";
  const p = clampPage(page, total, size);
  const first = (p - 1) * size + 1;
  const last = Math.min(p * size, total);
  return `Showing ${first}–${last} of ${total}`;
}

export function pageSlice<T>(items: readonly T[], page: number, size: number): T[] {
  const p = clampPage(page, items.length, size);
  return items.slice((p - 1) * size, p * size);
}

/** Page buttons with gaps: first, last and the current page ±1, e.g. [1, "gap", 4, 5, 6, "gap", 8]. */
export function pageItems(page: number, pages: number): (number | "gap")[] {
  const keep: number[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) keep.push(p);
  }
  const out: (number | "gap")[] = [];
  keep.forEach((p, i) => {
    if (i > 0 && p - keep[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}
