import { notFound } from "next/navigation";
import type { LogKind } from "@/types/domain";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { withWeek } from "@/lib/links";
import { requireViewer } from "@/lib/viewer";
import { getRepository } from "@/server/repository";
import { LogView } from "./log-view";
import { ClosedWeekNote } from "./week";

/** Server part shared by /risks and /issues. */
export async function LogPage({
  clientId,
  kind,
  searchParams,
}: {
  clientId: string;
  kind: LogKind;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  await requireViewer();
  const repo = await getRepository();
  const data = repo.getLogData(clientId, searchParams.week);
  if (!data) notFound();
  const ws = typeof searchParams.ws === "string" ? searchParams.ws : "";
  const path = `/clients/${data.client.id}/${kind === "RISK" ? "risks" : "issues"}`;
  return (
    <>
      <Breadcrumb
        items={[
          { label: data.client.name, href: withWeek(`/clients/${data.client.id}`, data.week) },
          { label: kind === "RISK" ? "Risk log" : "Issue log" },
        ]}
      />
      <ClosedWeekNote week={data.week} basePath={path} />
      <LogView data={data} kind={kind} initialWs={ws} />
    </>
  );
}
