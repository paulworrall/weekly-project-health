import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReportSlides } from "@/components/report/report-slides";
import { ReportView } from "@/components/report/report-view";
import { reportLinks } from "@/lib/links";
import { loadReport } from "@/server/report";

export const metadata: Metadata = { title: "Workstream report" };

/** One workstream's weekly report as HTML slides (brief 07). */
export default async function WorkstreamReportPage(
  props: PageProps<"/clients/[clientId]/workstreams/[workstreamId]/report">
) {
  const { clientId, workstreamId } = await props.params;
  const { week } = await props.searchParams;
  const report = await loadReport({ clientId, workstreamId }, week, "HTML");
  if (!report) notFound();
  const m = report.meta;
  return (
    <ReportView
      title={`${m.clientName} · ${m.name}`}
      subtitle={`${m.weekLabel} · ${m.asOfText} · ${report.slides.length} slides`}
      pptxHref={reportLinks(m.clientId, m.weekKey, workstreamId).pptx}
    >
      <ReportSlides report={report} />
    </ReportView>
  );
}
