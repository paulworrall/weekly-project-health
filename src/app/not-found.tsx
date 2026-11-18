import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { BrandBar, StatusPanel } from "@/components/features/status-page";

export const metadata: Metadata = { title: "Page not found" };

/** Brief 08: an address that doesn't exist. */
export default function NotFound() {
  return (
    <>
      <BrandBar />
      <main id="main" className="mx-auto max-w-[1360px] px-4 pt-6 pb-12 sm:px-8">
        <StatusPanel
          eyebrow="Not found"
          title="Page not found"
          actions={<ButtonLink href="/">Go to your start page</ButtonLink>}
        >
          <p>The page may have moved, or the link may be wrong or out of date.</p>
          <p>If you followed a link from inside the tool, tell the Admin which page it was on.</p>
        </StatusPanel>
      </main>
    </>
  );
}
