/**
 * Guard (CLAUDE.md §11, brief 01 acceptance): no real client, workstream or person names in the
 * code, mocks or tests. The mockups in docs/design/mockups contain real names; they must never be
 * copied in. Add to this list if new real names appear in source material.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const BANNED = [
  /\bTCCC\b/,
  /Coca[- ]?Cola/i,
  /\bJosefine\b/,
  /\bMette\b/,
  /\bNadine\b/,
  /\bSophiaASD\b/,
  /\bOpenX\b/,
  /\bPICOS\b/,
  /Paul Worrall/i,
  /@es\.wpp\.com/i,
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) return name === "generated" ? [] : files(p);
    return /\.(ts|tsx|css|json)$/.test(name) ? [p] : [];
  });
}

describe("no real names", () => {
  const root = process.cwd();
  const all = [...files(path.join(root, "src")), ...files(path.join(root, "tests"))].filter(
    (f) => !f.endsWith("no-real-names.test.ts")
  );

  it("finds files to check", () => {
    expect(all.length).toBeGreaterThan(20);
  });

  it("keeps real names out of code, mocks and tests", () => {
    const hits: string[] = [];
    for (const f of all) {
      const text = readFileSync(f, "utf8");
      for (const re of BANNED) if (re.test(text)) hits.push(`${path.relative(root, f)}: ${re}`);
    }
    expect(hits).toEqual([]);
  });
});
