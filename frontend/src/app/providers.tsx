// src/app/providers.tsx (ou onde você declarou o HeroUIProvider)
"use client";

import React from "react";
import { HeroUIProvider } from "@heroui/react";
import { useRouter } from "next/navigation";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <HeroUIProvider navigate={router.push} locale="pt-BR">
      {children}
      <Toaster position="top-right" />
    </HeroUIProvider>
  );
}
