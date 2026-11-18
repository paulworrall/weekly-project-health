/**
 * Loads a weekly report for a signed-in person and records the generation (brief 07). Used by the
 * HTML report pages and the PowerPoint route. Admins and Updaters may both generate; an unknown
 * client or a hidden workstream gives null (Not found). Nothing is stored except the audit row.
 */
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit-db";
import { buildReport } from "@/lib/report";
import { canView } from "@/lib/permissions";
import { requireViewer } from "@/lib/viewer";
import type { Report, ReportFormat, ReportScope } from "@/types/report";
import { getRepository } from "./repository";

export const FORMAT_LABEL: Record<ReportFormat, string> = { HTML: "HTML", PPTX: "PowerPoint" };

export async function loadReport(
  scope: ReportScope,
  weekParam: string | string[] | undefined,
  format: ReportFormat
): Promise<Report | null> {
  const viewer = await requireViewer();
  if (!canView(viewer)) return null;
  const repo = await getRepository(weekParam);
  const report = buildReport(repo, scope, weekParam, repo.now());
  if (!report) return null;
  const m = report.meta;
  await prisma.$transaction((tx) =>
    writeAudit(tx, viewer.id, [
      {
        action: "GENERATE",
        entity: "Report",
        entityId: m.workstreamId ? `${m.clientId}/${m.workstreamId}` : m.clientId,
        field: "format",
        oldValue: null,
        newValue: `${FORMAT_LABEL[format]} · ${m.name} · ${m.weekKey}`,
      },
    ])
  );
  return report;
}
