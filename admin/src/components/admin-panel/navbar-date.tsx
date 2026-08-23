"use client";

import { useSyncExternalStore } from "react";

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);

const subscribe = () => () => {};

export function NavbarDate() {
  const today = useSyncExternalStore(
    subscribe,
    () => formatDate(new Date()),
    () => "Today",
  );

  return <span>{today}</span>;
}
