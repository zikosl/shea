"use client";

import { useEffect, useState } from "react";

export function useHasMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  return mounted;
}
