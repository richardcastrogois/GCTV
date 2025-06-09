//frontend/src/components/DataPreloader.tsx

"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Loading from "@/components/Loading";
import { useAuth } from "@/hooks/useAuth";

const preloadData = async () => {
  const [plans, paymentMethods] = await Promise.all([
    axios.get("http://localhost:3001/api/clients/plans", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }),
    axios.get("http://localhost:3001/api/clients/payment-methods", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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
    }
  }

  return <>{children}</>;
}