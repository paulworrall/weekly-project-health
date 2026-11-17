"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/fields";
import { PASSWORD_RULE } from "@/lib/passwords";
import { CHANGE_PASSWORD_IDLE, type ChangePasswordState } from "@/app/(app)/change-password/state";

export function ChangePasswordForm({
  action,
}: {
  action: (prev: ChangePasswordState, formData: FormData) => Promise<ChangePasswordState>;
}) {
  const [state, formAction, pending] = useActionState(action, CHANGE_PASSWORD_IDLE);
  const errors = state.status === "error" ? state.fieldErrors : {};
  return (
    <form
      aria-label="Change password"
      noValidate
      action={formAction}
      className="mt-6 grid max-w-[460px] gap-5 bg-white p-7"
    >
      <TextField
        label="Current or temporary password"
        name="current"
        type="password"
        autoComplete="current-password"
        error={errors.current}
      />
      <TextField
        label="New password"
        name="next"
        type="password"
        autoComplete="new-password"
        hint={PASSWORD_RULE}
        error={errors.next}
      />
      <TextField
        label="New password again"
        name="confirm"
        type="password"
        autoComplete="new-password"
        error={errors.confirm}
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save password"}
      </Button>
    </form>
  );
}
