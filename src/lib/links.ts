import type { WeekContext } from "@/types/views";

/** Keeps `?week=` on links to other pages when viewing a past week. */
export function withWeek(href: string, week: WeekContext): string {
  if (!week.closed) return href;
  const [path, hash] = href.split("#");
  return `${path}${path.includes("?") ? "&" : "?"}week=${week.key}${hash ? `#${hash}` : ""}`;
}
