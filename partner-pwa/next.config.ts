import type { NextConfig } from "next";
import path from "node:path";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/store";
const publicUrl =
  process.env.NEXT_PUBLIC_PUBLIC_URL ||
  (process.env.SHEA_DOMAIN ? `https://${process.env.SHEA_DOMAIN}` : "https://shea.openzey.com");
const publicHostname = new URL(publicUrl).hostname;

const nextConfig: NextConfig = {
  output: "standalone",
  basePath,
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: publicHostname,
      },
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
