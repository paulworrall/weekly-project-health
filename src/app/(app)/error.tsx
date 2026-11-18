"use client";

import { useEffect, useRef } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { StatusPanel } from "@/components/features/status-page";

/**
 * Brief 08: an unexpected failure while loading a page. Nothing typed is saved by a failed
 * load; "Try again" reloads the page's data. The reference helps match the server log.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const heading = useRef<HTMLDivElement>(null);
  useEffect(() => {
    console.error(error);
    heading.current?.querySelector("h1")?.focus();
  }, [error]);
  return (
    <div ref={heading}>
      <StatusPanel
        eyebrow="Error"
        title="Something went wrong"
        actions={
          <>
            <Button onClick={() => reset()}>Try again</Button>
            <ButtonLink href="/" variant="secondary">
              Go to your start page
            </ButtonLink>
          </>
        }
      >
        <p>The page couldn&apos;t be loaded. Try again in a moment.</p>
        <p>
          If it keeps happening, tell the Admin what you were doing
          {error.digest ? (
            <>
              {" "}
              and quote reference <code className="font-medium">{error.digest}</code>
            </>
          ) : null}
          .
        </p>
      </StatusPanel>
    </div>
  );
}
