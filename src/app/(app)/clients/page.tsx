import type { Metadata } from "next";
import { ClientCard } from "@/components/features/client-card";
import { ClosedWeekNote, WeekPicker } from "@/components/features/week";
import { InternalPill } from "@/components/ui/pill";
import { requireViewer } from "@/lib/viewer";
import { getClientList, resolveWeek, weekOptions } from "@/mocks/repository";

export const metadata: Metadata = { title: "Clients" };

/** Client list: where Updaters land, and the "Clients" menu item (decision 17 Nov). */
export default async function ClientsPage(props: PageProps<"/clients">) {
  await requireViewer();
  const { week: weekParam } = await props.searchParams;
  const week = resolveWeek(weekParam);
  const clients = getClientList(weekParam);
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
        <WeekPicker weeks={weekOptions()} value={week.key} />
      </div>
      <div className="flex flex-col gap-4">
        {clients.map((c) => (
          <ClientCard key={c.client.id} c={c} />
        ))}
      </div>
    </>
  );
}
