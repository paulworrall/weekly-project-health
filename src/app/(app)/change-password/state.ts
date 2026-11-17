export type ChangePasswordState =
  { status: "idle" } | { status: "error"; fieldErrors: Record<string, string> };

export const CHANGE_PASSWORD_IDLE: ChangePasswordState = { status: "idle" };
