/**
 * Runs the automatic week close by hand (brief 06): closes any week whose Friday 23:59 has
 * passed and isn't closed yet, then makes sure the open week exists. Does nothing when
 * everything is up to date. Writes to the live database.
 *
 *   npm run week:close
 */
import path from "node:path";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env.local"), quiet: true });
const { closeDueWeeks } = await import("../src/server/close-week");
const { prisma } = await import("../src/lib/prisma");

const r = await closeDueWeeks();
console.log(`Closed: ${r.closed.join(", ") || "nothing due"}. Open week: ${r.open}.`);
await prisma.$disconnect();
