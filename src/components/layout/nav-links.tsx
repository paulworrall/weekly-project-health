"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/types/domain";

export interface NavItem {
  label: string;
  /** Where the item goes, given the client being viewed (null outside a client's pages). */
  href: (clientId: string | null) => string;
  /** Whether the item is the current section. */
  current: (pathname: string) => boolean;
}

/** The client in the URL, e.g. "/clients/northwind/risks" → "northwind". */
export function clientInPath(pathname: string): string | null {
  return /^\/clients\/([^/]+)/.exec(pathname)?.[1] ?? null;
}

const inClient = (pathname: string, sub: RegExp) => {
  const id = clientInPath(pathname);
  return !!id && sub.test(pathname.slice(`/clients/${id}`.length));
};

const clients: NavItem = {
  label: "Clients",
  href: () => "/clients",
  current: (p) => p === "/clients" || /^\/clients\/[^/]+$/.test(p),
};
const workstreams: NavItem = {
  label: "Workstreams",
  href: (id) => (id ? `/clients/${id}#workstreams` : "/clients"),
  current: (p) => inClient(p, /^\/workstreams\//) || p.startsWith("/projects/"),
};
const logs: NavItem = {
  label: "Risks and issues",
  href: (id) => (id ? `/clients/${id}/risks` : "/clients"),
  current: (p) => inClient(p, /^\/(risks|issues)$/),
};

/** Nav per role, as in the mockups (Step 0 report §4). */
export const NAV: Record<Role, NavItem[]> = {
  ADMIN: [
    { label: "Admin home", href: () => "/admin", current: (p) => p === "/admin" },
    clients,
    workstreams,
    logs,
    {
      label: "Spend uploads",
      href: () => "/admin/uploads",
      current: (p) => p === "/admin/uploads",
    },
    {
      label: "Users and access",
      href: () => "/admin/users",
      // Also the other admin tables reached from Admin home: Clients and Change history.
      current: (p) => ["/admin/users", "/admin/clients", "/admin/history"].includes(p),
    },
  ],
  UPDATER: [clients, workstreams, logs],
};

export function NavLinks({ role }: { role: Role }) {
  const pathname = usePathname() ?? "";
  const clientId = clientInPath(pathname);
  return (
    <nav aria-label="Main">
      <ul className="flex flex-wrap gap-x-5">
        {NAV[role].map((item) => {
          const on = item.current(pathname);
          return (
            <li key={item.label}>
              <Link
                href={item.href(clientId)}
                aria-current={on ? "page" : undefined}
                className={`flex min-h-11 items-center border-b-2 text-[14px] no-underline hover:text-white hover:underline ${
                  on ? "border-orange" : "border-transparent"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
