"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/fields";
import { LOGIN_IDLE, type LoginState } from "@/app/(auth)/login/state";
import { fieldErrors, loginSchema } from "@/types/schemas";

/**
 * Sign-in form (brief 03). Checks the fields in the browser first, then posts to the sign-in
 * action, which shows "not recognised" or "locked" (5 failed attempts lock the account for 15
 * minutes). Messages never say whether an email has an account.
 */
export function LoginForm({
  action,
}: {
  action: (prev: LoginState, formData: FormData) => Promise<LoginState>;
}) {
  const [state, formAction, pending] = useActionState(action, LOGIN_IDLE);
  const [show, setShow] = useState(false);
  const [clientErrors, setClientErrors] = useState<Record<string, string> | null>(null);

  const errors = clientErrors ?? (state.status === "error" ? state.fieldErrors : {});

  function check(e: FormEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
      remember: fd.get("remember") === "on",
    });
    // Submit through the action ourselves: a plain form action would clear what was typed.
    e.preventDefault();
    if (!parsed.success) {
      setClientErrors(fieldErrors(parsed.error));
      return;
    }
    setClientErrors(null);
    startTransition(() => formAction(fd));
  }

  const banner =
    !clientErrors && state.status === "not-recognised"
      ? {
          title: "Email or password not recognised.",
          text: "Check both and try again. After 5 failed attempts in a row the account is locked for 15 minutes.",
        }
      : !clientErrors && state.status === "locked"
        ? {
            title: `Account locked for ${state.minutes} ${state.minutes === 1 ? "minute" : "minutes"}.`,
            text: "Too many attempts. Try again later or ask the Admin to unlock your account.",
          }
        : null;

  return (
    <>
      {banner ? (
        <div role="alert" className="mb-5 bg-warning-tint px-4 py-3.5 text-[14px]">
          <p className="font-medium">{banner.title}</p>
          <p className="mt-1">{banner.text}</p>
        </div>
      ) : null}
      <form aria-label="Sign in" noValidate onSubmit={check} className="grid gap-5">
        <TextField
          label="Work email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="name@example.com"
          error={errors.email}
          className="border-navy"
        />
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor="pw" className="lbl">
              Password
            </label>
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-controls="pw"
              aria-pressed={show}
              className="min-h-11 cursor-pointer px-1 text-[13px] underline"
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>
          <input
            id="pw"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "pw-error" : undefined}
            className={`min-h-12 w-full bg-white px-3.5 text-[16px] ${errors.password ? "border-2 border-overspend" : "border border-navy"}`}
          />
          {errors.password ? (
            <p id="pw-error" role="alert" className="text-[14px] font-medium text-overspend">
              {errors.password}
            </p>
          ) : null}
        </div>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-[14px]">
          <input type="checkbox" name="remember" className="size-5 accent-navy" />
          Keep me signed in on this device for 8 hours
        </label>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </>
  );
}
