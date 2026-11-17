/** Change on a previous figure: "▲ +2", "▼ −1", "No change", plus screen-reader text. */

/** Visible text. Uses a true minus sign. */
export function deltaText(now: number, prev: number): string {
  const d = now - prev;
  if (d > 0) return `▲ +${d}`;
  if (d < 0) return `▼ −${Math.abs(d)}`;
  return "No change";
}

/** Screen-reader text, e.g. "up 2 on last week", "down 1 on 4 weeks ago", "no change on last week". */
export function deltaSrText(now: number, prev: number, period = "on last week"): string {
  const d = now - prev;
  if (d > 0) return `up ${d} ${period}`;
  if (d < 0) return `down ${Math.abs(d)} ${period}`;
  return `no change ${period}`;
}

/** Percentage-point change with one decimal: "▲ +7.0 pts". */
export function pointsDeltaText(points: number): string {
  if (points > 0) return `▲ +${points.toFixed(1)} pts`;
  if (points < 0) return `▼ −${Math.abs(points).toFixed(1)} pts`;
  return "No change";
}
