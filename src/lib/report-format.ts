/**
 * Shared wording and colours for the two report renderers (HTML slides and PowerPoint, brief 07).
 * Colours are the design tokens from src/app/globals.css as hex, because PowerPoint can't read
 * CSS variables; keep them in step with the tokens.
 */
import type { Likelihood, ProjectStatus, Rag, Spend } from "@/types/domain";
import type { RagCounts } from "@/types/views";
import { LIKELIHOOD_LABEL, PROJECT_STATUS_LABEL } from "./labels";
import { ragLabel } from "./rag";
import { isOverBudget, spendLabel } from "./spend";

export const COLOUR = {
  navy: "000050",
  cream: "FAFAF0",
  white: "FFFFFF",
  orange: "FF7800",
  eyebrow: "B34F00",
  overspend: "A03A00",
  muted: "59598D",
  line: "D9D9E5",
  lineStrong: "666696",
  track: "E6E6EE",
  pinned: "FFF1C9",
  warning: "FFE3C2",
  green: "B4FF64",
  amber: "F9BD5D",
  red: "FFB4B4",
} as const;

export const RAG_ORDER: Rag[] = ["GREEN", "AMBER", "RED"];
export const RAG_FILL: Record<Rag, string> = {
  GREEN: COLOUR.green,
  AMBER: COLOUR.amber,
  RED: COLOUR.red,
};
export const LIKELIHOOD_FILL: Record<Likelihood, string> = {
  HIGH: COLOUR.navy,
  MEDIUM: COLOUR.amber,
  LOW: COLOUR.lineStrong,
};

export const FOOTER = "Internal: not for client distribution";

/** "Green · On track". */
export function ragText(rag: Rag | null): string {
  return rag ? ragLabel(rag) : "—";
}

/** "18 Green · On track, 8 Amber · At risk, 3 Red · Blocked". */
export function ragCountsText(c: RagCounts): string {
  return RAG_ORDER.map((r) => `${c[r]} ${ragText(r)}`).join(", ");
}

export function statusText(s: ProjectStatus | null): string {
  return s ? PROJECT_STATUS_LABEL[s] : "—";
}

export function likelihoodText(l: Likelihood): string {
  return LIKELIHOOD_LABEL[l];
}

/** "72.0%", "112.0% · Over budget", "No timesheet data", "Add budget". */
export function spendText(s: Spend): string {
  return `${spendLabel(s)}${isOverBudget(s) ? " · Over budget" : ""}`;
}

/** "▲ +2", "▼ −1", "no change". */
export function deltaText(now: number, prev: number): string {
  const d = now - prev;
  if (d === 0) return "no change";
  return d > 0 ? `▲ +${d}` : `▼ −${-d}`;
}

/** Words for a change, for screen readers: "up 2 on last week". */
export function deltaWords(now: number, prev: number): string {
  const d = now - prev;
  if (d === 0) return "no change on last week";
  return `${d > 0 ? "up" : "down"} ${Math.abs(d)} on last week`;
}
