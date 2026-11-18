import { ButtonLink } from "@/components/ui/button";
import { StatusPanel } from "./status-page";

/** Shown when a signed-in user opens a page their role can't see. */
export function Forbidden({ backHref }: { backHref: string }) {
  return (
    <StatusPanel
      eyebrow="No access"
      title="You don't have access to this page"
      actions={<ButtonLink href={backHref}>Back to your start page</ButtonLink>}
    >
      <p>It is for the Admin only.</p>
    </StatusPanel>
  );
}
