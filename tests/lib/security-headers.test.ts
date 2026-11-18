/** Brief 08: the security headers every response carries. */
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { contentSecurityPolicy, securityHeaders } from "@/lib/security-headers";

describe("security headers", () => {
  it("are applied to every path", async () => {
    const rules = await nextConfig.headers!();
    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe("/:path*");
    const keys = rules[0].headers.map((h) => h.key);
    for (const k of [
      "Content-Security-Policy",
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
      "Strict-Transport-Security",
    ])
      expect(keys).toContain(k);
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it("only allow this site's own content and never framing", () => {
    const csp = contentSecurityPolicy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toMatch(/https?:\/\//); // no outside hosts
    expect(contentSecurityPolicy(true)).toContain("'unsafe-eval'");
    const h = Object.fromEntries(securityHeaders().map((x) => [x.key, x.value]));
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
  });
});
