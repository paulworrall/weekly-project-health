import Link from "next/link";
import { ChevronRightIcon } from "@/components/ui/icons";

export interface Crumb {
  label: string;
  /** Omit for the current page (the last crumb). */
  href?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-[14px] text-muted">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
              {c.href && !last ? (
                <Link href={c.href} className="underline underline-offset-2">
                  {c.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className="text-navy">
                  {c.label}
                </span>
              )}
              {last ? null : <ChevronRightIcon size={14} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
