import type { Metadata } from "next";
import Link from "next/link";
import { Forbidden } from "@/components/features/forbidden";
import { SimpleTablePage } from "@/components/features/simple-table";
import { formatDate } from "@/lib/dates";
import { canAdminister } from "@/lib/permissions";
import { requireViewer } from "@/lib/viewer";
import { getRepository } from "@/server/repository";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const viewer = await requireViewer();
  const repo = await getRepository();
  if (!canAdminister(viewer)) return <Forbidden backHref="/clients" />;
  return (
    <SimpleTablePage
      eyebrow="Admin · Clients"
      title="Clients"
      intro="Add a client before its first spend upload."
      columns={[
        { label: "Client" },
        { label: "Workstreams", align: "right" },
        { label: "Reported", align: "right" },
        { label: "Projects", align: "right" },
        { label: "Latest upload" },
      ]}
      rows={repo.getClientsTable().map((c) => ({
        key: c.id,
        cells: [
          <Link key="l" href={`/clients/${c.id}`}>
            {c.name}
          </Link>,
          c.workstreams,
          c.reported,
          c.projects,
          formatDate(c.latestUpload),
        ],
      }))}
      note="Creating, renaming and archiving clients arrive in a later brief."
    />
  );
}
