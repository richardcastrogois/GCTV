"use client";

import { NewpageFiltersProvider } from "./components/NewpageFiltersContext";

export default function NewpageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NewpageFiltersProvider>{children}</NewpageFiltersProvider>;
}
