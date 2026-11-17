import Link from "next/link";
import type { Role } from "@/types/domain";
import { NavLinks, type NavItem } from "./nav-links";

export type { Role };

const CLIENT = "/clients/northwind";

/** Nav per role, as in the mockups (Step 0 report §4). */
export const NAV: Record<Role, NavItem[]> = {
  ADMIN: [
    { label: "Admin home", href: "/admin", match: ["/admin"] },
    { label: "Clients", href: CLIENT, match: [CLIENT, "/admin/clients"], exact: true },
    {
      label: "Workstreams",
      href: `${CLIENT}#workstreams`,
      match: [`${CLIENT}/workstreams`, "/projects"],
    },
    {
      label: "Risks and issues",
      href: `${CLIENT}/risks`,
      match: [`${CLIENT}/risks`, `${CLIENT}/issues`],
    },
    { label: "Spend uploads", href: "/admin/uploads", match: ["/admin/uploads"] },
    { label: "Users and access", href: "/admin/users", match: ["/admin/users", "/admin/history"] },
  ],
  UPDATER: [
    { label: "Clients", href: CLIENT, match: [CLIENT], exact: true },
    {
      label: "Workstreams",
      href: `${CLIENT}#workstreams`,
      match: [`${CLIENT}/workstreams`, "/projects"],
    },
    {
      label: "Risks and issues",
      href: `${CLIENT}/risks`,
      match: [`${CLIENT}/risks`, `${CLIENT}/issues`],
    },
  ],
};

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
          href={role === "ADMIN" ? "/admin" : CLIENT}
          className="flex min-h-11 items-center gap-3 text-[15px] font-medium tracking-[0.02em] no-underline hover:text-white"
        >
          <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-orange" />
          Weekly Project Health
        </Link>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <NavLinks items={NAV[role]} />
          <p className="text-[14px]">
            Signed in as {role === "ADMIN" ? "Admin" : "Updater"} ({userName})
          </p>
          <a
            href="/login?signout=1"
            className="flex min-h-11 items-center text-[14px] underline underline-offset-2 hover:text-white"
          >
            Sign out
          </a>
        </div>
      </div>
    </header>
  );
}
