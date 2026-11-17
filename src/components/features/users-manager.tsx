"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import type { ActionResult } from "@/types/action-result";
import { formatDateTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/fields";
import { TableScroll, Tag, tableClass, tbodyRow, td, th, theadRow } from "./display";

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "UPDATER";
  lastSignInAt: string | null;
  archivedAt: string | null;
  lockedUntil: string | null;
  mustChangePassword: boolean;
  hasPassword: boolean;
  isSelf: boolean;
}

export interface UserActions {
  create: (input: {
    name: string;
    email: string;
    role: string;
  }) => Promise<ActionResult<{ name: string; email: string; temporaryPassword: string }>>;
  changeRole: (userId: string, role: string) => Promise<ActionResult<{ role: string }>>;
  resetPassword: (
    userId: string
  ) => Promise<ActionResult<{ name: string; temporaryPassword: string }>>;
  unlock: (userId: string) => Promise<ActionResult<null>>;
  archive: (userId: string) => Promise<ActionResult<null>>;
  restore: (userId: string) => Promise<ActionResult<null>>;
}

const ROLE_LABEL = { ADMIN: "Admin", UPDATER: "Updater" } as const;

function status(
  u: AdminUserRow,
  now: number
): { label: string; tone: "outline" | "muted" | "warning" | "navy" } {
  if (u.archivedAt) return { label: "Archived", tone: "muted" };
  if (u.lockedUntil && new Date(u.lockedUntil).getTime() > now)
    return {
      label: `Locked until ${formatDateTime(u.lockedUntil).split(", ")[1]}`,
      tone: "warning",
    };
  if (!u.hasPassword) return { label: "No password (sample user)", tone: "muted" };
  if (u.mustChangePassword) return { label: "Temporary password", tone: "warning" };
  return { label: "Active", tone: "outline" };
}

/** Admin › Users and access: add users, change roles, reset passwords, unlock, archive, restore. */
export function UsersManager({
  users,
  actions,
  now,
}: {
  users: AdminUserRow[];
  actions: UserActions;
  now: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [secret, setSecret] = useState<{ name: string; email?: string; password: string } | null>(
    null
  );
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const nowMs = new Date(now).getTime();

  function run<T>(fn: () => Promise<ActionResult<T>>, onOk: (data: T) => void) {
    setMessage(null);
    start(async () => {
      const r = await fn();
      if (r.ok) {
        onOk(r.data);
        router.refresh();
      } else {
        setMessage({ tone: "error", text: r.message });
        if (r.fieldErrors) setErrors(r.fieldErrors);
      }
    });
  }

  function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErrors({});
    run(
      () =>
        actions.create({
          name: String(fd.get("name") ?? ""),
          email: String(fd.get("email") ?? ""),
          role: String(fd.get("role") ?? ""),
        }),
      (d) => {
        setAdding(false);
        setCopied(false);
        setSecret({ name: d.name, email: d.email, password: d.temporaryPassword });
      }
    );
  }

  return (
    <section aria-labelledby="users-h" className="mt-6 bg-white p-5 sm:p-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 id="users-h" className="text-[24px] font-light">
          Users
        </h2>
        {!adding ? (
          <Button
            onClick={() => {
              setAdding(true);
              setSecret(null);
              setErrors({});
            }}
          >
            Add a user
          </Button>
        ) : null}
      </div>

      {secret ? (
        <div role="status" className="mb-5 border border-navy bg-success-tint p-4 text-[14px]">
          <p className="font-medium">
            Temporary password for {secret.name}
            {secret.email ? ` (${secret.email})` : ""}:
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-3">
            <code className="bg-white px-3 py-1.5 font-mono text-[16px] tracking-wider">
              {secret.password}
            </code>
            <Button
              variant="secondary"
              onClick={() => {
                void navigator.clipboard?.writeText(secret.password).then(() => setCopied(true));
              }}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </p>
          <p className="mt-2">
            Give it to them in person or in a message only they can read. They choose their own
            password when they first sign in. It won&apos;t be shown again.
          </p>
          <Button variant="ghost" className="mt-3" onClick={() => setSecret(null)}>
            Done
          </Button>
        </div>
      ) : null}

      {message ? (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`mb-4 px-4 py-2.5 text-[14px] ${message.tone === "error" ? "bg-warning-tint font-medium" : "bg-success-tint"}`}
        >
          {message.text}
        </p>
      ) : null}

      {adding ? (
        <form
          aria-label="Add a user"
          noValidate
          onSubmit={create}
          className="mb-6 grid grid-cols-1 gap-4 border border-navy bg-cream p-5 md:grid-cols-3"
        >
          <TextField label="Name" name="name" autoComplete="off" error={errors.name} />
          <TextField
            label="Work email"
            name="email"
            type="email"
            autoComplete="off"
            error={errors.email}
          />
          <SelectField label="Role" name="role" defaultValue="UPDATER" error={errors.role}>
            <option value="UPDATER">Updater (PM or Account Director)</option>
            <option value="ADMIN">Admin</option>
          </SelectField>
          <div className="flex flex-wrap gap-3 md:col-span-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add user and make a temporary password"}
            </Button>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <TableScroll label="Users">
        <table className={`${tableClass} min-w-[1100px]`}>
          <caption className="sr-only">Users, their role and status</caption>
          <thead>
            <tr className={theadRow}>
              <th scope="col" className={`${th} pl-0`}>
                Name
              </th>
              <th scope="col" className={th}>
                Email
              </th>
              <th scope="col" className={`${th} w-[170px]`}>
                Role
              </th>
              <th scope="col" className={th}>
                Status
              </th>
              <th scope="col" className={th}>
                Last signed in
              </th>
              <th scope="col" className={th}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const st = status(u, nowMs);
              const locked = !!u.lockedUntil && new Date(u.lockedUntil).getTime() > nowMs;
              return (
                <tr key={u.id} className={`${tbodyRow} ${u.archivedAt ? "text-muted" : ""}`}>
                  <td className={`${td} pl-0`}>
                    {u.name}
                    {u.isSelf ? <span className="text-[12px] text-muted"> (you)</span> : null}
                  </td>
                  <td className={td}>{u.email}</td>
                  <td className={td}>
                    {u.isSelf || u.archivedAt ? (
                      ROLE_LABEL[u.role]
                    ) : (
                      <select
                        aria-label={`Role for ${u.name}`}
                        value={u.role}
                        disabled={pending}
                        onChange={(e) =>
                          run(
                            () => actions.changeRole(u.id, e.target.value),
                            (d) =>
                              setMessage({
                                tone: "ok",
                                text: `${u.name} is now ${ROLE_LABEL[d.role as "ADMIN"]}.`,
                              })
                          )
                        }
                        className="min-h-11 w-full cursor-pointer border border-navy bg-white px-2.5 text-[14px]"
                      >
                        <option value="UPDATER">Updater</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    )}
                  </td>
                  <td className={td}>
                    <Tag tone={st.tone}>{st.label}</Tag>
                  </td>
                  <td className={td}>
                    {u.lastSignInAt ? formatDateTime(u.lastSignInAt) : "Never"}
                  </td>
                  <td className="py-2 pl-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {u.archivedAt ? (
                        <Button
                          variant="secondary"
                          disabled={pending}
                          onClick={() =>
                            run(
                              () => actions.restore(u.id),
                              () => setMessage({ tone: "ok", text: `${u.name} restored.` })
                            )
                          }
                        >
                          Restore
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="secondary"
                            disabled={pending}
                            onClick={() =>
                              run(
                                () => actions.resetPassword(u.id),
                                (d) => {
                                  setCopied(false);
                                  setSecret({ name: d.name, password: d.temporaryPassword });
                                }
                              )
                            }
                          >
                            {u.hasPassword ? "Reset password" : "Set password"}
                          </Button>
                          {locked ? (
                            <Button
                              variant="secondary"
                              disabled={pending}
                              onClick={() =>
                                run(
                                  () => actions.unlock(u.id),
                                  () => setMessage({ tone: "ok", text: `${u.name} unlocked.` })
                                )
                              }
                            >
                              Unlock
                            </Button>
                          ) : null}
                          {!u.isSelf ? (
                            confirmArchive === u.id ? (
                              <>
                                <Button
                                  variant="danger"
                                  disabled={pending}
                                  onClick={() =>
                                    run(
                                      () => actions.archive(u.id),
                                      () => {
                                        setConfirmArchive(null);
                                        setMessage({
                                          tone: "ok",
                                          text: `${u.name} archived. They can no longer sign in.`,
                                        });
                                      }
                                    )
                                  }
                                >
                                  Confirm archive
                                </Button>
                                <Button variant="ghost" onClick={() => setConfirmArchive(null)}>
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="danger"
                                disabled={pending}
                                onClick={() => setConfirmArchive(u.id)}
                              >
                                Archive
                              </Button>
                            )
                          ) : null}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableScroll>
      <p className="mt-4 text-[13px] text-muted">
        Updaters see every client. Archiving stops someone signing in and keeps their history. Every
        change here is recorded in the change history.
      </p>
    </section>
  );
}
