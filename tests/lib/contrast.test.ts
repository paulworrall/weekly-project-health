/**
 * Brief 08: WCAG 2.2 AA colour contrast for the text and background pairs the site uses, read
 * from the colour tokens in src/app/globals.css (so a token change that breaks contrast fails
 * here). Normal text needs 4.5:1; borders that show a control's edge need 3:1.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
const root = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));

function token(name: string): string {
  const m = root.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`No colour token --${name}`);
  return m[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const SURFACES = [
  "white",
  "cream",
  "pinned",
  "warning-tint",
  "success-tint",
  "line-soft",
  "tint",
] as const;

describe("colour contrast (WCAG AA)", () => {
  it("the calculation matches known values", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });

  it.each(["navy", "muted", "overspend", "blocker"])(
    "%s text is readable on every light surface",
    (text) => {
      for (const bg of SURFACES) {
        const ratio = contrast(token(text), token(bg));
        expect(ratio, `${text} on ${bg}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      }
    }
  );

  // The dark orange (eyebrow labels and field error messages) only sits on these surfaces; it is
  // too light for the warning and grey tints (about 4.2:1), so it must never be used on them.
  it("eyebrow orange is readable where it is used", () => {
    for (const bg of ["white", "cream", "pinned", "tint", "success-tint"]) {
      const ratio = contrast(token("eyebrow"), token(bg));
      expect(ratio, `eyebrow on ${bg}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(token("eyebrow"), token("warning-tint"))).toBeLessThan(4.5);
  });

  it("Navy text is readable on every Delivery RAG fill", () => {
    for (const fill of ["rag-green", "rag-amber", "rag-red"]) {
      expect(contrast(token("navy"), token(fill))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("white text is readable on Navy and on the Blocker red", () => {
    expect(contrast(token("white"), token("navy"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token("white"), token("blocker"))).toBeGreaterThanOrEqual(4.5);
  });

  it("Orange is never readable small text on Cream (so the eyebrow colour is used instead)", () => {
    expect(contrast(token("orange"), token("cream"))).toBeLessThan(4.5);
    expect(contrast(token("eyebrow"), token("cream"))).toBeGreaterThanOrEqual(4.5);
  });

  it("control borders stand out from white and cream (3:1)", () => {
    for (const border of ["navy", "line-strong"]) {
      for (const bg of ["white", "cream"]) {
        expect(contrast(token(border), token(bg))).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
