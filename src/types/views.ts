/**
 * View models: what the repository (src/mocks/repository.ts now, Prisma in brief 02) returns
 * to pages. Pages never import fixtures directly.
 */
import type {
  Client,
  IsoDate,
  IsoDateTime,
  LogItem,
  PipelineOpportunity,
  ProjectStatus,
  ProjectWeek,
  Rag,
  Role,
  Spend,
  SpendUpload,
  SpendUploadChange,
  UpdateState,
  User,
  Workstream,
} from "./domain";
import type { WeekRef } from "@/lib/week";

export interface Viewer {
  id: string;
  name: string;
  initials: string;
  role: Role;
  /** Signed in with a temporary password: must choose their own first. */
  mustChangePassword?: boolean;
}

/** The week a page shows, and whether it is the open one. */
export interface WeekContext {
  ref: WeekRef;
  /** "2026-W47". */
  key: string;
  label: string;
  closed: boolean;
  /** London calendar date used as "today" for ages and overdue: the real day for the open week, the Friday for a closed week. */
  asOf: IsoDate;
  /** Friday (calendar date) of the week. */
  closeDate: IsoDate;
}

export interface WeekOption {
  key: string;
  label: string;
  closed: boolean;
}

/** One row in a project list. Week values are for the week being viewed. */
export interface ProjectRow {
  id: string;
  jobNumber: string;
  name: string;
  workstreamId: string;
  workstreamName: string;
  included: boolean;
  spend: Spend;
  status: ProjectStatus | null;
  rag: Rag | null;
  percentComplete: number | null;
  /** Submitted in the week being viewed. */
  submittedThisWeek: boolean;
  /** Draft saved (not submitted) in the week being viewed. */
  draftThisWeek: boolean;
  /** Closed week only: values carried forward. */
  notUpdated: boolean;
  lastSubmittedAt: IsoDateTime | null;
  lastSubmittedBy: string | null;
  openRisks: number;
  openIssues: number;
}

export interface LogRow extends LogItem {
  projectJob: string;
  projectName: string;
  workstreamId: string;
  workstreamName: string;
}

export interface RagCounts {
  GREEN: number;
  AMBER: number;
  RED: number;
}

export interface WorkstreamTiles {
  inReport: number;
  total: number;
  submitted: number;
  complete: number;
  onHold: number;
  rag: RagCounts;
  spend: {
    under75: number;
    from75to100: number;
    over100: number;
    noFigure: number;
    noBudget: number;
    noTimesheet: number;
  };
  risks: number;
  risksPrev: number;
  issues: number;
  issuesPrev: number;
  pipeline: number;
  pipelineHigh: number;
}

export interface WorkstreamSummary {
  workstream: Workstream;
  tiles: WorkstreamTiles;
}

export interface UploadInfo {
  upload: SpendUpload;
  uploadedByName: string;
}

export interface ClientOverview {
  client: Client;
  week: WeekContext;
  weeks: WeekOption[];
  workstreams: WorkstreamSummary[];
  totals: WorkstreamTiles;
  needsAttention: (ProjectRow & { reasons: string[] })[];
  latestUpload: UploadInfo | null;
}

export interface WorkstreamOverview {
  client: Client;
  workstream: Workstream;
  week: WeekContext;
  weeks: WeekOption[];
  tiles: WorkstreamTiles;
  pipeline: PipelineOpportunity[];
  projects: ProjectRow[];
  /** Risks and issues on this workstream's projects (for live tile counts). */
  logs: LogItem[];
  /** Friday before the viewed week, for "on last week" changes. */
  lastWeekEnd: IsoDate;
  submitters: string[];
  latestUpload: UploadInfo | null;
}

export interface SpendPoint {
  week: string;
  spend: Spend;
  percentComplete: number | null;
}

export interface ProjectPageView {
  client: Client;
  workstream: Workstream;
  project: ProjectRow;
  week: WeekContext;
  weeks: WeekOption[];
  /** This week's entry (draft or submitted), if any. */
  thisWeek: ProjectWeek | null;
  /** Latest submission before this week. */
  lastSubmission: (ProjectWeek & { weekLabel: string; submittedByName: string | null }) | null;
  /** Values the form starts from. */
  form: {
    status: ProjectStatus;
    rag: Rag;
    percentComplete: number;
    updateText: string;
    state: UpdateState | null;
  };
  submittedByName: string | null;
  spendPrev: Spend | null;
  spendTrend: SpendPoint[];
  ragHistory: { week: string; rag: Rag | null; current: boolean }[];
  risks: LogItem[];
  issues: LogItem[];
  latestUpload: UploadInfo | null;
}

export interface AdminHomeView {
  week: WeekContext;
  /** Across every client's reported workstreams. */
  outstanding: ProjectRow[];
  inReport: number;
  submitted: number;
  clients: ClientOverview[];
  /** Latest confirmed upload per client, newest first. */
  uploads: { client: Client; info: UploadInfo }[];
  users: { admins: number; updaters: number; neverSignedIn: number };
}

export interface UploadsView {
  client: Client;
  clients: Client[];
  latest: UploadInfo | null;
  latestStats: {
    records: number;
    reportedRecords: number;
    hiddenRecords: number;
    workstreams: number;
    reportedWorkstreams: number;
    newWorkstreams: number;
    withFigure: number;
    overBudget: number;
    noBudget: number;
    noTimesheet: number;
  };
  /** A checked file waiting for review, if any. */
  staged: {
    upload: SpendUpload;
    fileChecks: string[];
    changes: SpendUploadChange[];
    rowErrors: { rowNumber: number; message: string }[];
  } | null;
  history: UploadInfo[];
  workstreams: (Workstream & { projectCount: number })[];
  previousUploadDate: IsoDate | null;
}

export interface SimpleUser extends User {
  lastSignInText: string;
}

/** Risk and issue log page data. */
export interface LogData {
  client: Client;
  week: WeekContext;
  weeks: WeekOption[];
  /** Up to 12 weeks ending with the viewed week, oldest first (as ?week= keys). */
  chartWeeks: string[];
  workstreams: { id: string; name: string }[];
  items: LogRow[];
}
