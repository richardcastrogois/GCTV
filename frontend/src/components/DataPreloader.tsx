// frontend/src/components/DataPreloader.tsx

"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Loading from "@/components/Loading";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";

const preloadData = async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error(
      "Token de autenticação não encontrado. Faça login primeiro."
    );
  }

  const [plans, paymentMethods] = await Promise.all([
    axios.get(process.env.NEXT_PUBLIC_API_URL + "/api/clients/plans", {
      headers: { Authorization: `Bearer ${token}` },
    }),
    axios.get(
      process.env.NEXT_PUBLIC_API_URL + "/api/clients/payment-methods",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    ),
  ]);
  return { plans: plans.data, paymentMethods: paymentMethods.data };
};

export default function DataPreloader({
  children,
}: {
  children: React.ReactNode;
}) {
  const { handleUnauthorized, token } = useAuth(); // Adicionado token para controle
  const [isReady, setIsReady] = useState(false); // Estado para controlar o carregamento

  // Garante que o carregamento só ocorra após o token estar disponível
  useEffect(() => {
    if (token) {
      setIsReady(true);
    }
  }, [token]);

  const { isLoading, error } = useQuery({
    queryKey: ["preloadData"],
    queryFn: preloadData,
    staleTime: 600000, // Aumentado para 10 minutos
    gcTime: 1200000, // Aumentado para 20 minutos
    retry: 1, // Uma tentativa apenas
    retryDelay: 2000, // 2 segundos de delay
    enabled: isReady, // Só executa a query quando isReady for true
  });

  if (isLoading) return <Loading>Carregando dados iniciais...</Loading>;

  if (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      handleUnauthorized();
    } else if (error instanceof Error && error.message.includes("Token")) {
      // Não faz nada ou exibe uma mensagem
    } else {
      console.error("Erro ao carregar dados:", error);
    }
  }

  return <>{children}</>;
}