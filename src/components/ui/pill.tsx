import type { ReactNode } from "react";

export type PillTone = "navy" | "tint" | "cream" | "outline" | "orange" | "amber" | "white";

const tones: Record<PillTone, string> = {
  navy: "bg-navy text-white",
  tint: "bg-tint text-navy",
  cream: "bg-cream text-navy",
  outline: "bg-white text-navy border border-navy",
  orange: "bg-orange text-navy",
  amber: "bg-rag-amber text-navy",
  white: "bg-white text-navy",
};

/** Rounded pill: the only rounded element in the design system. */
export function Pill({
  tone = "navy",
  children,
  className = "",
}: {
  tone?: PillTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium tracking-[0.08em] whitespace-nowrap uppercase ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** "Internal" label for internal-only pages and sections. */
export function InternalPill({ children = "Internal" }: { children?: ReactNode }) {
  return <Pill tone="navy">{children}</Pill>;
}
