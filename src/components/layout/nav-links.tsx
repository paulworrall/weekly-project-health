"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  label: string;
  href: string;
  /** Path prefixes that make this item current. */
  match: string[];
  /** The first match must be the exact path (others are prefixes). */
  exact?: boolean;
}

export function isCurrent(item: NavItem, pathname: string): boolean {
  return item.match.some((m, i) =>
    item.exact && i === 0 ? pathname === m : pathname === m || pathname.startsWith(`${m}/`)
  );
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname() ?? "";
  // The most specific match wins, so "/admin/uploads" doesn't also light up "Admin home".
  const current = items
    .filter((i) => isCurrent(i, pathname))
    .sort(
      (a, b) =>
        Math.max(...b.match.map((m) => m.length)) - Math.max(...a.match.map((m) => m.length))
    )[0];
  return (
    <nav aria-label="Main">
      <ul className="flex flex-wrap gap-x-5">
        {items.map((item) => {
          const on = item === current;
          return (
            <li key={item.label}>
              <Link
                href={item.href}
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
