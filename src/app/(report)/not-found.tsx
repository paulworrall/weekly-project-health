import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { BrandBar, StatusPanel } from "@/components/features/status-page";

export const metadata: Metadata = { title: "Page not found" };

/** Brief 08: a report for an unknown client or a workstream that isn't reported. */
export default function NotFound() {
  return (
    <>
      <BrandBar />
      <main id="main" className="mx-auto max-w-[1360px] px-4 pt-6 pb-12 sm:px-8">
        <StatusPanel
          eyebrow="Not found"
          title="Report not found"
          actions={<ButtonLink href="/">Go to your start page</ButtonLink>}
        >
          <p>The client may have been archived, or the workstream may no longer be reported.</p>
          <p>Open the client or workstream page and choose Generate report from there.</p>
        </StatusPanel>
      </main>
    </>
  );
}
