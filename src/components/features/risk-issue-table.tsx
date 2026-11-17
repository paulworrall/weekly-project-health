"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/types/action-result";
import type { IsoDate, LogItem, LogKind, LogLevel, LogStatus } from "@/types/domain";
import { LOG_STATUSES } from "@/types/domain";
import { fieldErrors, issueSchema, riskSchema } from "@/types/schemas";
import { ageInDays, ageText, isOverdue, overdueText } from "@/lib/ageing";
import { addDays, formatDate } from "@/lib/dates";
import {
  LEVEL_LABEL,
  LOG_STATUS_LABEL,
  actionHeading,
  levelHeading,
  levelsFor,
} from "@/lib/labels";
import { sortLog } from "@/lib/sorting";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icons";
import { LevelTag, LogStatusPill, TableScroll, tableClass, td, th, theadRow } from "./display";

type Draft = {
  title: string;
  level: LogLevel;
  owner: string;
  status: LogStatus;
  dueOn: string;
  action: string;
};

const input = "min-h-10 w-full border border-navy bg-white px-2.5 text-[14px]";

export interface LogActions {
  create: (values: Draft) => Promise<ActionResult<LogItem>>;
  update: (id: string, values: Draft, version: string | null) => Promise<ActionResult<LogItem>>;
  archive: (id: string, version: string | null) => Promise<ActionResult<null>>;
}

/**
 * Risks or issues on the project page: inline add, edit (including the due date) and delete,
 * which archives. With `actions` every change is saved on the server (brief 05), which assigns the
 * next per-client ref; without, changes stay in the page (tests).
 */
export function RiskIssueTable({
  kind,
  initial,
  projectId,
  clientId,
  nextSeq,
  today,
  readOnly,
  defaultOwner,
  actions,
}: {
  kind: LogKind;
  initial: LogItem[];
  projectId: string;
  clientId: string;
  nextSeq: number;
  today: IsoDate;
  readOnly: boolean;
  defaultOwner: string;
  actions?: LogActions;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [problem, setProblem] = useState<{ text: string; conflict: boolean } | null>(null);
  const [items, setItems] = useState(initial);
  const [seq, setSeq] = useState(nextSeq);
  const [editing, setEditing] = useState<{ id: string; isNew: boolean } | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [archived, setArchived] = useState(0);
  const [message, setMessage] = useState("");

  const single = kind === "RISK" ? "Risk" : "Issue";
  const title = kind === "RISK" ? "Risks" : "Issues";
  const levels = levelsFor(kind) as readonly LogLevel[];
  const schema = kind === "RISK" ? riskSchema : issueSchema;
  const visible = sortLog(items.filter((i) => !i.archivedAt));
  const active = visible.filter((i) => i.status !== "CLOSED");
  const overdue = active.filter((i) => isOverdue(i, today)).length;
  const byLevel = levels
    .map((l) => `${active.filter((i) => i.level === l).length} ${LEVEL_LABEL[l]}`)
    .join(" · ");

  function edit(item: LogItem) {
    setErrors({});
    setEditing({ id: item.id, isNew: false });
    setDraft({
      title: item.title,
      level: item.level,
      owner: item.owner,
      status: item.status,
      dueOn: item.dueOn ?? "",
      action: item.action,
    });
  }

  function add() {
    if (editing) return;
    // With actions the server assigns the ref on save; until then the row shows "New".
    const ref = actions ? "New" : `${kind === "RISK" ? "R" : "I"}-${String(seq).padStart(3, "0")}`;
    const id = `new-${seq}`;
    const level = levels[levels.length - 2];
    const blank: LogItem = {
      id,
      kind,
      ref,
      clientId,
      projectId,
      title: "",
      level,
      owner: defaultOwner,
      status: "OPEN",
      raisedOn: today,
      dueOn: addDays(today, 10),
      action: "",
      closedOn: null,
      archivedAt: null,
    };
    setSeq((s) => s + 1);
    setItems((xs) => [blank, ...xs]);
    setErrors({});
    setEditing({ id, isNew: true });
    setDraft({
      title: "",
      level,
      owner: defaultOwner,
      status: "OPEN",
      dueOn: blank.dueOn ?? "",
      action: "",
    });
  }

  function cancel() {
    if (editing?.isNew) setItems((xs) => xs.filter((x) => x.id !== editing.id));
    setEditing(null);
    setDraft(null);
    setErrors({});
  }

  function save() {
    if (!draft || !editing) return;
    const parsed = schema.safeParse(draft);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    const d = parsed.data;
    if (actions) {
      const target = editing;
      const current = items.find((x) => x.id === target.id);
      const values: Draft = { ...d, dueOn: d.dueOn ?? "" };
      setProblem(null);
      start(async () => {
        const r = target.isNew
          ? await actions.create(values)
          : await actions.update(target.id, values, current?.updatedAt ?? null);
        if (r.ok) {
          setItems((xs) => xs.map((x) => (x.id === target.id ? r.data : x)));
          setMessage(`${r.data.ref} ${target.isNew ? "added" : "saved"}.`);
          setEditing(null);
          setDraft(null);
        } else {
          if (r.fieldErrors) setErrors(r.fieldErrors);
          setProblem({ text: r.message, conflict: r.code === "CONFLICT" });
        }
      });
      return;
    }
    setItems((xs) =>
      xs.map((x) =>
        x.id === editing.id
          ? {
              ...x,
              ...d,
              dueOn: d.dueOn || null,
              closedOn: d.status === "CLOSED" ? (x.closedOn ?? today) : null,
            }
          : x
      )
    );
    const ref = items.find((x) => x.id === editing.id)?.ref;
    setMessage(`${ref} ${editing.isNew ? "added" : "saved"}.`);
    setEditing(null);
    setDraft(null);
  }

  function remove(item: LogItem) {
    if (actions) {
      setProblem(null);
      start(async () => {
        const r = await actions.archive(item.id, item.updatedAt ?? null);
        if (r.ok) {
          setItems((xs) =>
            xs.map((x) => (x.id === item.id ? { ...x, archivedAt: new Date().toISOString() } : x))
          );
          setArchived((n) => n + 1);
          setMessage(`${item.ref} deleted. It is archived and kept in the history.`);
        } else setProblem({ text: r.message, conflict: r.code === "CONFLICT" });
      });
      return;
    }
    setItems((xs) =>
      xs.map((x) => (x.id === item.id ? { ...x, archivedAt: new Date().toISOString() } : x))
    );
    setArchived((n) => n + 1);
    setMessage(`${item.ref} deleted. It is archived and kept in the history.`);
  }

  const set = (k: keyof Draft) => (e: { target: { value: string } }) =>
    setDraft((d) => (d ? { ...d, [k]: e.target.value } : d));

  return (
    <section aria-labelledby={`${kind}-h`} className="mb-6 bg-white p-5 sm:p-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id={`${kind}-h`} className="text-[24px] font-light">
            {title}
          </h2>
          <p className="mt-1.5 text-[14px]">
            {active.length} open or on pause · {byLevel} · {overdue} overdue
          </p>
        </div>
        {!readOnly ? (
          <Button onClick={add} disabled={!!editing || pending}>
            <PlusIcon /> Add {single.toLowerCase()}
          </Button>
        ) : null}
      </div>
      <p role="status" className="sr-only">
        {message}
      </p>
      {problem ? (
        <div role="alert" className="mb-4 bg-warning-tint px-4 py-3 text-[14px]">
          <p className="font-medium">{problem.text}</p>
          {problem.conflict ? (
            <Button variant="secondary" className="mt-2" onClick={() => router.refresh()}>
              Reload the latest
            </Button>
          ) : null}
        </div>
      ) : null}
      <TableScroll label={title}>
        <table className={`${tableClass} min-w-[1240px]`}>
          <caption className="sr-only">{title} on this project</caption>
          <thead>
            <tr className={theadRow}>
              <th scope="col" className={`${th} w-[72px] pl-0`}>
                ID
              </th>
              <th scope="col" className={th}>
                {single}
              </th>
              <th scope="col" className={`${th} w-[130px]`}>
                {levelHeading(kind)}
              </th>
              <th scope="col" className={`${th} w-[150px]`}>
                Owner
              </th>
              <th scope="col" className={`${th} w-[130px]`}>
                Status
              </th>
              <th scope="col" className={`${th} w-[110px]`}>
                Raised
              </th>
              <th scope="col" className={`${th} w-[160px]`}>
                Due
              </th>
              <th scope="col" className={th}>
                {actionHeading(kind)}
              </th>
              {!readOnly ? (
                <th scope="col" className={`${th} w-[170px]`}>
                  <span className="sr-only">Actions</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {visible.map((it) => {
              const ed = editing?.id === it.id && draft;
              const age = ageInDays(it.raisedOn, today);
              return (
                <tr
                  key={it.id}
                  className={`border-b border-line align-top ${ed ? "bg-tint" : ""} ${it.status === "CLOSED" && !ed ? "text-muted" : ""}`}
                >
                  <td className={`${td} pl-0 font-medium`}>{it.ref}</td>
                  <td className={td}>
                    {ed ? (
                      <>
                        <input
                          aria-label={`${single} title`}
                          value={draft.title}
                          onChange={set("title")}
                          className={input}
                          aria-invalid={errors.title ? true : undefined}
                        />
                        {errors.title ? (
                          <p role="alert" className="mt-1 text-[13px] font-medium text-overspend">
                            {errors.title}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      it.title
                    )}
                  </td>
                  <td className={td}>
                    {ed ? (
                      <select
                        aria-label={levelHeading(kind)}
                        value={draft.level}
                        onChange={set("level")}
                        className={input}
                      >
                        {levels.map((l) => (
                          <option key={l} value={l}>
                            {LEVEL_LABEL[l]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <LevelTag level={it.level} />
                    )}
                  </td>
                  <td className={td}>
                    {ed ? (
                      <>
                        <input
                          aria-label="Owner"
                          value={draft.owner}
                          onChange={set("owner")}
                          className={input}
                          aria-invalid={errors.owner ? true : undefined}
                        />
                        {errors.owner ? (
                          <p role="alert" className="mt-1 text-[13px] font-medium text-overspend">
                            {errors.owner}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      it.owner
                    )}
                  </td>
                  <td className={td}>
                    {ed ? (
                      <select
                        aria-label="Status"
                        value={draft.status}
                        onChange={set("status")}
                        className={input}
                      >
                        {LOG_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {LOG_STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <LogStatusPill status={it.status} />
                    )}
                  </td>
                  <td className={td}>
                    <div>{formatDate(it.raisedOn)}</div>
                    <div className="text-[12px] text-muted">
                      {it.status === "CLOSED" && it.closedOn
                        ? `Closed ${formatDate(it.closedOn)}`
                        : age === 0
                          ? "Today"
                          : `${ageText(age)} open`}
                    </div>
                  </td>
                  <td className={td}>
                    {ed ? (
                      <input
                        type="date"
                        aria-label="Due date"
                        value={draft.dueOn}
                        onChange={set("dueOn")}
                        className={input}
                      />
                    ) : (
                      <>
                        <div>{it.dueOn ? formatDate(it.dueOn) : "No due date"}</div>
                        {isOverdue(it, today) ? (
                          <span className="mt-1 inline-block bg-warning-tint px-2 py-0.5 text-[12px] font-medium">
                            {overdueText(it, today)}
                          </span>
                        ) : null}
                      </>
                    )}
                  </td>
                  <td className={td}>
                    {ed ? (
                      <textarea
                        aria-label={actionHeading(kind)}
                        rows={2}
                        value={draft.action}
                        onChange={set("action")}
                        className={`${input} resize-y py-2`}
                      />
                    ) : (
                      it.action
                    )}
                  </td>
                  {!readOnly ? (
                    <td className="py-2 pl-2.5 whitespace-nowrap">
                      {ed ? (
                        <div className="flex gap-1.5">
                          <Button onClick={save} disabled={pending}>
                            {pending ? "Saving…" : "Save"}
                          </Button>
                          <Button variant="secondary" onClick={cancel}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <Button
                            variant="secondary"
                            onClick={() => edit(it)}
                            aria-label={`Edit ${it.ref}`}
                            disabled={!!editing || pending}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => remove(it)}
                            aria-label={`Delete ${it.ref} (archived and kept in the history)`}
                            disabled={!!editing || pending}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableScroll>
      {!visible.length ? (
        <p className="py-4 text-[14px]">No {title.toLowerCase()} logged.</p>
      ) : null}
      <p className="mt-3.5 text-[13px] text-muted">
        Counts include open and on-pause items only. Close an item when it is resolved; Delete
        archives it and keeps it in the history.
        {archived ? ` ${archived} archived this session.` : ""}
      </p>
    </section>
  );
}
