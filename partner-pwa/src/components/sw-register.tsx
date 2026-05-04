"use client";

import { useEffect } from "react";

import { env } from "@/lib/env";

export function SWRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(`${env.basePath}/sw.js`, {
        scope: `${env.basePath}/`,
      }).catch(() => {
        // keep registration failure silent
      });
    }
  }, []);

  return null;
}
