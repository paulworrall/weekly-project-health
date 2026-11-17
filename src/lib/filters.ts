/** List filters, kept pure so they are tested without rendering. */
import type { LogLevel, LogStatus, Rag } from "@/types/domain";
import type { LogRow, ProjectRow } from "@/types/views";
import { ageBand, ageInDays, isOverdue, type AgeBand } from "./ageing";
import { isOverBudget } from "./spend";

export interface ProjectFilters {
  q: string;
  show: "IN" | "OUT" | "ALL";
  submitter: string;
  rag: Rag | "";
  thisWeek: "" | "SUBMITTED" | "NOT_SUBMITTED";
  spend: "" | "OVER" | "NO_BUDGET" | "NO_TIMESHEET";
}

export const EMPTY_PROJECT_FILTERS: ProjectFilters = {
  q: "",
  show: "ALL",
  submitter: "",
  rag: "",
  thisWeek: "",
  spend: "",
};

export function filterProjects(rows: readonly ProjectRow[], f: ProjectFilters): ProjectRow[] {
  const q = f.q.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.show === "IN" && !r.included) return false;
    if (f.show === "OUT" && r.included) return false;
    if (q && !`${r.jobNumber} ${r.name} ${r.lastSubmittedBy ?? ""}`.toLowerCase().includes(q))
      return false;
    if (f.submitter && r.lastSubmittedBy !== f.submitter) return false;
    if (f.rag && !(r.included && r.rag === f.rag)) return false;
    if (f.thisWeek === "SUBMITTED" && !(r.included && r.submittedThisWeek)) return false;
    if (f.thisWeek === "NOT_SUBMITTED" && !(r.included && !r.submittedThisWeek)) return false;
    if (f.spend === "OVER" && !isOverBudget(r.spend)) return false;
    if (f.spend === "NO_BUDGET" && r.spend.spendStatus !== "NO_BUDGET") return false;
    if (f.spend === "NO_TIMESHEET" && r.spend.spendStatus !== "NO_TIMESHEET") return false;
    return true;
  });
}

export interface LogFilters {
  q: string;
  level: LogLevel | "";
  /** "ACTIVE" = Open and On pause. */
  status: "ACTIVE" | LogStatus | "ALL";
  age: "" | AgeBand | "OVERDUE";
}

export const EMPTY_LOG_FILTERS: LogFilters = { q: "", level: "", status: "ACTIVE", age: "" };

export function filterLog(items: readonly LogRow[], f: LogFilters, today: string): LogRow[] {
  const q = f.q.trim().toLowerCase();
  return items.filter((i) => {
    if (f.status === "ACTIVE" && i.status === "CLOSED") return false;
    if (f.status !== "ACTIVE" && f.status !== "ALL" && i.status !== f.status) return false;
    if (f.level && i.level !== f.level) return false;
    if (f.age === "OVERDUE" && !isOverdue(i, today)) return false;
    if (f.age && f.age !== "OVERDUE" && ageBand(ageInDays(i.raisedOn, today)) !== f.age)
      return false;
    if (
      q &&
      !`${i.ref} ${i.title} ${i.projectJob} ${i.projectName} ${i.owner}`.toLowerCase().includes(q)
    )
      return false;
    return true;
  });
}
