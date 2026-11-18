/**
 * Week close endpoint for Vercel Cron (brief 06; schedule in vercel.json). Vercel sends
 * "Authorization: Bearer <CRON_SECRET>"; anything else is refused, and so is every call when
 * CRON_SECRET isn't set. Safe to call more than once: weeks already closed are left alone.
 */
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { closeDueWeeks } from "@/server/close-week";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorised(request.headers.get("authorization")))
    return NextResponse.json({ ok: false, error: "Unauthorised" }, { status: 401 });
  try {
    const result = await closeDueWeeks();
    console.log(`[close-week] closed: ${result.closed.join(", ") || "none"}; open: ${result.open}`);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[close-week] failed", e);
    return NextResponse.json({ ok: false, error: "Close failed" }, { status: 500 });
  }
}
