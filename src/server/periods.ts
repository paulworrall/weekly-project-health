import type { Prisma } from "@/generated/prisma/client";
import { closesAt, parseWeekParam, weekRange } from "@/lib/week";

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/**
 * The reporting period for an open week, created if it doesn't exist yet (decision 17 Nov):
 * id = the week key ("2026-W48"), Monday–Friday, closing Friday 23:59 London.
 */
export async function ensureOpenPeriod(tx: Prisma.TransactionClient, weekKey: string) {
  const ref = parseWeekParam(weekKey);
  if (!ref) throw new Error(`Invalid week ${weekKey}`);
  const { monday, friday } = weekRange(ref);
  return tx.reportingPeriod.upsert({
    where: { isoYear_isoWeek: { isoYear: ref.isoYear, isoWeek: ref.isoWeek } },
    update: {},
    create: {
      id: weekKey,
      isoYear: ref.isoYear,
      isoWeek: ref.isoWeek,
      startsOn: day(monday),
      endsOn: day(friday),
      closesAt: closesAt(ref),
      state: "OPEN",
    },
  });
}
