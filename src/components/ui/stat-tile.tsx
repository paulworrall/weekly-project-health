import type { ReactNode } from "react";

/** Summary tile: eyebrow label, big number, sub-line. Flat fill, square corners, no shadow. */
export function StatTile({
  label,
  value,
  sub,
  variant = "default",
  className = "",
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  variant?: "default" | "navy";
  className?: string;
}) {
  const navy = variant === "navy";
  return (
    <div
      className={`flex flex-col gap-2 p-5 ${navy ? "bg-navy text-white" : "bg-white text-navy"} ${className}`}
    >
      <span
        className={`text-[13px] font-medium tracking-[0.1em] uppercase ${navy ? "text-white" : "text-muted"}`}
      >
        {label}
      </span>
      <span className="text-[40px] leading-none font-light">{value}</span>
      {sub ? (
        <span className={`text-[14px] ${navy ? "text-white" : "text-muted"}`}>{sub}</span>
      ) : null}
    </div>
  );
}
