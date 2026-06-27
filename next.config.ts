import type { NextConfig } from "next";
import { execSync } from "child_process";

// Resolve build ID at build time: use Vercel's git SHA when deployed, git HEAD locally.
let buildId = "dev";
try {
  buildId =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
    execSync("git rev-parse --short HEAD").toString().trim();
} catch {
  // not a git repo or git not available
}

const nextConfig: NextConfig = {
  env: {
    BUILD_ID: buildId,
  },
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  // Include chromium brotli binaries in the export-pdf function bundle.
  // Without this, Vercel's bundler excludes the binary files from node_modules.
  outputFileTracingIncludes: {
    "/api/export-pdf": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
};

export default nextConfig;
