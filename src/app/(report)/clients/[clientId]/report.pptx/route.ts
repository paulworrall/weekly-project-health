/**
 * The weekly report as a PowerPoint download (brief 07):
 *   GET /clients/[clientId]/report.pptx?week=2026-W47&workstream=<id>
 * Same checks as the HTML report: signed in, Admin or Updater, a known client and a reported
 * workstream. Each download is recorded in the change history; the file isn't stored.
 */
import { notFound } from "next/navigation";
import { loadReport } from "@/server/report";
import { renderReportPptx } from "@/services/documents/report-pptx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** "Northwind Drinks weekly report 2026-W47.pptx", safe in a Content-Disposition header. */
function disposition(name: string): string {
  const file = `${name}.pptx`;
  const ascii = file.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file)}`;
}

export async function GET(request: Request, ctx: RouteContext<"/clients/[clientId]/report.pptx">) {
  const { clientId } = await ctx.params;
  const url = new URL(request.url);
  const week = url.searchParams.get("week") ?? undefined;
  const workstreamId = url.searchParams.get("workstream") || undefined;
  const report = await loadReport({ clientId, workstreamId }, week, "PPTX");
  if (!report) notFound();
  const file = await renderReportPptx(report);
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": disposition(report.meta.fileName),
      "Cache-Control": "private, no-store",
    },
  });
}
