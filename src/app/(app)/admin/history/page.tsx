import type { Metadata } from "next";
import { Forbidden } from "@/components/features/forbidden";
import { SimpleTablePage } from "@/components/features/simple-table";
import { formatDateTime } from "@/lib/dates";
import { canAdminister } from "@/lib/permissions";
import { requireViewer } from "@/lib/viewer";
import { getAuditEvents } from "@/mocks/repository";

export const metadata: Metadata = { title: "Change history" };

const ACTION = {
  CREATE: "Created",
  UPDATE: "Changed",
  ARCHIVE: "Archived",
  RESTORE: "Restored",
} as const;

export default async function HistoryPage() {
  const viewer = await requireViewer();
  if (!canAdminister(viewer)) return <Forbidden backHref="/clients" />;
  return (
    <SimpleTablePage
      eyebrow="Admin · Change history"
      title="Change history"
      intro="Every change to user-entered data: who, when, what, and the old and new values."
      columns={[
        { label: "When" },
        { label: "Who" },
        { label: "What" },
        { label: "Record" },
        { label: "Field" },
        { label: "Old value" },
        { label: "New value" },
      ]}
      rows={getAuditEvents().map((e) => ({
        key: e.id,
        cells: [
          formatDateTime(e.at),
          e.userName,
          ACTION[e.action],
          `${e.entity} ${e.entityId}`,
          e.field === "*" ? "—" : e.field,
          e.oldValue ?? "—",
          e.newValue ?? "—",
        ],
      }))}
      note="Sample entries. Real entries are written with every change from brief 02."
    />
  );
}
