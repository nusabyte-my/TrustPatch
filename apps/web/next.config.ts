import type { NextConfig } from "next";
import { resolve } from "node:path";
const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingRoot: resolve(process.cwd(), "../..")
};
export default nextConfig;
