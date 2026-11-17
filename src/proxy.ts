/**
 * DEV ROLE SWITCH (brief 01 only; replaced by NextAuth in brief 03).
 * `?as=admin` or `?as=updater` on any URL sets a cookie standing in for the session and sends
 * the user to their landing page. `/login?signout=1` clears it. The data behind it is synthetic or
 * approved by the Admin for use on the site (decision log, 17 Nov 2026).
 */
import { NextResponse, type NextRequest } from "next/server";
import { DEV_ROLE_COOKIE } from "@/lib/dev-role";

const LANDING = { admin: "/admin", updater: "/clients" } as const;

export function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const as = url.searchParams.get("as");
  if (as === "admin" || as === "updater") {
    const res = NextResponse.redirect(new URL(LANDING[as], request.url));
    res.cookies.set(DEV_ROLE_COOKIE, as.toUpperCase(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60,
    });
    return res;
  }
  if (url.pathname === "/login" && url.searchParams.has("signout")) {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.delete(DEV_ROLE_COOKIE);
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|fonts/|brand/|favicon.ico).*)"],
};
