"use client";

import { PropsWithChildren } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

import { SWRegister } from "@/components/sw-register";

export function Providers({ children }: PropsWithChildren) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
      <Toaster richColors position="top-right" />
      <SWRegister />
    </ThemeProvider>
  );
}
