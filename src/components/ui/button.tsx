import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

export type ButtonVariant =
  "primary" | "secondary" | "ghost" | "danger" | "onNavy" | "onNavyOutline";
export type ButtonSize = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium no-underline rounded-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-navy text-white border border-navy hover:bg-[#1a1a6b] hover:text-white",
  secondary: "bg-white text-navy border border-navy hover:bg-cream hover:text-navy",
  /** Dashed "Clear" button. */
  ghost:
    "bg-transparent text-navy border border-dashed border-line-strong hover:bg-white hover:text-navy",
  /** Destructive actions (archive). Outline, never a red fill. */
  danger: "bg-white text-blocker border border-blocker hover:bg-rag-red/30 hover:text-blocker",
  onNavy: "bg-white text-navy border border-white hover:bg-cream hover:text-navy",
  onNavyOutline: "bg-transparent text-white border border-white hover:bg-white/10 hover:text-white",
};

const sizes: Record<ButtonSize, string> = {
  md: "min-h-11 px-4 text-[14px]",
  lg: "min-h-12 px-5 text-[15px]",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra = ""
) {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...rest} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize };

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...rest} />;
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  size?: 36 | 40 | 44;
};

/** Square icon button; `label` becomes the accessible name. */
export function IconButton({
  label,
  size = 44,
  className = "",
  type = "button",
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center rounded-none border border-line bg-white text-navy hover:border-navy ${className}`}
      style={{ width: size, height: size }}
      {...rest}
    >
      {children}
    </button>
  );
}
