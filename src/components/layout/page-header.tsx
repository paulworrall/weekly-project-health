import type { ReactNode } from "react";
import { InternalPill } from "@/components/ui/pill";

/** Orange eyebrow, H1, meta line, optional INTERNAL pill and an actions slot. */
export function PageHeader({
  eyebrow,
  title,
  meta,
  internal = false,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  internal?: boolean;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-6">
      <div className="flex flex-col gap-2">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-[40px] leading-tight font-light">{title}</h1>
          {internal ? <InternalPill /> : null}
        </div>
        {meta ? <p className="text-[15px] text-muted">{meta}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
