import path from "node:path";
import { config } from "dotenv";
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

config({ path: path.join(process.cwd(), ".env.local"), quiet: true });

if (typeof window !== "undefined") {
  const { cleanup } = await import("@testing-library/react");
  afterEach(() => cleanup());

  if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList;
  }
}
