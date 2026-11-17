import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  Delta,
  RagBar,
  TableScroll,
  Tag,
  tableClass,
  tbodyRow,
  td,
  th,
  theadRow,
} from "@/components/features/display";
import { Forbidden } from "@/components/features/forbidden";
import { InternalPill } from "@/components/ui/pill";
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatWeekdayDayMonth,
  addDays,
} from "@/lib/dates";
import { canAdminister } from "@/lib/permissions";
import { requireViewer } from "@/lib/viewer";
import { DEFAULT_CLIENT_ID, getAdminHome } from "@/mocks/repository";

export const metadata: Metadata = { title: "Admin home" };

const linkBtn = "inline-flex min-h-11 items-center px-5 text-[14px] font-medium no-underline";

export default async function AdminHomePage() {
  const viewer = await requireViewer();
  if (!canAdminister(viewer)) return <Forbidden backHref={`/clients/${DEFAULT_CLIENT_ID}`} />;
  const v = getAdminHome();
  const c = v.client;
  const t = c.totals;
  const due = formatWeekdayDayMonth(v.week.closeDate);
  const share = v.inReport ? (v.submitted / v.inReport) * 100 : 0;
  const upload = v.latestUpload?.upload;
  const nextMonday = addDays(v.week.closeDate, 3);

  const steps = [
    {
      title: "Spend file uploaded",
      when: upload
        ? `${formatWeekdayDayMonth(upload.extractDate)}, ${formatTime(upload.uploadedAt)} · ${c.client.name}`
        : "Not yet this week",
      done: !!upload,
    },
    {
      title: "PMs submit updates",
      when: `${v.submitted} of ${v.inReport} so far · due ${due}`,
      done: false,
    },
    { title: "Week closes", when: `${due}, 23:59 · snapshot saved`, done: false },
    {
      title: `Week ${v.week.ref.isoWeek + 1} opens`,
      when: `${formatWeekdayDayMonth(nextMonday)} · next spend upload`,
      done: false,
    },
  ];

  return (
    <>
      <p className="eyebrow mb-2.5">
        Admin home · {v.week.label} · closes {due}
      </p>
      <h1 className="text-[40px] leading-tight font-light sm:text-[48px]">Weekly Project Health</h1>
      <p className="mt-2.5 mb-8 flex flex-wrap items-center gap-2 text-[15px]">
        <span>The weekly view of project health across clients and workstreams.</span>
        <InternalPill />
      </p>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-4">
          <Card labelledBy="out-h">
            <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-2.5">
              <h2 id="out-h" className="text-[24px] font-light">
                Updates outstanding
              </h2>
              <span className="text-[14px] font-medium">
                {v.outstanding.length} of {v.inReport} not yet submitted · due {due}
              </span>
            </div>
            <div
              role="img"
              aria-label={`${v.submitted} of ${v.inReport} updates submitted`}
              className="mb-1.5 flex h-2 bg-track"
            >
              <div className="bg-navy" style={{ width: `${share}%` }} />
            </div>
            <p className="mb-4 text-[13px] text-muted">
              {v.submitted} of {v.inReport} projects in the weekly report have been submitted this
              week. Projects without a submission by Friday carry last week&apos;s values into the
              snapshot, marked &quot;Not updated&quot;.
            </p>
            {v.outstanding.length ? (
              <TableScroll label="Updates outstanding">
                <table className={`${tableClass} min-w-[760px]`}>
                  <caption className="sr-only">
                    Projects in the weekly report with no submission this week
                  </caption>
                  <thead>
                    <tr className={theadRow}>
                      <th scope="col" className={`${th} pl-0`}>
                        Project
                      </th>
                      <th scope="col" className={th}>
                        Workstream
                      </th>
                      <th scope="col" className={th}>
                        Last submitted by
                      </th>
                      <th scope="col" className={th}>
                        Last submitted
                      </th>
                      <th scope="col" className={th}>
                        This week
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.outstanding.map((o) => (
                      <tr key={o.id} className={tbodyRow}>
                        <td className={`${td} pl-0`}>
                          <Link href={`/projects/${o.id}`}>{o.name}</Link>
                          <div className="text-[12px] text-muted">{o.jobNumber}</div>
                        </td>
                        <td className={td}>{o.workstreamName}</td>
                        <td className={td}>{o.lastSubmittedBy ?? "—"}</td>
                        <td className={td}>
                          {o.lastSubmittedAt ? formatDate(o.lastSubmittedAt.slice(0, 10)) : "Never"}
                        </td>
                        <td className={td}>
                          {o.draftThisWeek ? (
                            <Tag tone="muted">Draft saved</Tag>
                          ) : (
                            <Tag tone="warning">Not started</Tag>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            ) : (
              <p className="text-[14px]">Every project in the weekly report has been submitted.</p>
            )}
          </Card>

          <section aria-labelledby="clients-h">
            <h2 id="clients-h" className="mt-2 mb-3.5 text-[26px] font-light">
              Clients
            </h2>
            <article className="border-t-4 border-navy bg-white p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-[30px] font-light">
                    <Link href={`/clients/${c.client.id}`} className="no-underline">
                      {c.client.name}
                    </Link>
                  </h3>
                  <p className="mt-1.5 text-[14px] text-muted">
                    {c.workstreams.length} reported workstreams · {t.inReport} projects in weekly
                    report · spend upload {formatDate(upload?.extractDate)}
                  </p>
                </div>
                <Link
                  href={`/clients/${c.client.id}`}
                  className={`${linkBtn} bg-navy text-cream hover:text-cream`}
                >
                  Open {c.client.name} overview →
                </Link>
              </div>
              <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4 border-t border-line pt-5">
                <div>
                  <p className="lbl">Updates this week</p>
                  <p className="mt-1.5 text-[30px] font-light">
                    {t.submitted} <span className="text-[16px]">of {t.inReport}</span>
                  </p>
                </div>
                <div>
                  <p className="lbl">Delivery RAG</p>
                  <div className="mt-3">
                    <RagBar counts={t.rag} height={10} subject={`${c.client.name} Delivery RAG`} />
                  </div>
                </div>
                <div>
                  <p className="lbl">Open risks</p>
                  <p className="mt-1.5 text-[30px] font-light">
                    {t.risks}{" "}
                    <Delta now={t.risks} prev={t.risksPrev} className="text-[14px] font-medium" />
                  </p>
                </div>
                <div>
                  <p className="lbl">Open issues</p>
                  <p className="mt-1.5 text-[30px] font-light">
                    {t.issues}{" "}
                    <Delta now={t.issues} prev={t.issuesPrev} className="text-[14px] font-medium" />
                  </p>
                </div>
                <div>
                  <p className="lbl">Over budget</p>
                  <p className="mt-1.5 text-[30px] font-light text-overspend">{t.spend.over100}</p>
                </div>
              </div>
              <nav
                aria-label={`${c.client.name} workstreams`}
                className="mt-5 flex flex-wrap gap-2"
              >
                {c.workstreams.map((w) => {
                  const all = w.tiles.submitted === w.tiles.inReport;
                  return (
                    <Link
                      key={w.workstream.id}
                      href={`/clients/${c.client.id}/workstreams/${w.workstream.id}`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-navy px-4 text-[14px] no-underline"
                    >
                      {w.workstream.name}
                      <span className="text-[12px] text-muted">
                        {all
                          ? "all updated"
                          : `${w.tiles.submitted} of ${w.tiles.inReport} updated`}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </article>
            <p className="mt-3 text-[13px] text-muted">
              A client appears here once its first spend file has been uploaded and at least one
              workstream is set to Reported.
            </p>
          </section>
        </div>

        <aside
          aria-label="This week and admin"
          className="flex min-w-0 flex-[1_1_340px] flex-col gap-4"
        >
          <Card labelledBy="week-h" className="!p-6">
            <h2 id="week-h" className="lbl mb-4">
              This week
            </h2>
            <ol className="grid gap-3.5">
              {steps.map((s) => (
                <li key={s.title} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`inline-flex size-6 flex-none items-center justify-center rounded-full text-[13px] font-medium ${s.done ? "bg-navy text-cream" : "border-2 border-navy"}`}
                  >
                    {s.done ? "✓" : ""}
                  </span>
                  <div>
                    <p className="text-[14px] font-medium">
                      {s.title}
                      <span className="sr-only">{s.done ? " (done)" : " (to do)"}</span>
                    </p>
                    <p className="mt-0.5 text-[13px] text-muted">{s.when}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <section aria-labelledby="adm-h" className="bg-navy p-6 text-cream">
            <h2 id="adm-h" className="mb-3 text-[13px] font-medium tracking-[0.1em] uppercase">
              Spend uploads
            </h2>
            <div className="text-[14px] leading-relaxed">
              {upload ? (
                <>
                  <p>
                    Latest {c.client.name} upload:{" "}
                    <strong className="font-medium">{formatDateTime(upload.uploadedAt)}</strong>
                  </p>
                  <p>
                    {upload.rowCount} records · {upload.missingCount ?? 0} missing from file ·{" "}
                    {upload.errorCount} errors
                  </p>
                </>
              ) : (
                <p>No upload yet.</p>
              )}
              <p>Next upload due by {formatWeekdayDayMonth(nextMonday)}</p>
            </div>
            <Link
              href="/admin/uploads"
              className={`${linkBtn} mt-4 border border-cream text-cream hover:text-cream`}
            >
              Go to spend uploads →
            </Link>
          </section>

          <Card labelledBy="users-h" className="!p-6">
            <h2 id="users-h" className="lbl mb-3">
              Users and access
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[30px] font-light">{v.users.admins}</p>
                <p className="text-[13px]">Admin</p>
              </div>
              <div>
                <p className="text-[30px] font-light">{v.users.updaters}</p>
                <p className="text-[13px]">Updaters (PMs and Account Directors)</p>
              </div>
            </div>
            <p className="mt-3 text-[13px] text-muted">
              {v.users.neverSignedIn} Updaters haven&apos;t signed in yet.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/admin/users" className={`${linkBtn} border border-navy`}>
                Manage users →
              </Link>
              <Link href="/admin/clients" className={`${linkBtn} border border-navy`}>
                Clients
              </Link>
              <Link href="/admin/history" className={`${linkBtn} border border-navy`}>
                Change history
              </Link>
            </div>
          </Card>

          <Card labelledBy="links-h" className="!p-6">
            <h2 id="links-h" className="lbl mb-3">
              Logs
            </h2>
            <div className="grid gap-2">
              <Link
                href={`/clients/${c.client.id}/risks`}
                className="flex min-h-11 items-center justify-between border border-navy px-3.5 text-[14px] no-underline"
              >
                <span>Risk log</span>
                <span className="font-medium">{t.risks} open</span>
              </Link>
              <Link
                href={`/clients/${c.client.id}/issues`}
                className="flex min-h-11 items-center justify-between border border-navy px-3.5 text-[14px] no-underline"
              >
                <span>Issue log</span>
                <span className="font-medium">{t.issues} open</span>
              </Link>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}
