/**
 * Synthetic mock data (brief 01). EVERY name here is invented: the client, workstreams, projects,
 * people and files. Never replace them with real ones (CLAUDE.md §11).
 *
 * Generated deterministically from a seeded random number generator, so every page load and
 * every test sees the same data. The mock clock is fixed (MOCK_NOW) so ages and "this week" do
 * not drift.
 */
import type {
  AuditEvent,
  Client,
  IsoDate,
  LogItem,
  LogLevel,
  PipelineOpportunity,
  Project,
  ProjectStatus,
  ProjectWeek,
  Rag,
  Spend,
  SpendUpload,
  SpendUploadChange,
  User,
  Workstream,
} from "@/types/domain";
import { ISSUE_PRIORITIES, RISK_SEVERITIES } from "@/types/domain";
import { addDays, daysBetween } from "@/lib/dates";
import { addWeeks, formatWeekParam, weekRange, weeksBetween, type WeekRef } from "@/lib/week";
import tcccFile from "./clients/tccc.json";

/** Tuesday of week 47, mid-morning. */
export const MOCK_NOW = new Date("2026-11-17T10:30:00Z");
export const MOCK_TODAY: IsoDate = "2026-11-17";
export const CURRENT_WEEK: WeekRef = { isoYear: 2026, isoWeek: 47 };
/** 12 closed weeks of history, W35–W46. */
export const FIRST_WEEK: WeekRef = addWeeks(CURRENT_WEEK, -12);
export const ALL_WEEKS: WeekRef[] = weeksBetween(FIRST_WEEK, CURRENT_WEEK);

/** Small seeded PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(xs: readonly T[]): T => xs[Math.floor(next() * xs.length)],
    chance: (p: number) => next() < p,
  };
}

const r = rng(47_2026);

// ── People (invented) ─────────────────────────────────────────────────────────────────────────

const PEOPLE: [string, string][] = [
  ["Robin Hale", "ADMIN"],
  ["Kit Varga", "UPDATER"],
  ["Noor Lindqvist", "UPDATER"],
  ["Ola Brennan", "UPDATER"],
  ["Tamsin Achebe", "UPDATER"],
  ["Jules Moreau", "UPDATER"],
  ["Priya Okafor", "UPDATER"],
  ["Sami Kowalczyk", "UPDATER"],
  ["Ines Duarte", "UPDATER"],
  ["Felix Ward", "UPDATER"],
  ["Mara Quint", "UPDATER"],
  ["Dev Ashworth", "UPDATER"],
  ["Lena Fairbank", "UPDATER"],
];

export const USERS: User[] = PEOPLE.map(([name, role], i) => {
  const [first, last] = name.split(" ");
  return {
    id: `u${i + 1}`,
    name,
    initials: `${first[0]}${last[0]}`,
    email: `${first}.${last}@example.com`.toLowerCase(),
    role: role as User["role"],
    lastSignInAt:
      i === 11 || i === 12
        ? null
        : `2026-11-${String(10 + (i % 7)).padStart(2, "0")}T0${8 + (i % 2)}:${String(10 + i * 3).padStart(2, "0")}:00.000Z`,
    archivedAt: null,
  };
});
const UPDATERS = USERS.filter((u) => u.role === "UPDATER");
export const ADMIN = USERS[0];

// ── Client and workstreams (invented) ─────────────────────────────────────────────────────────

export const CLIENTS: Client[] = [{ id: "northwind", name: "Northwind Drinks", archivedAt: null }];
const CLIENT_ID = CLIENTS[0].id;

interface WsDef {
  id: string;
  name: string;
  reported: boolean;
  ad: string | null;
  projects: number;
  included: number;
  prefix: string[];
}

const WS_DEFS: WsDef[] = [
  {
    id: "alpha-eu",
    name: "Alpha EU",
    reported: true,
    ad: "Noor Lindqvist",
    projects: 181,
    included: 8,
    prefix: ["EU", "DE", "FR", "ES", "IT", "NL", "PL", "IE"],
  },
  {
    id: "beta-global",
    name: "Beta Global",
    reported: true,
    ad: "Ola Brennan",
    projects: 118,
    included: 6,
    prefix: ["GL"],
  },
  {
    id: "gamma-nordics",
    name: "Gamma Nordics",
    reported: true,
    ad: "Tamsin Achebe",
    projects: 96,
    included: 7,
    prefix: ["NO", "SE", "DK", "FI"],
  },
  {
    id: "delta-retail",
    name: "Delta Retail",
    reported: true,
    ad: null,
    projects: 24,
    included: 3,
    prefix: ["UK", "IE"],
  },
  {
    id: "epsilon-data",
    name: "Epsilon Data",
    reported: true,
    ad: "Jules Moreau",
    projects: 140,
    included: 5,
    prefix: ["GL", "EU"],
  },
  {
    id: "unmapped",
    name: "UNMAPPED",
    reported: false,
    ad: null,
    projects: 9,
    included: 0,
    prefix: ["XX"],
  },
  {
    id: "business-development",
    name: "Business Development",
    reported: false,
    ad: null,
    projects: 19,
    included: 0,
    prefix: ["BD"],
  },
  {
    id: "ways-of-working",
    name: "Ways of Working",
    reported: false,
    ad: null,
    projects: 14,
    included: 0,
    prefix: ["INT"],
  },
  {
    id: "internal-time",
    name: "Internal Time",
    reported: false,
    ad: null,
    projects: 13,
    included: 0,
    prefix: ["INT"],
  },
  {
    id: "pitch-support",
    name: "Pitch Support",
    reported: false,
    ad: null,
    projects: 7,
    included: 0,
    prefix: ["BD"],
  },
  {
    id: "other",
    name: "Other",
    reported: false,
    ad: null,
    projects: 7,
    included: 0,
    prefix: ["GEN"],
  },
  {
    id: "investment",
    name: "Investment",
    reported: false,
    ad: null,
    projects: 3,
    included: 0,
    prefix: ["INV"],
  },
  {
    id: "intercompany-invoicing",
    name: "Intercompany Invoicing",
    reported: false,
    ad: null,
    projects: 2,
    included: 0,
    prefix: ["FIN"],
  },
];

export const WORKSTREAMS: Workstream[] = WS_DEFS.map((w) => ({
  id: w.id,
  clientId: CLIENT_ID,
  name: w.name,
  reported: w.reported,
  accountDirector: w.ad,
  firstSeen: "2026-08-24",
}));

// ── Projects ──────────────────────────────────────────────────────────────────────────────────

const TOPICS = [
  "CRM_Welcome Journey",
  "Paid Social_Always-on",
  "Email_Template Rebuild",
  "Data Feed_Maintenance",
  "Promo Hub_Content",
  "Landing Pages_Build",
  "Consent_Update",
  "Reporting_Monthly",
  "App_Content Drop",
  "Loyalty_Mechanics",
  "Search_Q4 Activation",
  "Measurement_Framework",
  "Brand Platform_Asset Library",
  "Owned Channels_Pilot",
  "Data Model_Market Rollout",
  "Retail Media_Planning",
];

export const PROJECTS: Project[] = [];
let job = 470_011;
for (const w of WS_DEFS) {
  for (let i = 0; i < w.projects; i++) {
    job += r.int(7, 140);
    const nonBillable = !w.reported || r.chance(0.04);
    const base = `${r.pick(w.prefix)}_${r.pick(TOPICS)}`;
    const suffix = r.chance(0.35) ? `_Phase ${r.int(1, 4)}` : "";
    PROJECTS.push({
      id: `p-${job}`,
      clientId: CLIENT_ID,
      workstreamId: w.id,
      jobNumber: String(job),
      name: nonBillable && !w.reported ? `${base}${suffix} (non-billable)` : `${base}${suffix}`,
      includeInReport: i < w.included,
      missingFromFileSince: null,
      markedNoLongerInFileAt: null,
    });
  }
}

// ── % spend per weekly upload (Mondays W35–W47) ──────────────────────────────────────────────

/** spend[projectId][weekKey]. Included projects all have a history; others a single figure. */
export const SPEND: Record<string, Record<string, Spend>> = {};
for (const p of PROJECTS) {
  const roll = r.next();
  const kind: Spend["spendStatus"] = p.includeInReport
    ? roll < 0.12
      ? "NO_TIMESHEET"
      : roll < 0.2
        ? "NO_BUDGET"
        : "VALUE"
    : roll < 0.45
      ? "NO_BUDGET"
      : roll < 0.7
        ? "NO_TIMESHEET"
        : "VALUE";
  const end = p.includeInReport ? r.next() * 1.5 + 0.1 : r.next() * 1.35;
  const weekly = end / 14;
  SPEND[p.id] = {};
  ALL_WEEKS.forEach((w, i) => {
    const key = formatWeekParam(w);
    if (kind !== "VALUE") {
      SPEND[p.id][key] = { percentSpent: null, spendStatus: kind };
    } else {
      const v = Math.max(0, end - weekly * (ALL_WEEKS.length - 1 - i) * (0.8 + r.next() * 0.4));
      SPEND[p.id][key] = { percentSpent: Math.round(v * 1000) / 1000, spendStatus: "VALUE" };
    }
  });
}

// ── Weekly inputs for included projects ──────────────────────────────────────────────────────

const UPDATE_LINES = [
  "Delivery on track for this phase. Next milestone is client sign-off on the build.",
  "Waiting for client feedback on the second round of creative; chased on Monday.",
  "Spend is ahead of completion because of extra testing rounds. Change request drafted.",
  "Data feed fixed and back to normal. Monitoring daily until the end of the month.",
  "Scope agreed for the next sprint. Two new templates added at the client's request.",
  "Blocked on access to the client's test environment; raised with their IT team.",
  "Launch moved by a week to fit the client's release calendar. No cost impact.",
  "Reporting delivered on time. Planning for the next quarter has started.",
];

/** Project weeks keyed by `${projectId}|${weekKey}`. */
export const PROJECT_WEEKS = new Map<string, ProjectWeek>();
export const PROJECT_SUBMITTERS: Record<string, string[]> = {};

const RAG_STEPS: Rag[] = ["GREEN", "AMBER", "RED"];

for (const p of PROJECTS.filter((x) => x.includeInReport)) {
  const owners = [r.pick(UPDATERS).id];
  if (r.chance(0.35)) owners.push(r.pick(UPDATERS).id);
  PROJECT_SUBMITTERS[p.id] = owners;
  let rag: Rag = r.chance(0.7) ? "GREEN" : "AMBER";
  let complete = r.int(0, 3) * 10;
  let status: ProjectStatus = "IN_PROGRESS";
  let last: ProjectWeek | null = null;
  ALL_WEEKS.forEach((w, i) => {
    const key = formatWeekParam(w);
    const isCurrent = i === ALL_WEEKS.length - 1;
    // Drift the values a little each week.
    if (r.chance(0.25)) {
      const idx = RAG_STEPS.indexOf(rag) + (r.chance(0.55) ? -1 : 1);
      rag = RAG_STEPS[Math.min(2, Math.max(0, idx))];
    }
    if (status !== "COMPLETE" && r.chance(0.6)) complete = Math.min(100, complete + 10);
    if (complete === 100 && r.chance(0.5)) status = "COMPLETE";
    else if (status === "IN_PROGRESS" && r.chance(0.04)) status = "ON_HOLD";
    else if (status === "ON_HOLD" && r.chance(0.4)) status = "IN_PROGRESS";

    const submitter = r.pick(owners);
    const { monday } = weekRange(w);
    const day = r.int(0, isCurrent ? 1 : 4);
    const at = `${addDays(monday, day)}T${String(r.int(8, 16)).padStart(2, "0")}:${String(r.int(0, 59)).padStart(2, "0")}:00.000Z`;
    const values = { status, rag, percentComplete: complete, updateText: r.pick(UPDATE_LINES) };

    let entry: ProjectWeek;
    if (isCurrent) {
      const roll = r.next();
      if (roll < 0.62) {
        entry = {
          projectId: p.id,
          week: key,
          ...values,
          state: "SUBMITTED",
          submittedAt: at,
          submittedById: submitter,
        };
      } else if (roll < 0.75) {
        entry = {
          projectId: p.id,
          week: key,
          ...values,
          state: "DRAFT",
          submittedAt: null,
          submittedById: null,
        };
      } else {
        return; // not started
      }
    } else if (last && r.chance(0.08)) {
      // No submission by the close: carry forward last week's values, marked "Not updated".
      entry = { ...last, week: key, notUpdated: true };
    } else {
      entry = {
        projectId: p.id,
        week: key,
        ...values,
        state: "SUBMITTED",
        submittedAt: at,
        submittedById: submitter,
        notUpdated: false,
      };
    }
    PROJECT_WEEKS.set(`${p.id}|${key}`, entry);
    if (entry.state === "SUBMITTED" && !entry.notUpdated) last = entry;
  });
}

// ── Risks and issues ─────────────────────────────────────────────────────────────────────────

const RISK_TITLES = [
  "Client budget sign-off may slip into next quarter",
  "Key stakeholder changing role in January",
  "Third-party data feed may not be ready for launch",
  "Creative approvals slipping past the weekly deadline",
  "Media costs rising faster than planned",
  "Platform API change due in Q1",
  "Resourcing gap over the holiday period",
  "Scope creep from additional market requests",
  "Legal review of new markets not yet scheduled",
  "Consent changes could reduce the addressable audience",
  "Dependency on the client's IT release calendar",
  "Translation turnaround longer than planned",
];
const ISSUE_TITLES = [
  "Budget exceeded with delivery still to run",
  "Tracking pixel missing on landing pages",
  "Data feed failing nightly since the last release",
  "Client feedback outstanding for two weeks",
  "Test environment unavailable",
  "Wrong segment sent in the last campaign",
  "Invoice rejected: purchase order number missing",
];
const MITIGATIONS = [
  "Agree a 48-hour approval turnaround with the brand team.",
  "Rebalance spend towards owned channels; review at the next client meeting.",
  "Handover notes written; cover agreed with the wider team.",
  "Raise at the steering group and confirm a fallback date.",
  "Legal review booked once the policy is published.",
];
const NEXT_STEPS = [
  "Change request sent to the client; decision expected this week.",
  "Fix deployed to staging; goes live after testing.",
  "Escalated to the client's IT lead.",
  "Chase at Thursday's status call.",
  "Finance to reissue with the correct purchase order.",
];
const OWNERS = [
  "Kit Varga",
  "Noor Lindqvist",
  "Ola Brennan",
  "Priya Okafor",
  "Sami Kowalczyk",
  "Client PM",
  "Ines Duarte",
  "Felix Ward",
];

const rawLogs: Omit<LogItem, "id" | "ref">[] = [];
for (const p of PROJECTS.filter((x) => x.includeInReport)) {
  const nRisks = r.int(0, 4);
  const nIssues = r.int(0, 2);
  const make = (kind: "RISK" | "ISSUE") => {
    const levels = (kind === "RISK" ? RISK_SEVERITIES : ISSUE_PRIORITIES) as readonly LogLevel[];
    const raisedOn = addDays(MOCK_TODAY, -r.int(0, 115));
    const age = daysBetween(raisedOn, MOCK_TODAY);
    const closed = age > 10 && r.chance(0.35);
    const closedOn = closed ? addDays(raisedOn, r.int(3, Math.max(4, age - 1))) : null;
    const archived = !closed && r.chance(0.04);
    rawLogs.push({
      kind,
      clientId: CLIENT_ID,
      projectId: p.id,
      title: r.pick(kind === "RISK" ? RISK_TITLES : ISSUE_TITLES),
      level:
        kind === "ISSUE" && r.chance(0.12)
          ? "BLOCKER"
          : r.pick(levels.filter((l) => l !== "BLOCKER")),
      owner: r.pick(OWNERS),
      status: closed ? "CLOSED" : r.chance(0.15) ? "ON_PAUSE" : "OPEN",
      raisedOn,
      dueOn: r.chance(0.9) ? addDays(raisedOn, r.int(7, 60)) : null,
      action: r.pick(kind === "RISK" ? MITIGATIONS : NEXT_STEPS),
      closedOn,
      archivedAt: archived ? "2026-11-05T11:00:00.000Z" : null,
    });
  };
  for (let i = 0; i < nRisks; i++) make("RISK");
  for (let i = 0; i < nIssues; i++) make("ISSUE");
}
rawLogs.sort((a, b) => daysBetween(b.raisedOn, a.raisedOn));
const seq = { RISK: 0, ISSUE: 0 };
export const LOG_ITEMS: LogItem[] = rawLogs.map((l) => {
  seq[l.kind] += 1;
  const ref = `${l.kind === "RISK" ? "R" : "I"}-${String(seq[l.kind]).padStart(3, "0")}`;
  return { ...l, id: `${l.kind.toLowerCase()}-${seq[l.kind]}`, ref };
});
/** Last refs used per client (counters on Client in brief 02). */
export const LOG_SEQ: Record<string, { RISK: number; ISSUE: number }> = {
  [CLIENT_ID]: { ...seq },
};

// ── Pipeline ─────────────────────────────────────────────────────────────────────────────────

const OPPORTUNITIES = [
  [
    "Retention programme for two new markets, following this year's welcome journeys",
    "Send scope and estimate; client to confirm budget at the planning meeting",
  ],
  [
    "Extend the data migration to a second wave of markets",
    "Wait for wave 1 results; discovery workshop pencilled for early December",
  ],
  [
    "Always-on loyalty pilot in two markets",
    "Client exploring internal options; follow up after their January budget round",
  ],
  [
    "Measurement framework refresh for next year",
    "Share a one-page proposal at the next quarterly review",
  ],
  ["Retail media test with two partners", "Client to confirm partners; draft a test plan"],
  ["Consent platform upgrade for all markets", "Technical discovery call booked"],
];

/** Invented sample values (whole US dollars), used in turn (brief 05b). */
const SAMPLE_VALUES = [
  450_000, 120_000, 85_000, 640_000, 230_000, 35_000, 900_000, 175_000, 60_000, 310_000, 95_000,
  520_000,
];
let oppIndex = 0;

export const PIPELINE: PipelineOpportunity[] = [];
for (const w of WS_DEFS.filter((x) => x.reported)) {
  const n = w.id === "delta-retail" ? 0 : r.int(1, 4);
  for (let i = 0; i < n; i++) {
    const [title, next] = r.pick(OPPORTUNITIES);
    PIPELINE.push({
      id: `opp-${w.id}-${i + 1}`,
      workstreamId: w.id,
      likelihood: r.pick(["HIGH", "MEDIUM", "LOW"] as const),
      title,
      estimatedValue: SAMPLE_VALUES[oppIndex % SAMPLE_VALUES.length],
      possibleStart: r.chance(0.85) ? addDays("2026-12-01", r.int(0, 150)) : null,
      // Added between 10 and 200 days before the mock date.
      addedOn: addDays(MOCK_TODAY, -(10 + ((oppIndex++ * 47) % 191))),
      mapOwner: r.pick(UPDATERS).name,
      clientOwner: r.pick([
        "Client CRM Lead",
        "Client Data Lead",
        "Client Marketing Director",
        "Client Digital Manager",
      ]),
      nextSteps: next,
      createdOn: addDays(MOCK_TODAY, -r.int(0, 80)),
      archivedAt: null,
    });
  }
}

// ── Uploads ──────────────────────────────────────────────────────────────────────────────────

const fileFor = (w: WeekRef) => `Northwind_Spend_Extract_W${w.isoWeek}.xlsx`;

export const UPLOADS: SpendUpload[] = [];
ALL_WEEKS.forEach((w, i) => {
  const monday = weekRange(w).monday;
  UPLOADS.push({
    id: `up-${formatWeekParam(w)}`,
    clientId: CLIENT_ID,
    uploadedAt: `${monday}T09:${String(10 + (i % 40)).padStart(2, "0")}:00.000Z`,
    uploadedById: ADMIN.id,
    extractDate: monday,
    fileName: fileFor(w),
    status: i === ALL_WEEKS.length - 1 ? "LIVE" : "REPLACED",
    note: null,
    rowCount: PROJECTS.length - (ALL_WEEKS.length - 1 - i) * 3,
    newCount: i === 0 ? null : r.int(1, 6),
    changedCount: r.int(25, 45),
    missingCount: i === ALL_WEEKS.length - 1 ? 0 : r.int(0, 2),
    errorCount: 0,
  });
});
// A rejected and a cancelled attempt in the history.
UPLOADS.push({
  id: "up-rejected",
  clientId: CLIENT_ID,
  uploadedAt: "2026-11-16T08:55:00.000Z",
  uploadedById: ADMIN.id,
  extractDate: "2026-11-16",
  fileName: fileFor(CURRENT_WEEK),
  status: "REJECTED",
  note: 'Header D1: expected "Percentage Spent to Date", found "Percent Spent".',
  rowCount: null,
  newCount: null,
  changedCount: null,
  missingCount: null,
  errorCount: 1,
});
UPLOADS.push({
  id: "up-cancelled",
  clientId: CLIENT_ID,
  uploadedAt: "2026-11-02T09:31:00.000Z",
  uploadedById: ADMIN.id,
  extractDate: "2026-10-30",
  fileName: "Northwind_Spend_Extract_W45_old.xlsx",
  status: "CANCELLED",
  note: "Cancelled at preview: wrong extract date.",
  rowCount: null,
  newCount: null,
  changedCount: null,
  missingCount: null,
  errorCount: 0,
});

/** A file checked today and waiting for review (nothing saved yet). */
export const STAGED_UPLOAD: SpendUpload = {
  id: "up-staged",
  clientId: CLIENT_ID,
  uploadedAt: "2026-11-17T10:05:00.000Z",
  uploadedById: ADMIN.id,
  extractDate: "2026-11-17",
  fileName: "Northwind_Spend_Extract_W47_refresh.xlsx",
  status: "READY_TO_REVIEW",
  note: null,
  rowCount: PROJECTS.length + 3,
  newCount: 6,
  changedCount: 9,
  missingCount: 3,
  errorCount: 0,
};

const pickProjects = (n: number, filter: (p: Project) => boolean) =>
  PROJECTS.filter(filter)
    .filter((_, i) => i % 7 === 3)
    .slice(0, n);
const wsName = (id: string) => WORKSTREAMS.find((w) => w.id === id)?.name ?? id;

export const STAGED_CHANGES: SpendUploadChange[] = [
  ...[
    ["900102", "EU_CRM_Winback Journeys_Phase 1", "Alpha EU", "No timesheet data"],
    ["900140", "GL_Brand Platform_Asset Library", "Beta Global", "Add budget"],
    ["900177", "NO_App_Push Notifications Pilot", "Gamma Nordics", "2.5%"],
    ["900201", "GL_Measurement_Q1 Planning", "Epsilon Data", "Add budget"],
    ["900255", "UK_Retail Media_Q1 Always-on", "Delta Retail", "No timesheet data"],
    ["900261", "INT_Internal time_Q1 Planning (non-billable)", "Internal Time", "Add budget"],
  ].map(([jobNumber, projectName, workstreamName, after], i): SpendUploadChange => ({
    id: `chg-new-${i}`,
    type: "NEW",
    jobNumber,
    projectName,
    workstreamName,
    before: null,
    after,
  })),
  ...pickProjects(2, (p) => p.workstreamId === "alpha-eu").map((p, i): SpendUploadChange => ({
    id: `chg-name-${i}`,
    type: "CHANGED",
    field: "name",
    jobNumber: p.jobNumber,
    projectName: p.name,
    workstreamName: wsName(p.workstreamId),
    before: p.name.replace(/ /, "  ").replace(/_Phase (\d)/, "_Phase$1"),
    after: p.name,
  })),
  ...pickProjects(1, (p) => p.workstreamId === "epsilon-data").map((p): SpendUploadChange => ({
    id: "chg-moved-0",
    type: "MOVED",
    jobNumber: p.jobNumber,
    projectName: p.name,
    workstreamName: wsName(p.workstreamId),
    before: "Beta Global",
    after: wsName(p.workstreamId),
  })),
  ...PROJECTS.filter(
    (p) => p.includeInReport && SPEND[p.id][formatWeekParam(CURRENT_WEEK)].spendStatus === "VALUE"
  )
    .slice(0, 7)
    .map((p, i): SpendUploadChange => {
      const now = SPEND[p.id][formatWeekParam(CURRENT_WEEK)].percentSpent as number;
      return {
        id: `chg-spend-${i}`,
        type: "CHANGED",
        field: "percentSpent",
        jobNumber: p.jobNumber,
        projectName: p.name,
        workstreamName: wsName(p.workstreamId),
        before: `${(now * 100).toFixed(1)}%`,
        after: `${(now * 100 + 1.5 + i).toFixed(1)}%`,
      };
    }),
  ...pickProjects(
    3,
    (p) => !p.includeInReport && WS_DEFS.find((w) => w.id === p.workstreamId)!.reported
  ).map((p, i): SpendUploadChange => ({
    id: `chg-missing-${i}`,
    type: "MISSING",
    jobNumber: p.jobNumber,
    projectName: p.name,
    workstreamName: wsName(p.workstreamId),
    before: null,
    after: null,
  })),
];

// ── Change history (audit) ───────────────────────────────────────────────────────────────────

export const AUDIT_EVENTS: AuditEvent[] = (() => {
  const included = PROJECTS.filter((p) => p.includeInReport);
  const events: AuditEvent[] = [];
  let n = 0;
  const push = (e: Omit<AuditEvent, "id">) => events.push({ ...e, id: `a${++n}` });
  push({
    at: "2026-11-17T09:41:00.000Z",
    userName: "Kit Varga",
    entity: "ProjectWeek",
    entityId: included[0].jobNumber,
    action: "UPDATE",
    field: "rag",
    oldValue: "GREEN",
    newValue: "AMBER",
  });
  push({
    at: "2026-11-17T09:40:00.000Z",
    userName: "Kit Varga",
    entity: "ProjectWeek",
    entityId: included[0].jobNumber,
    action: "UPDATE",
    field: "percentComplete",
    oldValue: "50",
    newValue: "60",
  });
  push({
    at: "2026-11-16T15:12:00.000Z",
    userName: "Noor Lindqvist",
    entity: "Project",
    entityId: included[2].jobNumber,
    action: "UPDATE",
    field: "includeInReport",
    oldValue: "false",
    newValue: "true",
  });
  push({
    at: "2026-11-16T14:03:00.000Z",
    userName: "Priya Okafor",
    entity: "RiskItem",
    entityId: "R-031",
    action: "CREATE",
    field: "*",
    oldValue: null,
    newValue: "R-031",
  });
  push({
    at: "2026-11-16T11:20:00.000Z",
    userName: "Ola Brennan",
    entity: "PipelineOpportunity",
    entityId: "opp-beta-global-1",
    action: "UPDATE",
    field: "likelihood",
    oldValue: "MEDIUM",
    newValue: "HIGH",
  });
  push({
    at: "2026-11-16T09:22:00.000Z",
    userName: "Robin Hale",
    entity: "SpendUpload",
    entityId: "up-2026-W47",
    action: "CREATE",
    field: "*",
    oldValue: null,
    newValue: "Northwind_Spend_Extract_W47.xlsx",
  });
  push({
    at: "2026-11-13T16:45:00.000Z",
    userName: "Sami Kowalczyk",
    entity: "IssueItem",
    entityId: "I-007",
    action: "ARCHIVE",
    field: "*",
    oldValue: "I-007",
    newValue: null,
  });
  push({
    at: "2026-11-12T10:05:00.000Z",
    userName: "Robin Hale",
    entity: "Workstream",
    entityId: "delta-retail",
    action: "UPDATE",
    field: "reported",
    oldValue: "false",
    newValue: "true",
  });
  return events;
})();

// ── Real client from its spend file (decision log, 17 Nov 2026) ──────────────────────────────
//
// Loaded from src/mocks/clients/*.json, converted from the client's own spend file with
// scripts/import-spend-file.mts and approved by the Admin for use on the site. Only what the
// file contains is used: job numbers, project names, workstreams and % spend. No weekly
// updates, risks, issues or pipeline are invented for real projects, so nothing is in the
// weekly report until someone ticks it. Client and workstream names live in the JSON only.

interface SpendFile {
  client: { id: string; name: string };
  extractDate: string;
  fileName: string;
  reported: string[];
  rows: {
    jobNumber: string;
    name: string;
    workstream: string;
    percentSpent: number | null;
    spendStatus: string;
  }[];
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function loadSpendFile(f: SpendFile) {
  const clientId = f.client.id;
  CLIENTS.push({ id: clientId, name: f.client.name, archivedAt: null });
  LOG_SEQ[clientId] = { RISK: 0, ISSUE: 0 };
  const wsIds = new Map<string, string>();
  for (const name of [...new Set(f.rows.map((r) => r.workstream))]) {
    const id = `${clientId}-${slug(name)}`;
    wsIds.set(name, id);
    WORKSTREAMS.push({
      id,
      clientId,
      name,
      reported: f.reported.includes(name),
      accountDirector: null,
      firstSeen: f.extractDate,
    });
  }
  for (const row of f.rows) {
    const id = `p-${clientId}-${row.jobNumber}`;
    PROJECTS.push({
      id,
      clientId,
      workstreamId: wsIds.get(row.workstream) as string,
      jobNumber: row.jobNumber,
      name: row.name,
      includeInReport: false,
      missingFromFileSince: null,
      markedNoLongerInFileAt: null,
    });
    const spend: Spend = {
      percentSpent: row.spendStatus === "VALUE" ? row.percentSpent : null,
      spendStatus: row.spendStatus as Spend["spendStatus"],
    };
    // One upload so far: the same figures stand for every week shown (decision log: a week
    // without its own upload uses the latest confirmed one).
    SPEND[id] = Object.fromEntries(ALL_WEEKS.map((w) => [formatWeekParam(w), spend]));
  }
  UPLOADS.push({
    id: `up-${clientId}-${f.extractDate}`,
    clientId,
    uploadedAt: `${f.extractDate}T09:00:00.000Z`,
    uploadedById: ADMIN.id,
    extractDate: f.extractDate,
    fileName: f.fileName,
    status: "LIVE",
    note: null,
    rowCount: f.rows.length,
    newCount: f.rows.length,
    changedCount: 0,
    missingCount: 0,
    errorCount: 0,
  });
}

loadSpendFile(tcccFile as SpendFile);
