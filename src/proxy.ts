/**
 * Quick sign-in check (brief 03): visitors with no session cookie are sent to /login before any
 * page work. Not the lock: every page and Server Action checks the session and permissions itself
 * (CLAUDE.md §5 rule 2).
 */
import { NextResponse, type NextRequest } from "next/server";
import { hasSessionCookie } from "@/lib/session-cookie";

// /api/cron checks its own secret (brief 06), so it isn't sent to the sign-in page.
const PUBLIC = ["/login", "/api/auth", "/api/cron"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`)))
    return NextResponse.next();
  if (hasSessionCookie(request.cookies.getAll().map((c) => c.name))) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/|fonts/|brand/|favicon.ico).*)"],
};
