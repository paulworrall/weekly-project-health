import { describe, expect, it } from "vitest";
import { RAG, RAG_VALUES, isRag, ragCounts, ragLabel } from "@/lib/rag";

describe("Delivery RAG", () => {
  it("always pairs the colour word with its meaning", () => {
    expect(ragLabel("GREEN")).toBe("Green · On track");
    expect(ragLabel("AMBER")).toBe("Amber · At risk");
    expect(ragLabel("RED")).toBe("Red · Blocked");
  });

  it("lists values in display order and maps each to one token", () => {
    expect(RAG_VALUES).toEqual(["GREEN", "AMBER", "RED"]);
    expect(RAG.GREEN.token).toBe("--rag-green");
    expect(RAG.AMBER.bgClass).toBe("bg-rag-amber");
  });

  it("recognises valid values only", () => {
    expect(isRag("RED")).toBe(true);
    expect(isRag("red")).toBe(false);
    expect(isRag(null)).toBe(false);
  });

  it("counts values, ignoring blanks", () => {
    expect(ragCounts(["GREEN", "GREEN", "RED", null, undefined])).toEqual({
      GREEN: 2,
      AMBER: 0,
      RED: 1,
    });
  });
});
