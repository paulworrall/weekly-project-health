/**
 * Delivery RAG (CLAUDE.md §3). Always shown as colour word + meaning, never colour alone:
 * "Green · On track", "Amber · At risk", "Red · Blocked". Fills are CSS tokens in globals.css
 * (proposed, not yet signed off), so they change in one place.
 */

export const RAG_VALUES = ["GREEN", "AMBER", "RED"] as const;
export type Rag = (typeof RAG_VALUES)[number];

interface RagMeta {
  /** Colour word. */
  word: "Green" | "Amber" | "Red";
  /** What the colour means. */
  meaning: "On track" | "At risk" | "Blocked";
  /** CSS variable holding the fill. */
  token: "--rag-green" | "--rag-amber" | "--rag-red";
  /** Tailwind background class for the fill (Navy text goes on top). */
  bgClass: "bg-rag-green" | "bg-rag-amber" | "bg-rag-red";
}

export const RAG: Record<Rag, RagMeta> = {
  GREEN: { word: "Green", meaning: "On track", token: "--rag-green", bgClass: "bg-rag-green" },
  AMBER: { word: "Amber", meaning: "At risk", token: "--rag-amber", bgClass: "bg-rag-amber" },
  RED: { word: "Red", meaning: "Blocked", token: "--rag-red", bgClass: "bg-rag-red" },
};

/** "Green · On track". */
export function ragLabel(rag: Rag): string {
  const { word, meaning } = RAG[rag];
  return `${word} · ${meaning}`;
}

export function isRag(value: unknown): value is Rag {
  return typeof value === "string" && (RAG_VALUES as readonly string[]).includes(value);
}

/** Counts per RAG value, in display order (Green, Amber, Red). Unknown values are ignored. */
export function ragCounts(values: readonly (Rag | null | undefined)[]): Record<Rag, number> {
  const counts: Record<Rag, number> = { GREEN: 0, AMBER: 0, RED: 0 };
  for (const v of values) if (v && isRag(v)) counts[v] += 1;
  return counts;
}
