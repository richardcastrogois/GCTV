//frontend/src/app/expired/api.ts

import api from "@/utils/api";
import { Client } from "../clients/types";

interface ClientResponse {
  data: Client[];
  total: number;
  page: number;
  limit: number;
}

export const fetchExpiredClients = async (
  page: number,
  limit: number,
  search: string
): Promise<ClientResponse> => {
  try {
    const response = await api.get<ClientResponse>("/api/expired-clients", {
      params: { page, limit, search },
    });
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar clientes expirados:", error);
    throw error;
  }
};

export const reactivateClient = async (
  clientId: number,
  dueDate: string
): Promise<void> => {
  await api.put(`/api/clients/reactivate/${clientId}`, {
    dueDate,
  });
};