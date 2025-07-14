"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/utils/api";
import { useAuth } from "@/hooks/useAuth";
import { AxiosError } from "axios";

const preloadData = async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    return null;
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
  const { token, handleUnauthorized } = useAuth();

  const { error } = useQuery({
    queryKey: ["preloadData"],
    queryFn: preloadData,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    enabled: !!token,
  });

  // Trata o erro de autenticação de forma silenciosa, se ocorrer.
  if (error) {
    if (error instanceof AxiosError && error.response?.status === 401) {
      handleUnauthorized();
    } else {
      console.error("Erro ao pré-carregar dados:", error);
    }
  }

  // O componente não bloqueia mais a renderização.
  return <>{children}</>;
}
