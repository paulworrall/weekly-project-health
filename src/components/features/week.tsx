"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useId } from "react";
import type { WeekContext, WeekOption } from "@/types/views";

/** Week select: switches the page to a past week (`?week=`), read-only, or back to the open week. */
export function WeekPicker({
  weeks,
  value,
  stacked = false,
}: {
  weeks: WeekOption[];
  value: string;
  stacked?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const id = useId();
  const openKey = weeks.find((w) => !w.closed)?.key;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={stacked ? "lbl" : "sr-only"}>
        Week
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => {
          const key = e.target.value;
          router.push(key === openKey ? pathname : `${pathname}?week=${key}`);
        }}
        className="min-h-11 cursor-pointer border border-navy bg-white px-3 text-[14px] text-navy"
      >
        {weeks.map((w) => (
          <option key={w.key} value={w.key}>
            {w.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** "Week 46 is closed" note shown at the top of every page viewing a past week. */
export function ClosedWeekNote({ week, basePath }: { week: WeekContext; basePath: string }) {
  if (!week.closed) return null;
  return (
    <div
      role="note"
      className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 bg-line-soft px-4 py-3 text-[14px]"
    >
      <span className="font-medium">Week {week.ref.isoWeek} is closed.</span>
      <span>This is the snapshot saved at the close, so nothing can be edited.</span>
      <Link href={basePath} className="underline underline-offset-2">
        Go to the open week
      </Link>
    </div>
  );
}
