"use client";

import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { SearchIcon } from "./icons";

const fieldBase =
  "w-full rounded-none border border-line-strong bg-white px-3.5 text-[16px] text-navy placeholder:text-muted";

export function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1">
      <span className="lbl">{children}</span>
      {hint ? <span className="text-[14px] text-muted">{hint}</span> : null}
    </label>
  );
}

export function FormError({ id, children }: { id?: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="text-[14px] font-medium text-eyebrow">
      {children}
    </p>
  );
}

type Common = { label: ReactNode; hint?: ReactNode; error?: string | null; hideLabel?: boolean };

export function TextField({
  label,
  hint,
  error,
  hideLabel,
  id,
  className = "",
  ...rest
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const fieldId = id ?? auto;
  const errorId = `${fieldId}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <div className={hideLabel ? "sr-only" : ""}>
        <FieldLabel htmlFor={fieldId} hint={hint}>
          {label}
        </FieldLabel>
      </div>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`${fieldBase} min-h-11 ${className}`}
        {...rest}
      />
      <FormError id={errorId}>{error}</FormError>
    </div>
  );
}

export function TextareaField({
  label,
  hint,
  error,
  hideLabel,
  id,
  className = "",
  ...rest
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const fieldId = id ?? auto;
  const errorId = `${fieldId}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <div className={hideLabel ? "sr-only" : ""}>
        <FieldLabel htmlFor={fieldId} hint={hint}>
          {label}
        </FieldLabel>
      </div>
      <textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`${fieldBase} py-2.5 ${className}`}
        {...rest}
      />
      <FormError id={errorId}>{error}</FormError>
    </div>
  );
}

export function SelectField({
  label,
  hint,
  error,
  hideLabel,
  id,
  className = "",
  children,
  ...rest
}: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  const auto = useId();
  const fieldId = id ?? auto;
  const errorId = `${fieldId}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <div className={hideLabel ? "sr-only" : ""}>
        <FieldLabel htmlFor={fieldId} hint={hint}>
          {label}
        </FieldLabel>
      </div>
      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`${fieldBase} min-h-11 cursor-pointer ${className}`}
        {...rest}
      >
        {children}
      </select>
      <FormError id={errorId}>{error}</FormError>
    </div>
  );
}

export function SearchField({
  label,
  className = "",
  ...rest
}: { label: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="lbl">
        {label}
      </label>
      <div className="relative">
        <SearchIcon
          size={18}
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"
        />
        <input id={id} type="search" className={`${fieldBase} min-h-11 pl-10`} {...rest} />
      </div>
    </div>
  );
}
