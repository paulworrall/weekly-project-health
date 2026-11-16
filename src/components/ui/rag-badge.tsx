import { RAG, ragLabel, type Rag } from "@/lib/rag";

/** Delivery RAG pill: fill colour plus a shape cue plus the words, never colour alone. */
export function RagBadge({ rag, className = "" }: { rag: Rag; className?: string }) {
  const meta = RAG[rag];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium whitespace-nowrap text-navy ${meta.bgClass} ${className}`}
    >
      <RagShape rag={rag} />
      {ragLabel(rag)}
    </span>
  );
}

/** Green: circle, Amber: triangle, Red: square. A second cue for colour-blind readers. */
function RagShape({ rag }: { rag: Rag }) {
  return (
    <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden="true" focusable="false">
      {rag === "GREEN" ? <circle cx="5" cy="5" r="4.5" fill="currentColor" /> : null}
      {rag === "AMBER" ? <path d="M5 0.5L9.5 9.5H0.5z" fill="currentColor" /> : null}
      {rag === "RED" ? <rect x="1" y="1" width="8" height="8" fill="currentColor" /> : null}
    </svg>
  );
}
