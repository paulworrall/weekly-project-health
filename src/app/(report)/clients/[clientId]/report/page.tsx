import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReportSlides } from "@/components/report/report-slides";
import { ReportView } from "@/components/report/report-view";
import { reportLinks } from "@/lib/links";
import { loadReport } from "@/server/report";

export const metadata: Metadata = { title: "Weekly report" };

/** Client weekly report as HTML slides (brief 07). Outside the app shell; prints one slide per page. */
export default async function ClientReportPage(props: PageProps<"/clients/[clientId]/report">) {
  const { clientId } = await props.params;
  const { week } = await props.searchParams;
  const report = await loadReport({ clientId }, week, "HTML");
  if (!report) notFound();
  const m = report.meta;
  return (
    <ReportView
      title={m.name}
      subtitle={`${m.weekLabel} · ${m.asOfText} · ${report.slides.length} slides`}
      pptxHref={reportLinks(m.clientId, m.weekKey).pptx}
    >
      <ReportSlides report={report} />
    </ReportView>
  );
}
