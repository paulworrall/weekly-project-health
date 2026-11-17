import type { Metadata } from "next";
import { Tag } from "@/components/features/display";
import { Forbidden } from "@/components/features/forbidden";
import { SimpleTablePage } from "@/components/features/simple-table";
import { formatDateTime } from "@/lib/dates";
import { canAdminister } from "@/lib/permissions";
import { requireViewer } from "@/lib/viewer";
import { getUsers } from "@/mocks/repository";

export const metadata: Metadata = { title: "Users and access" };

export default async function UsersPage() {
  const viewer = await requireViewer();
  if (!canAdminister(viewer)) return <Forbidden backHref="/clients" />;
  const users = getUsers();
  return (
    <SimpleTablePage
      eyebrow="Admin · Users and access"
      title="Users and access"
      intro="Admin and Updaters (Project Managers and Account Directors). Updaters see every client."
      columns={[
        { label: "Name" },
        { label: "Email" },
        { label: "Role" },
        { label: "Last signed in" },
        { label: "Status" },
      ]}
      rows={users.map((u) => ({
        key: u.id,
        cells: [
          u.name,
          u.email,
          u.role === "ADMIN" ? "Admin" : "Updater",
          u.lastSignInAt ? formatDateTime(u.lastSignInAt) : "Never",
          u.archivedAt ? (
            <Tag tone="muted">Archived</Tag>
          ) : u.lastSignInAt ? (
            <Tag>Active</Tag>
          ) : (
            <Tag tone="warning">Not signed in yet</Tag>
          ),
        ],
      }))}
      note="Creating users, setting roles, resetting passwords, unlocking and archiving arrive with sign-in (brief 03)."
    />
  );
}
