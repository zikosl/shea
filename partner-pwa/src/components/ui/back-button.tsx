"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

export function BackButton({
  fallbackHref = "/dashboard",
  className,
}: {
  fallbackHref?: string;
  className?: string;
}) {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className={cn("ds-secondary-button inline-flex h-10 w-10 items-center justify-center rounded-full", className)}
      aria-label="Go back"
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}
