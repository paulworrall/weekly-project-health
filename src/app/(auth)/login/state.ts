/** What the sign-in form shows after an attempt. */
export type LoginState =
  | { status: "idle" }
  | { status: "error"; fieldErrors: Record<string, string> }
  | { status: "not-recognised" }
  | { status: "locked"; minutes: number };

export const LOGIN_IDLE: LoginState = { status: "idle" };
