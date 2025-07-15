// frontend/src/hooks/usePreloadedData.ts

import { useQuery } from "@tanstack/react-query";
import { fetchPlans, fetchPaymentMethods } from "@/app/clients/api";
import { Plan, PaymentMethod } from "@/types/client";

interface PreloadedData {
  plans: Plan[];
  paymentMethods: PaymentMethod[];
}

const preloadFn = async (): Promise<PreloadedData> => {
  const [plans, paymentMethods] = await Promise.all([
    fetchPlans(),
    fetchPaymentMethods(),
  ]);
  return { plans, paymentMethods };
};

export const usePreloadedData = () => {
  return useQuery<PreloadedData>({
    queryKey: ["preloadData"],
    queryFn: preloadFn,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
};
