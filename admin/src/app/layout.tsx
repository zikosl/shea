import type { Metadata } from "next";
import NextTopLoader from 'nextjs-toploader';

import { ThemeProvider } from "@/providers/theme-provider";

import { cn } from "@/lib/utils"
import AuthProvider from "@/context/auth";

import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from "@/components/ui/sonner"

import { NuqsAdapter } from 'nuqs/adapters/next/app'

import "./globals.css";

export const metadata: Metadata = {
  title: "Shea",
  description: "Shea For You",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning className="scroll-smooth">
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased"
      )}>
        <NextTopLoader showSpinner={false} />
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <AuthProvider>
              <NuqsAdapter>
                {children}
              </NuqsAdapter>
              <Toaster />
              <Sonner />
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
