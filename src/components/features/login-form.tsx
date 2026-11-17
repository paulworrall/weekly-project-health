"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/fields";
import { fieldErrors, loginSchema } from "@/types/schemas";

const MAX_ATTEMPTS = 5;

/**
 * Sign-in form. Brief 01: validates fields and shows the "not recognised / attempts left /
 * locked" states, but no account can sign in yet (NextAuth arrives in brief 03).
 */
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState(0);

  const locked = failed >= MAX_ATTEMPTS;

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password, remember });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    if (!locked) setFailed((n) => n + 1);
  }

  return (
    <>
      {failed > 0 ? (
        <div role="alert" className="mb-5 bg-warning-tint px-4 py-3.5 text-[14px]">
          <p className="font-medium">
            {locked ? "Account locked for 15 minutes." : "Email or password not recognised."}
          </p>
          <p className="mt-1">
            {locked
              ? "Too many attempts. Try again later or ask the Admin to unlock your account."
              : `Check both and try again. ${MAX_ATTEMPTS - failed} ${MAX_ATTEMPTS - failed === 1 ? "attempt" : "attempts"} left before the account is locked for 15 minutes.`}
          </p>
        </div>
      ) : null}
      <form aria-label="Sign in" noValidate onSubmit={submit} className="grid gap-5">
        <TextField
          label="Work email"
          type="email"
          autoComplete="username"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
            type={show ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="size-5 accent-navy"
          />
          Keep me signed in on this device for 8 hours
        </label>
        <Button type="submit" size="lg" className="w-full" disabled={locked}>
          Sign in
        </Button>
      </form>
    </>
  );
}
