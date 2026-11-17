import bcrypt from "bcryptjs";

const ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS);
}

/** Compares in constant time; with no hash (unknown user) it still spends the same time. */
export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  if (!hash) {
    dummyHash ??= bcrypt.hashSync("no-account-placeholder", ROUNDS);
    await bcrypt.compare(password, dummyHash);
    return false;
  }
  return bcrypt.compare(password, hash);
}

// Made once, so unknown emails take as long to check as known ones.
let dummyHash: string | undefined;
