import Link from "next/link";
import type { Role } from "@/types/domain";
import { signOutAction } from "@/app/(app)/actions";
import { NavLinks } from "./nav-links";

export type { Role };

/** Navy bar: orange dot, app name, role nav, "Signed in as …" and sign out. */
export function AppHeader({ role, userName }: { role: Role; userName: string }) {
  return (
    <header className="bg-navy text-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:bg-white focus:px-3 focus:py-2 focus:text-navy"
      >
        Skip to content
      </a>
      <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2 sm:px-8">
        <Link
          href={role === "ADMIN" ? "/admin" : "/clients"}
          className="flex min-h-11 items-center gap-3 text-[15px] font-medium tracking-[0.02em] no-underline hover:text-white"
        >
          <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-orange" />
          Weekly Project Health
        </Link>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <NavLinks role={role} />
          <p className="text-[14px]">
            Signed in as {role === "ADMIN" ? "Admin" : "Updater"} ({userName})
          </p>
          <Link
            href="/change-password"
            className="flex min-h-11 items-center text-[14px] underline underline-offset-2 hover:text-white"
          >
            Change password
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex min-h-11 cursor-pointer items-center text-[14px] underline underline-offset-2"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
