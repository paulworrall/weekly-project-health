import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pptxgenjs (brief 07) has optional Node-only requires; load it from node_modules at runtime.
  serverExternalPackages: ["pptxgenjs"],
  experimental: {
    serverActions: { bodySizeLimit: "10mb" }, // default 1MB is too small for real uploads
  },
};

export default nextConfig;
