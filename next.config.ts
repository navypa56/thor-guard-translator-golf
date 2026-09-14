import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Next's build boundary on this project when it lives inside a larger
  // folder that may contain unrelated lockfiles.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
