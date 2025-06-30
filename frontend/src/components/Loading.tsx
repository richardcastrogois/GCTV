//frontend/src/components/Loading.tsx

"use client";

import { ReactNode } from "react";

export default function Loading({ children }: { children?: ReactNode }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-50">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      {children && <div className="mt-4 text-white">{children}</div>}
    </div>
  );
}
