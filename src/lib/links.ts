import type { WeekContext } from "@/types/views";

/** Report links (brief 07) always name their week, so a report is for the week chosen. */
export function reportLinks(
  clientId: string,
  weekKey: string,
  workstreamId?: string
): { html: string; pptx: string } {
  const html = workstreamId
    ? `/clients/${clientId}/workstreams/${workstreamId}/report?week=${weekKey}`
    : `/clients/${clientId}/report?week=${weekKey}`;
  const pptx = `/clients/${clientId}/report.pptx?week=${weekKey}${workstreamId ? `&workstream=${workstreamId}` : ""}`;
  return { html, pptx };
}

/** Keeps `?week=` on links to other pages when viewing a past week. */
export function withWeek(href: string, week: WeekContext): string {
  if (!week.closed) return href;
  const [path, hash] = href.split("#");
  return `${path}${path.includes("?") ? "&" : "?"}week=${week.key}${hash ? `#${hash}` : ""}`;
}
