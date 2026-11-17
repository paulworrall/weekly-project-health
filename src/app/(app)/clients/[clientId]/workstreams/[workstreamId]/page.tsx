import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkstreamBody } from "@/components/features/workstream-body";
import { ClosedWeekNote, WeekPicker } from "@/components/features/week";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { InternalPill } from "@/components/ui/pill";
import { formatDate } from "@/lib/dates";
import { withWeek } from "@/lib/links";
import { requireViewer } from "@/lib/viewer";
import { getWorkstreamOverview, now } from "@/mocks/repository";

export const metadata: Metadata = { title: "Workstream" };

const btnOutline =
  "inline-flex min-h-11 items-center border border-navy bg-white px-4.5 text-[14px] font-medium no-underline";

export default async function WorkstreamPage(
  props: PageProps<"/clients/[clientId]/workstreams/[workstreamId]">
) {
  await requireViewer();
  const { clientId, workstreamId } = await props.params;
  const { week } = await props.searchParams;
  const v = getWorkstreamOverview(clientId, workstreamId, week);
  if (!v) notFound();
  const clientHref = withWeek(`/clients/${v.client.id}`, v.week);
  const logBase = `/clients/${v.client.id}`;

  return (
    <>
      <Breadcrumb
        items={[{ label: v.client.name, href: clientHref }, { label: v.workstream.name }]}
      />
      <ClosedWeekNote
        week={v.week}
        basePath={`/clients/${v.client.id}/workstreams/${v.workstream.id}`}
      />
      <div className="mt-2 mb-6 flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0 flex-[1_1_520px]">
          <p className="eyebrow mb-2.5">Workstream overview · {v.week.label}</p>
          <h1 className="text-[40px] leading-tight font-light sm:text-[48px]">
            {v.workstream.name}
          </h1>
          <p className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[15px]">
            <span>
              {v.client.name} ·{" "}
              {v.workstream.accountDirector
                ? `Account Director ${v.workstream.accountDirector} · `
                : ""}
              {v.projects.length} projects in file · Spend upload{" "}
              {formatDate(v.latestUpload?.upload.extractDate)} ·
            </span>
            <InternalPill />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <WeekPicker weeks={v.weeks} value={v.week.key} />
          <Link
            href={withWeek(`${logBase}/risks?ws=${v.workstream.id}`, v.week)}
            className={btnOutline}
          >
            Risks report
          </Link>
          <Link
            href={withWeek(`${logBase}/issues?ws=${v.workstream.id}`, v.week)}
            className={btnOutline}
          >
            Issues report
          </Link>
        </div>
      </div>
      <WorkstreamBody v={v} now={now().toISOString()} />
    </>
  );
}
