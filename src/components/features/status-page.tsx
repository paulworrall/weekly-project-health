import type { ReactNode } from "react";

/**
 * Brief 08: the panel used by "Page not found", "Something went wrong" and "You don't have
 * access" pages: eyebrow, h1, text, then actions. The h1 can take focus (the error page moves
 * focus there so screen readers announce it).
 */
export function StatusPanel({
  eyebrow,
  title,
  children,
  actions,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="max-w-[640px] bg-white p-7">
      <p className="eyebrow mb-2.5">{eyebrow}</p>
      <h1 tabIndex={-1} className="text-[32px] font-light focus:outline-none">
        {title}
      </h1>
      <div className="mt-3 space-y-2 text-[15px]">{children}</div>
      <div className="mt-6 flex flex-wrap gap-3">{actions}</div>
    </div>
  );
}

/** Navy brand bar for pages shown outside the app header (no sign-in, or the report pages). */
export function BrandBar() {
  return (
    <header className="bg-navy text-white">
      <div className="mx-auto flex min-h-15 max-w-[1360px] items-center gap-3 px-4 sm:px-8">
        <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-orange" />
        <span className="text-[15px] font-medium tracking-[0.02em]">Weekly Project Health</span>
      </div>
    </header>
  );
}
