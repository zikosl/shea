import type { NextConfig } from "next";
import path from "node:path";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/store";

const nextConfig: NextConfig = {
  output: "standalone",
  basePath,
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "backend",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
