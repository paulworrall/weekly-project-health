/**
 * Admin › Change history (brief 08): filters, the database filter they make, and page numbers.
 * Pure, shared by the page and the tests. Dates are London calendar days.
 */
import { addDays, parseIsoDate } from "./dates";
import { londonOffsetMinutes } from "./week";

export const HISTORY_PAGE_SIZE = 50;

/** "What" filter: groups of audited record types, in the order shown. */
export const WHAT_GROUPS = {
  weekly: { label: "Weekly updates", entities: ["ProjectWeek"] },
  projects: { label: "Projects (in the report, spend marks)", entities: ["Project"] },
  risks: { label: "Risks", entities: ["RiskItem"] },
  issues: { label: "Issues", entities: ["IssueItem"] },
  pipeline: { label: "Pipeline", entities: ["PipelineOpportunity"] },
  reports: { label: "Reports generated", entities: ["Report"] },
  uploads: { label: "Spend uploads", entities: ["SpendUpload", "SpendUploadChange"] },
  workstreams: { label: "Workstreams", entities: ["Workstream"] },
  clients: { label: "Clients", entities: ["Client"] },
  users: { label: "Users and access", entities: ["User"] },
  weeks: { label: "Week closes", entities: ["ReportingPeriod"] },
} as const;

export type WhatGroup = keyof typeof WHAT_GROUPS;

/** Who did it: "" anyone, "system" the automatic week close, or a user id. */
export interface HistoryFilters {
  who: string;
  what: WhatGroup | "";
  from: string | null;
  to: string | null;
  page: number;
}

export const EMPTY_HISTORY_FILTERS: HistoryFilters = {
  who: "",
  what: "",
  from: null,
  to: null,
  page: 1,
};

type Params = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");

function isoDay(v: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const { y, m, d } = parseIsoDate(v);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? v : null;
}

/** Filters from the page's query string; anything not understood is ignored. */
export function parseHistoryFilters(sp: Params): HistoryFilters {
  const what = one(sp.what);
  let from = isoDay(one(sp.from));
  let to = isoDay(one(sp.to));
  if (from && to && from > to) [from, to] = [to, from];
  const page = Number.parseInt(one(sp.page), 10);
  return {
    who: /^[\w-]{1,64}$/.test(one(sp.who)) ? one(sp.who) : "",
    what: what in WHAT_GROUPS ? (what as WhatGroup) : "",
    from,
    to,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** 00:00 London on a calendar day, as a UTC instant (midnight is never inside a clock change). */
export function londonMidnight(day: string): Date {
  const { y, m, d } = parseIsoDate(day);
  const wall = Date.UTC(y, m - 1, d);
  return new Date(wall - londonOffsetMinutes(new Date(wall)) * 60_000);
}

/** The database filter for AuditEvent (Prisma `where`). */
export function historyWhere(f: HistoryFilters) {
  return {
    ...(f.who === "system" ? { userId: null } : f.who ? { userId: f.who } : {}),
    ...(f.what ? { entity: { in: [...WHAT_GROUPS[f.what].entities] } } : {}),
    ...(f.from || f.to
      ? {
          at: {
            ...(f.from ? { gte: londonMidnight(f.from) } : {}),
            ...(f.to ? { lt: londonMidnight(addDays(f.to, 1)) } : {}),
          },
        }
      : {}),
  };
}

export interface PageInfo {
  page: number;
  pages: number;
  /** 1-based positions of the first and last row shown (0 when there are none). */
  first: number;
  last: number;
  total: number;
  skip: number;
}

/** Page numbers, with the page asked for kept within range. */
export function pageInfo(total: number, page: number, size = HISTORY_PAGE_SIZE): PageInfo {
  const pages = Math.max(1, Math.ceil(total / size));
  const p = Math.min(Math.max(1, page), pages);
  const skip = (p - 1) * size;
  return {
    page: p,
    pages,
    first: total ? skip + 1 : 0,
    last: Math.min(total, skip + size),
    total,
    skip,
  };
}

/** Link to the history with these filters (empty ones left out), e.g. for page links. */
export function historyHref(f: HistoryFilters, change: Partial<HistoryFilters> = {}): string {
  const next = { ...f, ...change };
  const q = new URLSearchParams();
  if (next.who) q.set("who", next.who);
  if (next.what) q.set("what", next.what);
  if (next.from) q.set("from", next.from);
  if (next.to) q.set("to", next.to);
  if (next.page > 1) q.set("page", String(next.page));
  const s = q.toString();
  return `/admin/history${s ? `?${s}` : ""}`;
}

/** "Showing 51–100 of 734 changes", or "No changes match these filters". */
export function showingText(info: PageInfo, filtered: boolean): string {
  if (!info.total) return filtered ? "No changes match these filters." : "No changes yet.";
  return `Showing ${info.first}–${info.last} of ${info.total.toLocaleString("en-GB")} ${info.total === 1 ? "change" : "changes"}`;
}
