// frontend/src/components/DataPreloader.tsx

"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/utils/api";
import LoadingSimple from "@/components/LoadingSimple"; // Substituído por LoadingSimple
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { AxiosError } from "axios";

const preloadData = async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error(
      "Token de autenticação não encontrado. Faça login primeiro."
    );
  }

  const [plans, paymentMethods] = await Promise.all([
    api.get("/api/clients/plans", {
      headers: { Authorization: `Bearer ${token}` },
    }),
    api.get("/api/clients/payment-methods", {
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
  const { handleUnauthorized, token } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (token) {
      setIsReady(true);
    }
  }, [token]);

  const { isLoading, error } = useQuery({
    queryKey: ["preloadData"],
    queryFn: preloadData,
    staleTime: 600000,
    gcTime: 1200000,
    retry: 1,
    retryDelay: 2000,
    enabled: isReady,
  });

  if (isLoading)
    return <LoadingSimple>Carregando dados iniciais...</LoadingSimple>; // Alterado para LoadingSimple

  if (error) {
    if (error instanceof AxiosError && error.response?.status === 401) {
      handleUnauthorized();
    } else if (error instanceof Error && error.message.includes("Token")) {
      // Não faz nada ou exibe uma mensagem
    } else {
      console.error("Erro ao carregar dados:", error);
    }
  }

  return <>{children}</>;
}