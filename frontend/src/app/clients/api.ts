//frontend/src/app/clients/page.tsx

import api from "@/utils/api";
import { Client, Plan, PaymentMethod } from "./types";

export const fetchPlans = async (): Promise<Plan[]> => {
  const response = await api.get("/api/clients/plans");
  return response.data;
};

export const fetchPaymentMethods = async (): Promise<PaymentMethod[]> => {
  const response = await api.get("/api/clients/payment-methods");
  return response.data;
};

export const fetchClients = async (
  page: number,
  limit: number,
  search: string
): Promise<{ data: Client[]; total: number; page: number; limit: number }> => {
  const response = await api.get("/api/clients", {
    params: { page, limit, search },
  });
  return response.data;
};

export const deleteClient = async (id: number): Promise<void> => {
  await api.delete(`/api/clients/${id}`);
};

export const updateClient = async (
  id: number,
  data: {
    fullName: string;
    email: string;
    phone: string | null;
    planId: number;
    paymentMethodId: number;
    dueDate: string;
    grossAmount: number;
    isActive: boolean;
  }
): Promise<Client> => {
  const response = await api.put(`/api/clients/${id}`, data);
  return response.data;
};

export const deletePaymentMethod = async (id: number): Promise<void> => {
  await api.delete(`/api/clients/payment-methods/${id}`);
};

export const deletePlan = async (id: number): Promise<void> => {
  await api.delete(`/api/clients/plans/${id}`);
};

export const renewClient = async (
  id: number,
  dueDate: string
): Promise<Client> => {
  const response = await api.put(`/api/clients/renew/${id}`, { dueDate });
  return response.data;
};
