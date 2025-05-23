//frontend/src/app/expired/api.ts

import axios from "axios";
import { Client } from "../clients/types"; // Importando o tipo Client

interface ClientResponse {
  data: Client[]; // Substituído 'any[]' por 'Client[]'
  total: number;
  page: number;
  limit: number;
}

export const fetchExpiredClients = async (
  page: number,
  limit: number,
  search: string
): Promise<ClientResponse> => {
  const response = await axios.get(
    `http://localhost:3001/api/expired-clients`,
    {
      params: { page, limit, search },
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }
  );
  return response.data;
};

export const reactivateClient = async (
  clientId: number,
  dueDate: string
): Promise<void> => {
  await axios.put(
    `http://localhost:3001/api/clients/reactivate/${clientId}`,
    { dueDate }, // Enviando a nova data de vencimento no corpo da requisição
    { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
  );
};