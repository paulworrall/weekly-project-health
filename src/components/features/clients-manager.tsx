"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import type { ActionResult } from "@/types/action-result";
import { formatDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/fields";
import { TableScroll, Tag, tableClass, tbodyRow, td, th, theadRow } from "./display";

export interface AdminClientRow {
  id: string;
  name: string;
  workstreams: number;
  reported: number;
  projects: number;
  latestUpload: string | null;
  archivedAt: string | null;
}

export interface ClientActions {
  create: (input: { name: string }) => Promise<ActionResult<{ id: string; name: string }>>;
  rename: (clientId: string, input: { name: string }) => Promise<ActionResult<{ name: string }>>;
  archive: (clientId: string) => Promise<ActionResult<null>>;
  restore: (clientId: string) => Promise<ActionResult<null>>;
}

/** Admin › Clients (brief 08): add, rename, archive and restore. Every change is audited. */
export function ClientsManager({
  clients,
  actions,
}: {
  clients: AdminClientRow[];
  actions: ClientActions;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const addRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (adding) addRef.current?.querySelector("input")?.focus();
  }, [adding]);

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
    const name = String(new FormData(e.currentTarget).get("name") ?? "");
    setErrors({});
    run(
      () => actions.create({ name }),
      (d) => {
        setAdding(false);
        setMessage({
          tone: "ok",
          text: `${d.name} added. Its workstreams and projects arrive with its first spend upload.`,
        });
      }
    );
  }

  function rename(e: FormEvent<HTMLFormElement>, c: AdminClientRow) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name") ?? "");
    setErrors({});
    run(
      () => actions.rename(c.id, { name }),
      (d) => {
        setRenaming(null);
        setMessage({ tone: "ok", text: `${c.name} is now called ${d.name}.` });
      }
    );
  }

  return (
    <section aria-labelledby="clients-h" className="mt-6 bg-white p-5 sm:p-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 id="clients-h" className="text-[24px] font-light">
          Clients
        </h2>
        {!adding ? (
          <Button
            onClick={() => {
              setAdding(true);
              setRenaming(null);
              setErrors({});
            }}
          >
            Add a client
          </Button>
        ) : null}
      </div>

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
          ref={addRef}
          aria-label="Add a client"
          noValidate
          onSubmit={create}
          className="mb-6 flex flex-wrap items-end gap-4 border border-navy bg-cream p-5"
        >
          <div className="min-w-[260px] flex-1">
            <TextField
              label="Client name"
              name="name"
              autoComplete="off"
              hint="As it should appear on pages and reports."
              error={errors.name}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add client"}
            </Button>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <TableScroll label="Clients">
        <table className={`${tableClass} min-w-[960px]`}>
          <caption className="sr-only">Clients, their workstreams, projects and status</caption>
          <thead>
            <tr className={theadRow}>
              <th scope="col" className={`${th} pl-0`}>
                Client
              </th>
              <th scope="col" className={`${th} text-right`}>
                Workstreams
              </th>
              <th scope="col" className={`${th} text-right`}>
                Reported
              </th>
              <th scope="col" className={`${th} text-right`}>
                Projects
              </th>
              <th scope="col" className={th}>
                Latest upload
              </th>
              <th scope="col" className={th}>
                Status
              </th>
              <th scope="col" className={th}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className={`${tbodyRow} ${c.archivedAt ? "text-muted" : ""}`}>
                <td className={`${td} pl-0`}>
                  {renaming === c.id ? (
                    <form
                      aria-label={`Rename ${c.name}`}
                      noValidate
                      onSubmit={(e) => rename(e, c)}
                      className="flex flex-wrap items-end gap-2"
                    >
                      <div className="min-w-[220px]">
                        <TextField
                          label="New name"
                          name="name"
                          defaultValue={c.name}
                          autoComplete="off"
                          autoFocus
                          error={errors.name}
                        />
                      </div>
                      <Button type="submit" disabled={pending}>
                        Save
                      </Button>
                      <Button variant="ghost" onClick={() => setRenaming(null)}>
                        Cancel
                      </Button>
                    </form>
                  ) : c.archivedAt ? (
                    c.name
                  ) : (
                    <Link href={`/clients/${c.id}`}>{c.name}</Link>
                  )}
                </td>
                <td className={`${td} text-right`}>{c.workstreams}</td>
                <td className={`${td} text-right`}>{c.reported}</td>
                <td className={`${td} text-right`}>{c.projects}</td>
                <td className={td}>{c.latestUpload ? formatDate(c.latestUpload) : "None yet"}</td>
                <td className={td}>
                  {c.archivedAt ? (
                    <Tag tone="muted">Archived {formatDate(c.archivedAt.slice(0, 10))}</Tag>
                  ) : (
                    <Tag tone="success">Active</Tag>
                  )}
                </td>
                <td className="py-2 pl-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {c.archivedAt ? (
                      <Button
                        variant="secondary"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () => actions.restore(c.id),
                            () => setMessage({ tone: "ok", text: `${c.name} restored.` })
                          )
                        }
                      >
                        Restore
                      </Button>
                    ) : renaming === c.id ? null : confirmArchive === c.id ? (
                      <>
                        <Button
                          variant="danger"
                          disabled={pending}
                          onClick={() =>
                            run(
                              () => actions.archive(c.id),
                              () => {
                                setConfirmArchive(null);
                                setMessage({
                                  tone: "ok",
                                  text: `${c.name} archived. It is hidden everywhere; restore it to bring it back.`,
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
                      <>
                        <Button
                          variant="secondary"
                          disabled={pending}
                          onClick={() => {
                            setRenaming(c.id);
                            setAdding(false);
                            setErrors({});
                          }}
                        >
                          Rename
                        </Button>
                        <Button
                          variant="danger"
                          disabled={pending}
                          onClick={() => setConfirmArchive(c.id)}
                        >
                          Archive
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
      <p className="mt-4 text-[13px] text-muted">
        Add a client before its first spend upload. Archiving hides a client from every list, page,
        upload and report, and keeps all of its data; nothing is deleted. Every change here is
        recorded in the change history.
      </p>
    </section>
  );
}
