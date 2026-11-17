/**
 * Create (or recover) an Admin account (brief 03). Run it in your own terminal:
 *
 *   npm run user:create-admin
 *
 * It asks for the email and name, then prints a temporary password HERE ONLY: it is never saved
 * in plain text, sent anywhere or written to Git. You choose your own password at first sign-in.
 * If the email already has an account, it asks before resetting that account's password and
 * making it an active Admin.
 */
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { temporaryPassword } from "../src/lib/passwords";
import { initialsFor } from "../src/lib/permissions";

config({ path: path.join(process.cwd(), ".env.local"), quiet: true });
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("DIRECT_URL (or DATABASE_URL) is not set in .env.local.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const rl = createInterface({ input: stdin, output: stdout });

try {
  const email = (await rl.question("Work email for the Admin account: ")).trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    throw new Error("That doesn't look like an email address.");
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const answer = await rl.question(
      `${existing.name} already has an account. Reset its password and make it an active Admin? (y/N) `
    );
    if (!/^y(es)?$/i.test(answer.trim())) {
      console.log("Nothing changed.");
      process.exit(0);
    }
  }
  const nameInput = (
    await rl.question(`Your name${existing ? ` [${existing.name}]` : ""}: `)
  ).trim();
  const name = nameInput || existing?.name;
  if (!name) throw new Error("A name is needed.");

  const password = temporaryPassword();
  const passwordHash = await bcrypt.hash(password, 12);
  const data = {
    name,
    initials: initialsFor(name),
    role: "ADMIN" as const,
    passwordHash,
    mustChangePassword: true,
    failedSignInCount: 0,
    lockedUntil: null,
    archivedAt: null,
    archivedById: null,
  };
  const user = await prisma.$transaction(async (tx) => {
    const u = existing
      ? await tx.user.update({ where: { id: existing.id }, data })
      : await tx.user.create({ data: { ...data, email } });
    await tx.auditEvent.create({
      data: {
        userId: null,
        entity: "User",
        entityId: u.id,
        action: existing ? "UPDATE" : "CREATE",
        field: existing ? "password" : "*",
        oldValue: null,
        newValue: existing ? "reset by create-admin script" : `${u.name} (ADMIN)`,
      },
    });
    return u;
  });

  console.log(
    `\n${existing ? "Updated" : "Created"} Admin account for ${user.name} <${user.email}>.`
  );
  console.log(`Temporary password (shown once, not saved anywhere):\n\n    ${password}\n`);
  console.log("Sign in with it, then choose your own password.");
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
} finally {
  rl.close();
  await prisma.$disconnect();
}
