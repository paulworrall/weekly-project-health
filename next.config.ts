import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "10mb" }, // default 1MB is too small for real uploads
  },
};

export default nextConfig;
