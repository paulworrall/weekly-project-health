/**
 * Password rules (decision log, 17 Nov 2026): at least 8 characters with an upper-case letter,
 * a lower-case letter, a number and a symbol. Plus temporary passwords that always pass.
 * Hashing (bcrypt) lives in src/server/passwords.ts.
 */
import { randomInt } from "node:crypto";

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export const PASSWORD_RULE =
  "At least 8 characters, with an upper-case letter, a lower-case letter, a number and a symbol.";

/** Problems with a proposed password, as short phrases (empty when it passes). */
export function passwordProblems(password: string, email?: string): string[] {
  const out: string[] = [];
  if (password.length < PASSWORD_MIN) out.push(`at least ${PASSWORD_MIN} characters`);
  if (password.length > PASSWORD_MAX) out.push(`no more than ${PASSWORD_MAX} characters`);
  if (!/[A-Z]/.test(password)) out.push("an upper-case letter");
  if (!/[a-z]/.test(password)) out.push("a lower-case letter");
  if (!/[0-9]/.test(password)) out.push("a number");
  if (!/[^A-Za-z0-9]/.test(password)) out.push("a symbol");
  if (email && password.trim().toLowerCase() === email.trim().toLowerCase())
    out.push("something other than your email");
  return out;
}

/** One field-error sentence, or null when the password passes. */
export function passwordError(password: string, email?: string): string | null {
  const p = passwordProblems(password, email);
  if (!p.length) return null;
  const list = p.length === 1 ? p[0] : `${p.slice(0, -1).join(", ")} and ${p.at(-1)}`;
  return `The password needs ${list}.`;
}

// No look-alike characters (0/O, 1/l/I) so it can be read out or typed from a note.
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGIT = "23456789";
const SYMBOL = "!@#$%*?-+=";

/** A random temporary password (14 characters) that always meets the rules. */
export function temporaryPassword(length = 14): string {
  const all = UPPER + LOWER + DIGIT + SYMBOL;
  const pick = (set: string) => set[randomInt(set.length)];
  const chars = [pick(UPPER), pick(LOWER), pick(DIGIT), pick(SYMBOL)];
  while (chars.length < length) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
