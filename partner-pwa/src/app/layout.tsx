import type { Metadata } from "next";

import { Providers } from "@/components/providers";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Shea Partner PWA",
  description: "A polished offline-first partner workspace for orders, products, and storefront control.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
