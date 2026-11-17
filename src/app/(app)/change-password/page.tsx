import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/fields";

export const metadata: Metadata = { title: "Change password" };

/** First sign-in password change. Visual only until brief 03. */
export default function ChangePasswordPage() {
  return (
    <>
      <PageHeader
        eyebrow="Your account"
        title="Choose a new password"
        meta="The Admin gave you a temporary password. Choose your own before you continue."
      />
      <form aria-label="Change password" className="mt-6 grid max-w-[420px] gap-5 bg-white p-7">
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 12 characters."
        />
        <TextField label="Confirm new password" type="password" autoComplete="new-password" />
        <Button type="button" disabled>
          Save password
        </Button>
        <p className="text-[13px] text-muted">This works once sign-in is built (brief 03).</p>
      </form>
    </>
  );
}
