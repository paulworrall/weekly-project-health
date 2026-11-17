import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { TableScroll, tableClass, tbodyRow, td, th, theadRow } from "./display";

/** Read-only admin table in the house style (Users, Clients, Change history). Actions arrive in later briefs. */
export function SimpleTablePage({
  eyebrow,
  title,
  intro,
  columns,
  rows,
  note,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  columns: { label: string; align?: "right" }[];
  rows: { key: string; cells: ReactNode[] }[];
  note?: string;
}) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} meta={intro} internal />
      <section className="mt-6 bg-white p-5 sm:p-7">
        <TableScroll label={title}>
          <table className={`${tableClass} min-w-[760px]`}>
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className={theadRow}>
                {columns.map((c, i) => (
                  <th
                    key={c.label}
                    scope="col"
                    className={`${th} ${i === 0 ? "pl-0" : ""} ${c.align === "right" ? "text-right" : ""}`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className={tbodyRow}>
                  {r.cells.map((cell, i) => (
                    <td
                      key={i}
                      className={`${td} ${i === 0 ? "pl-0" : ""} ${columns[i]?.align === "right" ? "text-right" : ""}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
        {note ? <p className="mt-4 text-[13px] text-muted">{note}</p> : null}
      </section>
    </>
  );
}
