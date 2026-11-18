import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  // pptxgenjs (brief 07) has optional Node-only requires; load it from node_modules at runtime.
  serverExternalPackages: ["pptxgenjs"],
  experimental: {
    serverActions: { bodySizeLimit: "10mb" }, // default 1MB is too small for real uploads
  },
  // Don't say which framework serves the site.
  poweredByHeader: false,
  // Security headers on every page, file and download (brief 08).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(process.env.NODE_ENV !== "production"),
      },
    ];
  },
};

export default nextConfig;
