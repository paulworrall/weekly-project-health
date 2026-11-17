"use client";

import { useState, type FormEvent } from "react";
import type { Client } from "@/types/domain";
import { fieldErrors, uploadFormSchema } from "@/types/schemas";
import { Button } from "@/components/ui/button";
import { FormError, SelectField, TextField } from "@/components/ui/fields";

/** Step 1 of 3: client, extract date (defaults to today) and the .xlsx file. Parsing arrives in brief 04. */
export function UploadForm({ clients, today }: { clients: Client[]; today: string }) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [extractDate, setExtractDate] = useState(today);
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);

  function check(e: FormEvent) {
    e.preventDefault();
    const parsed = uploadFormSchema.safeParse({
      clientId,
      extractDate,
      fileName: file?.name ?? "",
    });
    setChecked(false);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setChecked(true);
  }

  return (
    <form noValidate onSubmit={check} aria-labelledby="new-h" className="grid gap-4.5">
      <SelectField
        label="Client"
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
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
        type="date"
        value={extractDate}
        onChange={(e) => setExtractDate(e.target.value)}
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
            type="file"
            accept=".xlsx"
            aria-invalid={errors.fileName ? true : undefined}
            aria-describedby={errors.fileName ? "spend-file-error" : undefined}
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFile(f ? { name: f.name, size: f.size } : null);
              setChecked(false);
            }}
            className="max-w-full text-[14px]"
          />
          <span className="text-[13px]">
            {file
              ? `Selected: ${file.name} · ${Math.max(1, Math.round(file.size / 1024))} KB`
              : "No file chosen."}
          </span>
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
      <Button type="submit" className="justify-self-start">
        Check file
      </Button>
      <p role="status" className={checked ? "bg-line-soft px-4 py-3 text-[14px]" : "sr-only"}>
        {checked
          ? "Reading the file arrives in a later phase. The preview shows a sample file that has already been checked."
          : ""}
      </p>
    </form>
  );
}
