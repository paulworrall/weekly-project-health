import type { Metadata } from "next";
import { ClientsManager } from "@/components/features/clients-manager";
import { Forbidden } from "@/components/features/forbidden";
import { PageHeader } from "@/components/layout/page-header";
import { canAdminister } from "@/lib/permissions";
import { requireViewer } from "@/lib/viewer";
import { getRepository } from "@/server/repository";
import {
  archiveClientAction,
  createClientAction,
  renameClientAction,
  restoreClientAction,
} from "./actions";

export const metadata: Metadata = { title: "Clients" };

/** Admin › Clients (brief 08): active clients A–Z, then archived ones. */
export default async function ClientsPage() {
  const viewer = await requireViewer();
  if (!canAdminister(viewer)) return <Forbidden backHref="/clients" />;
  const repo = await getRepository();
  const rows = repo
    .getClientsTable()
    .sort(
      (a, b) =>
        Number(!!a.archivedAt) - Number(!!b.archivedAt) || a.name.localeCompare(b.name, "en-GB")
    );
  return (
    <>
      <PageHeader
        eyebrow="Admin · Clients"
        title="Clients"
        meta="Each client gets one spend file a week. Add a client before its first spend upload."
        internal
      />
      <ClientsManager
        actions={{
          create: createClientAction,
          rename: renameClientAction,
          archive: archiveClientAction,
          restore: restoreClientAction,
        }}
        clients={rows.map((c) => ({
          id: c.id,
          name: c.name,
          workstreams: c.workstreams,
          reported: c.reported,
          projects: c.projects,
          latestUpload: c.latestUpload,
          archivedAt: c.archivedAt,
        }))}
      />
    </>
  );
}
