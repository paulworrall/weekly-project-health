"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent } from "react";
import type { ActionResult } from "@/types/action-result";
import type { Likelihood, PipelineOpportunity } from "@/types/domain";
import { LIKELIHOODS } from "@/types/domain";
import { fieldErrors, pipelineSchema } from "@/types/schemas";
import { formatDate } from "@/lib/dates";
import { LIKELIHOOD_LABEL } from "@/lib/labels";
import { sortPipeline } from "@/lib/sorting";
import { Button, IconButton } from "@/components/ui/button";
import { SelectField, TextField, TextareaField } from "@/components/ui/fields";
import { ArchiveIcon, PencilIcon, PlusIcon } from "@/components/ui/icons";
import { TableScroll, tableClass, tbodyRow, td, th, theadRow } from "./display";

const LIKELIHOOD_STYLE: Record<Likelihood, string> = {
  HIGH: "bg-navy text-cream",
  MEDIUM: "bg-rag-amber text-navy",
  LOW: "border border-navy bg-white text-navy",
};

export function LikelihoodTag({ likelihood }: { likelihood: Likelihood }) {
  return (
    <span
      className={`inline-flex h-7.5 w-22 items-center justify-center text-[12px] font-medium tracking-[0.08em] uppercase ${LIKELIHOOD_STYLE[likelihood]}`}
    >
      {LIKELIHOOD_LABEL[likelihood]}
    </span>
  );
}

type Draft = {
  likelihood: Likelihood;
  title: string;
  possibleStart: string;
  mapOwner: string;
  clientOwner: string;
  nextSteps: string;
};

const EMPTY: Draft = {
  likelihood: "MEDIUM",
  title: "",
  possibleStart: "",
  mapOwner: "",
  clientOwner: "",
  nextSteps: "",
};

/**
 * Workstream pipeline: add, edit and archive in local state (brief 01). Any Updater or Admin can
 * edit; archiving replaces deleting (decision log: "Workstream pipeline").
 */
export interface PipelineActions {
  save: (
    id: string | null,
    values: Draft,
    version: string | null
  ) => Promise<ActionResult<PipelineOpportunity>>;
  archive: (id: string, version: string | null) => Promise<ActionResult<null>>;
}

export function PipelineSection({
  workstreamId,
  workstreamName,
  initial,
  readOnly,
  today,
  actions,
}: {
  workstreamId: string;
  workstreamName: string;
  initial: PipelineOpportunity[];
  readOnly: boolean;
  today: string;
  /** Saves on the server (brief 05); without, changes stay in the page (tests). */
  actions?: PipelineActions;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [problem, setProblem] = useState<{ text: string; conflict: boolean } | null>(null);
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const formId = useId();

  const shown = sortPipeline(items.filter((o) => !o.archivedAt));
  const count = (l: Likelihood) => shown.filter((o) => o.likelihood === l).length;

  function startEdit(o: PipelineOpportunity | null) {
    setErrors({});
    setMessage("");
    if (o) {
      setEditing(o.id);
      setDraft({
        likelihood: o.likelihood,
        title: o.title,
        possibleStart: o.possibleStart ?? "",
        mapOwner: o.mapOwner,
        clientOwner: o.clientOwner,
        nextSteps: o.nextSteps,
      });
    } else {
      setEditing("new");
      setDraft(EMPTY);
    }
  }

  function save(e: FormEvent) {
    e.preventDefault();
    const parsed = pipelineSchema.safeParse(draft);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    const values = { ...parsed.data, possibleStart: parsed.data.possibleStart || null };
    if (actions) {
      const target = editing;
      const current = items.find((x) => x.id === target);
      setProblem(null);
      start(async () => {
        const r = await actions.save(
          target === "new" ? null : target,
          { ...parsed.data, possibleStart: parsed.data.possibleStart ?? "" },
          current?.updatedAt ?? null
        );
        if (r.ok) {
          setItems((xs) =>
            target === "new" ? [...xs, r.data] : xs.map((x) => (x.id === target ? r.data : x))
          );
          setMessage(`${target === "new" ? "Added" : "Saved"}: ${r.data.title}`);
          setEditing(null);
        } else {
          if (r.fieldErrors) setErrors(r.fieldErrors);
          setProblem({ text: r.message, conflict: r.code === "CONFLICT" });
        }
      });
      return;
    }
    if (editing === "new") {
      setItems((xs) => [
        ...xs,
        {
          id: `opp-new-${Date.now()}`,
          workstreamId,
          createdOn: today,
          archivedAt: null,
          ...values,
        },
      ]);
      setMessage(`Added: ${values.title}`);
    } else {
      setItems((xs) => xs.map((x) => (x.id === editing ? { ...x, ...values } : x)));
      setMessage(`Saved: ${values.title}`);
    }
    setEditing(null);
  }

  function archive(o: PipelineOpportunity) {
    if (actions) {
      setProblem(null);
      start(async () => {
        const r = await actions.archive(o.id, o.updatedAt ?? null);
        if (r.ok) {
          setItems((xs) =>
            xs.map((x) => (x.id === o.id ? { ...x, archivedAt: new Date().toISOString() } : x))
          );
          setMessage(`Archived: ${o.title}. It is kept in the history.`);
        } else setProblem({ text: r.message, conflict: r.code === "CONFLICT" });
      });
      return;
    }
    setItems((xs) =>
      xs.map((x) => (x.id === o.id ? { ...x, archivedAt: new Date().toISOString() } : x))
    );
    setMessage(`Archived: ${o.title}. It is kept in the history.`);
  }

  const set = (k: keyof Draft) => (e: { target: { value: string } }) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));

  return (
    <section aria-labelledby="pipeline-h" className="mb-9 bg-white px-5 pt-7 pb-5 sm:px-7">
      <h2 id="pipeline-h" className="text-[26px] font-light">
        Pipeline
      </h2>
      <p className="mt-2 text-[14px] text-muted">
        Opportunities in discussion with the client for this workstream. Any Updater can add, edit
        and archive them.
      </p>
      <div className="my-4.5 flex flex-wrap items-center gap-4">
        <span className="text-[14px]">
          {shown.length} {shown.length === 1 ? "opportunity" : "opportunities"} · {count("HIGH")}{" "}
          High · {count("MEDIUM")} Medium · {count("LOW")} Low
        </span>
        {!readOnly && editing === null ? (
          <Button onClick={() => startEdit(null)}>
            <PlusIcon /> Add opportunity
          </Button>
        ) : null}
      </div>
      <p role="status" className="sr-only">
        {message}
      </p>
      {message ? <p className="mb-3 bg-success-tint px-4 py-2.5 text-[14px]">{message}</p> : null}
      {problem ? (
        <div role="alert" className="mb-3 bg-warning-tint px-4 py-3 text-[14px]">
          <p className="font-medium">{problem.text}</p>
          {problem.conflict ? (
            <Button variant="secondary" className="mt-2" onClick={() => router.refresh()}>
              Reload the latest
            </Button>
          ) : null}
        </div>
      ) : null}

      {editing !== null ? (
        <form
          id={formId}
          aria-label={editing === "new" ? "Add opportunity" : "Edit opportunity"}
          noValidate
          onSubmit={save}
          className="mb-5 grid grid-cols-1 gap-4 border border-navy bg-cream p-5 md:grid-cols-3"
        >
          <SelectField
            label="Likelihood"
            value={draft.likelihood}
            onChange={set("likelihood")}
            error={errors.likelihood}
          >
            {LIKELIHOODS.map((l) => (
              <option key={l} value={l}>
                {LIKELIHOOD_LABEL[l]}
              </option>
            ))}
          </SelectField>
          <div className="md:col-span-2">
            <TextField
              label="Opportunity"
              value={draft.title}
              onChange={set("title")}
              error={errors.title}
            />
          </div>
          <TextField
            label="Possible start"
            type="date"
            value={draft.possibleStart}
            onChange={set("possibleStart")}
            error={errors.possibleStart}
          />
          <TextField
            label="MAP owner"
            value={draft.mapOwner}
            onChange={set("mapOwner")}
            error={errors.mapOwner}
          />
          <TextField
            label="Client owner"
            value={draft.clientOwner}
            onChange={set("clientOwner")}
            error={errors.clientOwner}
          />
          <div className="md:col-span-3">
            <TextareaField
              label="Next steps"
              rows={2}
              value={draft.nextSteps}
              onChange={set("nextSteps")}
              error={errors.nextSteps}
            />
          </div>
          <div className="flex flex-wrap gap-3 md:col-span-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : editing === "new" ? "Add opportunity" : "Save changes"}
            </Button>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {shown.length ? (
        <TableScroll label={`Pipeline for ${workstreamName}`}>
          <table className={`${tableClass} min-w-[1000px]`}>
            <caption className="sr-only">Pipeline opportunities for {workstreamName}</caption>
            <thead>
              <tr className={theadRow}>
                <th scope="col" className={`${th} w-[130px] pl-0`}>
                  Likelihood
                </th>
                <th scope="col" className={th}>
                  Opportunity
                </th>
                <th scope="col" className={`${th} w-[120px]`}>
                  Possible start
                </th>
                <th scope="col" className={`${th} w-[150px]`}>
                  MAP owner
                </th>
                <th scope="col" className={`${th} w-[160px]`}>
                  Client owner
                </th>
                <th scope="col" className={th}>
                  Next steps
                </th>
                {!readOnly ? (
                  <th scope="col" className={`${th} w-[100px]`}>
                    <span className="sr-only">Actions</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {shown.map((o) => (
                <tr key={o.id} className={tbodyRow}>
                  <td className={`${td} pl-0`}>
                    <LikelihoodTag likelihood={o.likelihood} />
                  </td>
                  <td className={`${td} max-w-[300px]`}>{o.title}</td>
                  <td className={`${td} whitespace-nowrap`}>
                    {o.possibleStart ? formatDate(o.possibleStart) : "Not set"}
                  </td>
                  <td className={td}>{o.mapOwner}</td>
                  <td className={td}>{o.clientOwner || "—"}</td>
                  <td className={`${td} max-w-[300px]`}>{o.nextSteps}</td>
                  {!readOnly ? (
                    <td className="py-1.5 pl-2.5 whitespace-nowrap">
                      <IconButton
                        label={`Edit opportunity: ${o.title}`}
                        onClick={() => startEdit(o)}
                        className="border-0 bg-transparent"
                      >
                        <PencilIcon size={18} />
                      </IconButton>
                      <IconButton
                        label={`Archive opportunity: ${o.title}`}
                        onClick={() => archive(o)}
                        className="border-0 bg-transparent"
                      >
                        <ArchiveIcon size={18} />
                      </IconButton>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      ) : (
        <p className="py-5 text-[14px]">No open opportunities. Add one to start the pipeline.</p>
      )}
      <p className="mt-4 text-[13px] text-muted">
        Sorted by likelihood, then soonest start. Removed opportunities are archived and kept in the
        history.
      </p>
    </section>
  );
}
