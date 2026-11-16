import { AppHeader } from "@/components/layout/app-header";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { RagBadge } from "@/components/ui/rag-badge";
import { StatTile } from "@/components/ui/stat-tile";
import { RAG_VALUES } from "@/lib/rag";

/**
 * Start page placeholder (brief 00): renders the shell so the design system can be checked.
 * The role is hard-coded until auth arrives in brief 03. No real data here.
 */
export default function Home() {
  return (
    <>
      <AppHeader role="ADMIN" userName="Sample Admin" currentHref="/admin" />
      <main id="main" className="mx-auto flex max-w-[1440px] flex-col gap-8 px-10 py-8">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Scaffold" }]} />
        <PageHeader
          eyebrow="Week 47 · 16–20 Nov 2026"
          title="Weekly Project Health"
          meta="Scaffold only. Screens arrive in brief 01."
          internal
          actions={
            <>
              <Button variant="secondary">Secondary</Button>
              <Button>Primary</Button>
            </>
          }
        />
        <section aria-labelledby="tiles" className="flex flex-col gap-4">
          <h2 id="tiles" className="lbl">
            Sample tiles
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile label="In weekly report" value="12" sub="Sample value" variant="navy" />
            <StatTile label="Updates submitted" value="9" sub="of 12 this week" />
            <StatTile label="Open risks" value="4" sub="Sample value" />
          </div>
        </section>
        <section aria-labelledby="rag" className="flex flex-col gap-4">
          <h2 id="rag" className="lbl">
            Delivery RAG
          </h2>
          <ul className="flex flex-wrap gap-3">
            {RAG_VALUES.map((r) => (
              <li key={r}>
                <RagBadge rag={r} />
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
