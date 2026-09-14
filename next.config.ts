import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * `standalone` emits a self-contained server under `.next/standalone`, which
   * is what the desktop build ships and runs on a loopback port. It is inert
   * for ordinary `next start` / hosted deploys.
   */
  output: "standalone",
  images: {
    // Nothing here uses next/image, so the optimizer never runs.
    unoptimized: true,
  },
  // `sharp` is traced in regardless of the flag above; dropping it takes ~46MB
  // of native binaries out of the desktop bundle.
  outputFileTracingExcludes: {
    "*": ["node_modules/@img/**", "node_modules/sharp/**"],
  },
};

export default nextConfig;
