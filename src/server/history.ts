/**
 * Admin › Change history (brief 08): one page of audit events for the filters, queried here
 * only (other pages no longer load the history), with each record given a readable name.
 */
import { prisma } from "@/lib/prisma";
import { weekLabel } from "@/lib/week";
import {
  HISTORY_PAGE_SIZE,
  historyWhere,
  pageInfo,
  type HistoryFilters,
  type PageInfo,
} from "@/lib/history";

export interface HistoryRow {
  id: string;
  at: string;
  who: string;
  action: "CREATE" | "UPDATE" | "ARCHIVE" | "RESTORE" | "GENERATE";
  entity: string;
  record: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

const ENTITY_WORD: Record<string, string> = {
  User: "User",
  Client: "Client",
  Workstream: "Workstream",
  Project: "Project",
  ProjectWeek: "Weekly update",
  RiskItem: "Risk",
  IssueItem: "Issue",
  PipelineOpportunity: "Opportunity",
  SpendUpload: "Spend upload",
  SpendUploadChange: "Upload change",
  ReportingPeriod: "Week",
  Report: "Report",
};

export function entityWord(entity: string): string {
  return ENTITY_WORD[entity] ?? entity;
}

async function labels(events: { entity: string; entityId: string }[]) {
  const ids = (entity: string) => [
    ...new Set(events.filter((e) => e.entity === entity).map((e) => e.entityId)),
  ];
  const reportClients = ids("Report").map((id) => id.split("/")[0]);
  const reportWs = ids("Report")
    .map((id) => id.split("/")[1])
    .filter(Boolean);
  const [users, clients, workstreams, projects, weeks, risks, issues, opps, uploads, periods] =
    await Promise.all([
      prisma.user.findMany({
        where: { id: { in: ids("User") } },
        select: { id: true, name: true },
      }),
      prisma.client.findMany({
        where: { id: { in: [...ids("Client"), ...reportClients] } },
        select: { id: true, name: true },
      }),
      prisma.workstream.findMany({
        where: { id: { in: [...ids("Workstream"), ...reportWs] } },
        select: { id: true, name: true },
      }),
      prisma.project.findMany({
        where: { id: { in: ids("Project") } },
        select: { id: true, jobNumber: true, name: true },
      }),
      prisma.projectWeek.findMany({
        where: { id: { in: ids("ProjectWeek") } },
        select: {
          id: true,
          project: { select: { jobNumber: true, name: true } },
          period: { select: { isoYear: true, isoWeek: true } },
        },
      }),
      prisma.riskItem.findMany({
        where: { id: { in: ids("RiskItem") } },
        select: { id: true, ref: true, title: true },
      }),
      prisma.issueItem.findMany({
        where: { id: { in: ids("IssueItem") } },
        select: { id: true, ref: true, title: true },
      }),
      prisma.pipelineOpportunity.findMany({
        where: { id: { in: ids("PipelineOpportunity") } },
        select: { id: true, title: true },
      }),
      prisma.spendUpload.findMany({
        where: { id: { in: ids("SpendUpload") } },
        select: { id: true, fileName: true, client: { select: { name: true } } },
      }),
      prisma.reportingPeriod.findMany({
        where: { id: { in: ids("ReportingPeriod") } },
        select: { id: true, isoYear: true, isoWeek: true },
      }),
    ]);
  const m = new Map<string, string>();
  const put = (entity: string, id: string, label: string) => m.set(`${entity}|${id}`, label);
  for (const u of users) put("User", u.id, u.name);
  for (const c of clients) put("Client", c.id, c.name);
  for (const w of workstreams) put("Workstream", w.id, w.name);
  for (const p of projects) put("Project", p.id, `${p.jobNumber} ${p.name}`);
  for (const w of weeks)
    put(
      "ProjectWeek",
      w.id,
      `${w.project.jobNumber} ${w.project.name} · ${weekLabel(w.period).split(" · ")[0]}`
    );
  for (const r of risks) put("RiskItem", r.id, `${r.ref} ${r.title}`);
  for (const i of issues) put("IssueItem", i.id, `${i.ref} ${i.title}`);
  for (const o of opps) put("PipelineOpportunity", o.id, o.title);
  for (const u of uploads) put("SpendUpload", u.id, `${u.client.name} · ${u.fileName}`);
  for (const p of periods) put("ReportingPeriod", p.id, weekLabel(p).split(" · ")[0]);
  return (entity: string, entityId: string): string => {
    if (entity === "Report") {
      const [c, w] = entityId.split("/");
      const client = m.get(`Client|${c}`) ?? c;
      return w ? `${client} · ${m.get(`Workstream|${w}`) ?? w}` : client;
    }
    return m.get(`${entity}|${entityId}`) ?? entityId;
  };
}

export async function loadHistory(
  f: HistoryFilters
): Promise<{ rows: HistoryRow[]; info: PageInfo; people: { id: string; name: string }[] }> {
  const where = historyWhere(f);
  const [total, people] = await Promise.all([
    prisma.auditEvent.count({ where }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const info = pageInfo(total, f.page);
  const events = await prisma.auditEvent.findMany({
    where,
    orderBy: [{ at: "desc" }, { id: "desc" }],
    skip: info.skip,
    take: HISTORY_PAGE_SIZE,
    select: {
      id: true,
      at: true,
      action: true,
      entity: true,
      entityId: true,
      field: true,
      oldValue: true,
      newValue: true,
      user: { select: { name: true } },
    },
  });
  const label = await labels(events);
  return {
    info,
    people,
    rows: events.map((e) => ({
      id: e.id,
      at: e.at.toISOString(),
      who: e.user?.name ?? "System",
      action: e.action,
      entity: entityWord(e.entity),
      record: label(e.entity, e.entityId),
      field: e.field,
      oldValue: e.oldValue,
      newValue: e.newValue,
    })),
  };
}
