"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import type { Client } from "@/types/domain";
import type { ActionResult } from "@/types/action-result";
import { Button } from "@/components/ui/button";
import { FormError, SelectField, TextField } from "@/components/ui/fields";

export type CheckFile = (
  formData: FormData
) => Promise<
  ActionResult<{ status: "READY_TO_REVIEW" | "REJECTED"; reason?: string; errors: number }>
>;

/**
 * Step 1 of 3: client, extract date (defaults to today, never in the future) and the .xlsx file.
 * "Check file" uploads it; the server checks it and saves the preview (or the rejection).
 */
export function UploadForm({
  clients,
  clientId: initialClient,
  today,
  check,
}: {
  clients: Client[];
  clientId: string;
  today: string;
  check: CheckFile;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [clientId, setClientId] = useState(initialClient);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [fileInfo, setFileInfo] = useState<string>("");

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setErrors({});
    setResult(null);
    start(async () => {
      const r = await check(fd);
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        if (!r.fieldErrors) setResult({ tone: "bad", text: r.message });
        return;
      }
      if (r.data.status === "REJECTED") {
        setResult({
          tone: "bad",
          text: `File rejected. ${r.data.reason ?? ""} It's kept in the history below.`,
        });
      } else {
        setResult({
          tone: "ok",
          text: r.data.errors
            ? `File checked: ${r.data.errors} ${r.data.errors === 1 ? "row has" : "rows have"} errors. See the preview.`
            : "File checked. Review the changes in the preview, then confirm.",
        });
        form.reset();
        setFileInfo("");
      }
      router.refresh();
    });
  }

  return (
    <form noValidate onSubmit={submit} aria-labelledby="new-h" className="grid gap-4.5">
      <SelectField
        label="Client"
        name="clientId"
        value={clientId}
        onChange={(e) => {
          setClientId(e.target.value);
          router.push(`/admin/uploads?client=${e.target.value}`);
        }}
        error={errors.clientId}
      >
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Extract date"
        name="extractDate"
        type="date"
        defaultValue={today}
        max={today}
        hint="The date the spend figures were taken from the source workbook."
        error={errors.extractDate}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="spend-file" className="lbl">
          Spend file (.xlsx)
        </label>
        <div className="flex flex-col items-start gap-2.5 border-2 border-dashed border-navy bg-cream p-5.5">
          <input
            id="spend-file"
            name="file"
            type="file"
            accept=".xlsx"
            aria-invalid={errors.fileName ? true : undefined}
            aria-describedby={errors.fileName ? "spend-file-error" : undefined}
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFileInfo(
                f ? `Selected: ${f.name} · ${Math.max(1, Math.round(f.size / 1024))} KB` : ""
              );
            }}
            className="max-w-full text-[14px]"
          />
          <span className="text-[13px]">{fileInfo || "No file chosen."}</span>
        </div>
        <FormError id="spend-file-error">{errors.fileName}</FormError>
      </div>
      <details className="text-[13px]">
        <summary className="min-h-11 cursor-pointer content-center font-medium">
          Expected file structure
        </summary>
        <p className="mt-2 mb-1">
          Sheet <strong className="font-medium">Project Budget Usage</strong>, header row 1:
        </p>
        <ol className="list-decimal pl-5 leading-relaxed">
          <li>Job Number</li>
          <li>Project Name</li>
          <li>Default Reporting Workstream</li>
          <li>Percentage Spent to Date</li>
        </ol>
        <p className="mt-2">
          Refresh the source workbook before saving: the upload reads the values Excel last
          calculated.
        </p>
      </details>
      <Button type="submit" className="justify-self-start" disabled={pending}>
        {pending ? "Checking…" : "Check file"}
      </Button>
      {result ? (
        <p
          role={result.tone === "bad" ? "alert" : "status"}
          className={`px-4 py-3 text-[14px] ${result.tone === "bad" ? "bg-warning-tint font-medium" : "bg-success-tint"}`}
        >
          {result.text}
        </p>
      ) : null}
    </form>
  );
}
