//frontend/src/app/clients/api.ts

import api from "@/utils/api";
// ***** ALTERAÇÃO IMPORTANTE: Importar tipos do local global/principal *****
import { Client, Plan, PaymentMethod, EditFormData } from "@/types/client";

export const fetchPlans = async (): Promise<Plan[]> => {
  const response = await api.get<Plan[]>("/api/clients/plans");
  return response.data;
};

export const fetchPaymentMethods = async (): Promise<PaymentMethod[]> => {
  const response = await api.get<PaymentMethod[]>(
    "/api/clients/payment-methods"
  );
  return response.data;
};

export const fetchClients = async (
  page: number,
  limit: number,
  search: string
): Promise<{ data: Client[]; total: number; page: number; limit: number }> => {
  const response = await api.get<{
    data: Client[];
    total: number;
    page: number;
    limit: number;
  }>("/api/clients", {
    params: { page, limit, search },
  });
  return response.data;
};

export const deleteClient = async (id: number): Promise<void> => {
  await api.delete(`/api/clients/${id}`);
};

export const updateClient = async (
  id: number,
  data: EditFormData
): Promise<Client> => {
  const response = await api.put<Client>(`/api/clients/${id}`, data);
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
  const response = await api.put<Client>(`/api/clients/renew/${id}`, {
    dueDate,
  });
  return response.data;
};

export const updateClientObservations = async (
  id: number,
  observations: string
): Promise<Client> => {
  const response = await api.put<Client>(`/api/clients/observations/${id}`, {
    observations,
  });
  return response.data;
};

export const updateClientVisualPaymentStatus = async (
  clientId: number,
  status: boolean
): Promise<Client> => {
  try {
    const response = await api.put<Client>(
      `/api/clients/visual-payment-status/${clientId}`,
      { status }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Erro ao atualizar status visual de pagamento no frontend API:",
      error
    );
    throw error;
  }
};