import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  // Deliberate demo defect: approved production policy requires this header.
  async headers() { return []; }
};
export default nextConfig;
