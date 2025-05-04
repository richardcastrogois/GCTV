"use client";

import "./globals.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Inter } from "next/font/google";
import { usePathname } from "next/navigation"; // Importar usePathname

const inter = Inter({ subsets: ["latin"] });

const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname(); // Obter a rota atual

  // Definir as rotas onde a Navbar estará presente
  const routesWithNavbar = [
    "/dashboard",
    "/clients",
    "/expired",
    "/clients/new",
  ];
  const hasNavbar = routesWithNavbar.some(
    (route) => pathname === route || pathname.startsWith(route)
  );

  return (
    <html lang="pt-BR">
      <body
        className={`${inter.className} min-h-screen w-screen`}
        suppressHydrationWarning={true}
      >
        <QueryClientProvider client={queryClient}>
          <main
            className={`min-h-screen flex flex-col ${hasNavbar ? "pt-16" : ""}`}
          >
            {children}
            <ToastContainer position="top-right" autoClose={3000} />
          </main>
        </QueryClientProvider>
      </body>
    </html>
  );
}
