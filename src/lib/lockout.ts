/**
 * Sign-in lockout (CLAUDE.md §6): 5 failed attempts lock the account for 15 minutes. Pure: the
 * sign-in action reads the user, calls these, and writes the result back.
 */

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

export interface LockState {
  failedSignInCount: number;
  lockedUntil: Date | null;
}

export function isLocked(state: LockState, now: Date): boolean {
  return !!state.lockedUntil && state.lockedUntil.getTime() > now.getTime();
}

/** After a wrong password: count it, and lock once the limit is reached (the count restarts). */
export function afterFailure(state: LockState, now: Date): LockState {
  const count = (isLocked(state, now) ? 0 : state.failedSignInCount) + 1;
  if (count >= MAX_FAILED_ATTEMPTS) {
    return { failedSignInCount: 0, lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60_000) };
  }
  return { failedSignInCount: count, lockedUntil: null };
}

/** After a correct password: clear the count and any expired lock. */
export function afterSuccess(): LockState {
  return { failedSignInCount: 0, lockedUntil: null };
}

/** Whole minutes left on a lock (at least 1 while locked). */
export function minutesLeft(state: LockState, now: Date): number {
  if (!isLocked(state, now)) return 0;
  return Math.max(1, Math.ceil(((state.lockedUntil as Date).getTime() - now.getTime()) / 60_000));
}
