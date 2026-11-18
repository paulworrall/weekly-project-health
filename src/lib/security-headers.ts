/**
 * Brief 08: HTTP security headers sent with every response (next.config.ts). Pure, so the tests
 * can check them.
 *
 * The content security policy allows only this site's own scripts, styles, fonts and images.
 * Next.js adds small inline scripts to every page, so scripts allow 'unsafe-inline' (a nonce-based
 * policy would need every page to be rendered per request with a nonce; not worth it for an
 * internal tool behind sign-in). Development also needs 'unsafe-eval' for fast refresh.
 */
export function contentSecurityPolicy(dev = false): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${dev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function securityHeaders(dev = false): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(dev) },
    // Never shown inside another site's frame (also covered by frame-ancestors above).
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    },
    // HTTPS only, for two years (Vercel serves HTTPS; browsers ignore this on localhost http).
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}
