import type { Metadata } from "next";
import { ClientCard } from "@/components/features/client-card";
import { ClosedWeekNote, WeekPicker } from "@/components/features/week";
import { ButtonLink } from "@/components/ui/button";
import { InternalPill } from "@/components/ui/pill";
import { canAdminister } from "@/lib/permissions";
import { requireViewer } from "@/lib/viewer";
import { getRepository } from "@/server/repository";

export const metadata: Metadata = { title: "Clients" };

/** Client list: where Updaters land, and the "Clients" menu item (decision 17 Nov). */
export default async function ClientsPage(props: PageProps<"/clients">) {
  const viewer = await requireViewer();
  const repo = await getRepository();
  const { week: weekParam } = await props.searchParams;
  const week = repo.resolveWeek(weekParam);
  const clients = repo.getClientList(weekParam);
  return (
    <>
      <ClosedWeekNote week={week} basePath="/clients" />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0 flex-[1_1_520px]">
          <p className="eyebrow mb-2.5">Clients · {week.label}</p>
          <h1 className="text-[40px] leading-tight font-light sm:text-[48px]">Clients</h1>
          <p className="mt-2.5 flex flex-wrap items-center gap-2 text-[15px]">
            <span>Choose a client to see its workstreams, projects, risks and issues.</span>
            <InternalPill />
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {canAdminister(viewer) ? (
            <ButtonLink href="/admin/clients" variant="secondary">
              Add or manage clients
            </ButtonLink>
          ) : null}
          <WeekPicker weeks={repo.weekOptions()} value={week.key} />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {clients.map((c) => (
          <ClientCard key={c.client.id} c={c} />
        ))}
      </div>
    </>
  );
}
