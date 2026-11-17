/**
 * Domain types, mirroring the target data model (CLAUDE.md §8). Brief 01 fills them from
 * synthetic mocks (src/mocks/); brief 02 fills them from Prisma. Dates are ISO strings:
 * "2026-11-16" for calendar dates, full ISO for timestamps (UTC).
 */
import type { Rag } from "@/lib/rag";

export type { Rag };

export type Role = "ADMIN" | "UPDATER";

/** ISO date, e.g. "2026-11-16". */
export type IsoDate = string;
/** ISO timestamp in UTC, e.g. "2026-11-16T09:12:00.000Z". */
export type IsoDateTime = string;
/** Reporting week key, e.g. "2026-W47" (also the `?week=` value). */
export type WeekKey = string;

export const PROJECT_STATUSES = ["IN_PROGRESS", "ON_HOLD", "COMPLETE"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type UpdateState = "DRAFT" | "SUBMITTED";

export const RISK_SEVERITIES = ["HIGH", "MEDIUM", "LOW"] as const;
export type RiskSeverity = (typeof RISK_SEVERITIES)[number];

export const ISSUE_PRIORITIES = ["BLOCKER", "HIGH", "MEDIUM", "LOW"] as const;
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];

export type LogKind = "RISK" | "ISSUE";
export type LogLevel = RiskSeverity | IssuePriority;

export const LOG_STATUSES = ["OPEN", "ON_PAUSE", "CLOSED"] as const;
export type LogStatus = (typeof LOG_STATUSES)[number];

export const LIKELIHOODS = ["HIGH", "MEDIUM", "LOW"] as const;
export type Likelihood = (typeof LIKELIHOODS)[number];

export type SpendStatus = "VALUE" | "NO_BUDGET" | "NO_TIMESHEET";

/** Reporting Hub lifecycle; the UI words are Confirmed / Rejected / Cancelled. */
export type UploadStatus =
  "CHECKING" | "REJECTED" | "READY_TO_REVIEW" | "CANCELLED" | "LIVE" | "REPLACED";

export type ChangeType = "NEW" | "CHANGED" | "MOVED" | "MISSING";
export type MissingDecision = "KEEP" | "MARK";

export interface User {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: Role;
  lastSignInAt: IsoDateTime | null;
  archivedAt: IsoDateTime | null;
}

export interface Client {
  id: string;
  name: string;
  archivedAt: IsoDateTime | null;
}

export interface Workstream {
  id: string;
  clientId: string;
  /** As in the spend file. */
  name: string;
  reported: boolean;
  /** Free text, set by the Admin (decision 17 Nov). */
  accountDirector: string | null;
  firstSeen: IsoDate;
}

/** % spend from a confirmed upload. `percentSpent` is a fraction (0.25 = 25%), null unless VALUE. */
export interface Spend {
  percentSpent: number | null;
  spendStatus: SpendStatus;
}

export interface Project {
  id: string;
  clientId: string;
  workstreamId: string;
  /** 6 digits, stored as text. */
  jobNumber: string;
  name: string;
  includeInReport: boolean;
  missingFromFileSince: IsoDate | null;
  markedNoLongerInFileAt: IsoDateTime | null;
}

/** One project's inputs for one reporting week. */
export interface ProjectWeek {
  projectId: string;
  week: WeekKey;
  status: ProjectStatus;
  rag: Rag;
  /** 0–100 in steps of 10. */
  percentComplete: number;
  updateText: string;
  state: UpdateState;
  /** Set when state is SUBMITTED (latest submission). */
  submittedAt: IsoDateTime | null;
  submittedById: string | null;
  /** Closed weeks only: no submission by close, values carried forward. */
  notUpdated?: boolean;
  /** When this record was last saved (for "changed since you opened it" checks). */
  updatedAt?: IsoDateTime;
}

export interface LogItem {
  id: string;
  kind: LogKind;
  /** "R-001" / "I-001", per client. */
  ref: string;
  clientId: string;
  projectId: string;
  title: string;
  level: LogLevel;
  /** Free text (decision 16 Nov, confirmed). */
  owner: string;
  status: LogStatus;
  raisedOn: IsoDate;
  dueOn: IsoDate | null;
  /** Mitigation (risk) or next step (issue). */
  action: string;
  closedOn: IsoDate | null;
  archivedAt: IsoDateTime | null;
  /** When this record was last saved (for "changed since you opened it" checks). */
  updatedAt?: IsoDateTime;
}

export interface PipelineOpportunity {
  id: string;
  workstreamId: string;
  likelihood: Likelihood;
  title: string;
  possibleStart: IsoDate | null;
  mapOwner: string;
  clientOwner: string;
  nextSteps: string;
  createdOn: IsoDate;
  archivedAt: IsoDateTime | null;
  /** When this record was last saved (for "changed since you opened it" checks). */
  updatedAt?: IsoDateTime;
}

export interface SpendUpload {
  id: string;
  clientId: string;
  uploadedAt: IsoDateTime;
  uploadedById: string;
  extractDate: IsoDate;
  fileName: string;
  status: UploadStatus;
  /** Rejected or cancelled: why. */
  note: string | null;
  rowCount: number | null;
  newCount: number | null;
  changedCount: number | null;
  missingCount: number | null;
  errorCount: number;
}

export interface SpendUploadChange {
  id: string;
  type: ChangeType;
  /** CHANGED only. */
  field?: "name" | "percentSpent";
  jobNumber: string;
  projectName: string;
  workstreamName: string;
  before: string | null;
  after: string | null;
  /** MISSING only: the Admin's choice, nothing until chosen. */
  decision?: MissingDecision | null;
}

export interface AuditEvent {
  id: string;
  at: IsoDateTime;
  userName: string;
  entity: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "ARCHIVE" | "RESTORE";
  field: string;
  oldValue: string | null;
  newValue: string | null;
}
