/** Auth.js session cookie names: plain on http, `__Secure-` on https; long tokens get `.0`, `.1` … */
const SESSION_COOKIE = /^(__Secure-)?authjs\.session-token(\.\d+)?$/;

export function isSessionCookie(name: string): boolean {
  return SESSION_COOKIE.test(name);
}

/** Whether any of the request's cookies is a session cookie (a quick check, not proof of sign-in). */
export function hasSessionCookie(names: readonly string[]): boolean {
  return names.some(isSessionCookie);
}
