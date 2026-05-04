import { env } from "@/lib/env";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shea Partner PWA",
    short_name: "Shea Partner",
    description: "Offline-first partner console for orders, catalog publishing, and profile operations.",
    start_url: `${env.basePath}/dashboard`,
    display: "standalone",
    background_color: "#f8f4f1",
    theme_color: "#d98fa0",
    icons: [
      {
        src: `${env.basePath}/icon-app.svg`,
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
