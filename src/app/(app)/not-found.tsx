import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { StatusPanel } from "@/components/features/status-page";

export const metadata: Metadata = { title: "Page not found" };

/** Brief 08: an unknown client, workstream, project or log inside the signed-in area. */
export default function NotFound() {
  return (
    <StatusPanel
      eyebrow="Not found"
      title="Page not found"
      actions={<ButtonLink href="/">Go to your start page</ButtonLink>}
    >
      <p>The page may have moved, or the link may be wrong or out of date.</p>
      <p>If you followed a link from inside the tool, tell the Admin which page it was on.</p>
    </StatusPanel>
  );
}
