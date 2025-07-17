// frontend/src/app/layout.tsx

"use client";

import "./globals.css";
import "./toast.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Inter } from "next/font/google";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import { SearchProvider } from "@/components/SearchContext";
import { useState, useEffect } from "react";

function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    document.title = "PlatinumTV";
  }, []); 

  const routesWithNavbar = ["/dashboard", "/clients", "/expired"];

  const hasNavbar = routesWithNavbar.some((route) =>
    pathname.startsWith(route)
  );

  return (
    <SearchProvider>
      {hasNavbar && <Navbar />}
      <main
        className={`min-h-screen flex flex-col ${hasNavbar ? "pt-16" : ""}`}
      >
        {children}
        <ToastContainer
          position="top-right"
          autoClose={2000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss={false}
          pauseOnHover={false}
          theme="dark"
        />
      </main>
    </SearchProvider>
  );
}

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="pt-BR">
      <body
        className={`${inter.className} min-h-screen w-screen`}
        suppressHydrationWarning={true}
      >
        <QueryClientProvider client={queryClient}>
          <AppContent>{children}</AppContent>
        </QueryClientProvider>
      </body>
    </html>
  );
}
