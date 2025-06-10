// frontend/src/components/DataPreloader.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Loading from "@/components/Loading";
import { useAuth } from "@/hooks/useAuth";
// import https from "https"; // Comentado, pois não é compatível com "use client" no navegador

const preloadData = async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error(
      "Token de autenticação não encontrado. Faça login primeiro."
    );
  }

  const [plans, paymentMethods] = await Promise.all([
    axios.get("https://localhost:3001/api/clients/plans", {
      headers: { Authorization: `Bearer ${token}` },
    }),
    axios.get("https://localhost:3001/api/clients/payment-methods", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);
  return { plans: plans.data, paymentMethods: paymentMethods.data };
};

export default function DataPreloader({
  children,
}: {
  children: React.ReactNode;
}) {
  const { handleUnauthorized } = useAuth();
  const { isLoading, error } = useQuery({
    queryKey: ["preloadData"],
    queryFn: preloadData,
    staleTime: 300000, // 5 minutos
    gcTime: 600000, // 10 minutos
  });

  if (isLoading) return <Loading>Carregando dados iniciais...</Loading>;

  if (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      handleUnauthorized();
    } else if (error instanceof Error && error.message.includes("Token")) {
      // Não faz nada ou exibe uma mensagem, dependendo da lógica do handleUnauthorized
    }
  }

  return <>{children}</>;
}
