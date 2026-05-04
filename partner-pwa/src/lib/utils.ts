import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { env } from "@/lib/env";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function resolveAssetUrl(path?: string | null) {
  if (!path) {
    return "";
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (path.startsWith("/")) {
    return `${env.publicUrl}${path}`;
  }

  return `${env.publicUrl}/${path}`;
}

export function currency(value?: number | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function formatDate(value?: string | null) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function sumOrderValue(items: { price: number; quantity: number }[]) {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}
