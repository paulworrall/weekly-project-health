import Link from "next/link";

export type Role = "ADMIN" | "UPDATER";

export interface NavItem {
  label: string;
  href: string;
}

/**
 * Nav per role (brief 00 step 7). Routes follow CLAUDE.md §9; the screens behind them arrive in
 * brief 01, and links that need a client id point at the client landing until then.
 */
export const NAV: Record<Role, NavItem[]> = {
  ADMIN: [
    { label: "Admin home", href: "/admin" },
    { label: "Clients", href: "/admin/clients" },
    { label: "Risks and issues", href: "/clients" },
    { label: "Spend uploads", href: "/admin/uploads" },
    { label: "Users", href: "/admin/users" },
  ],
  UPDATER: [
    { label: "Clients", href: "/clients" },
    { label: "Workstreams", href: "/clients" },
    { label: "Risks and issues", href: "/clients" },
  ],
};

/** Navy bar: orange dot, app name, role nav and "Signed in as …". */
export function AppHeader({
  role,
  userName,
  currentHref,
}: {
  role: Role;
  userName: string;
  currentHref?: string;
}) {
  return (
    <header className="bg-navy text-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:bg-white focus:px-3 focus:py-2 focus:text-navy"
      >
        Skip to content
      </a>
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-8 gap-y-2 px-10 py-3">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-3 text-[18px] font-medium no-underline hover:text-white"
        >
          <span aria-hidden="true" className="inline-block size-3 rounded-full bg-orange" />
          Weekly Project Health
        </Link>
        <nav aria-label="Main" className="flex flex-1 flex-wrap items-center">
          <ul className="flex flex-wrap">
            {NAV[role].map((item) => {
              const current = item.href === currentHref;
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={`flex min-h-11 items-center border-b-2 px-3 text-[15px] no-underline hover:text-white hover:underline ${
                      current ? "border-orange font-medium" : "border-transparent"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <p className="text-[14px]">
          Signed in as <span className="font-medium">{userName}</span>
        </p>
      </div>
    </header>
  );
}
