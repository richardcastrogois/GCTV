//frontend/src/app/expired/page.tsx

"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AxiosError } from "axios";
import dynamic from "next/dynamic";
import ClientSearch from "@/components/ClientSearch";
import { fetchExpiredClients, reactivateClient } from "./api.ts";
import { Client } from "../clients/types";
import { useAuth } from "@/hooks/useAuth";
import { useSearch } from "@/hooks/useSearch";
import Loading from "@/components/Loading";

const ExpiredClientsTable = dynamic(
  () => import("./components/ExpiredClientsTable"),
  {
    loading: () => <Loading>Carregando tabela...</Loading>,
  }
);

export default function Expired() {
  const { handleUnauthorized } = useAuth();
  const queryClient = useQueryClient();
  const { searchTerm } = useSearch();
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Client | "plan.name" | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const {
    data: clientsResponse,
    isLoading,
    isFetching,
    error,
  } = useQuery<{ data: Client[]; total: number; page: number; limit: number }>({
    queryKey: ["expiredClients", page, limit, searchTerm],
    queryFn: async () => {
      try {
        const response = await fetchExpiredClients(page, limit, searchTerm);
        return response;
      } catch (error) {
        if (error instanceof AxiosError) {
          if (error.response?.status === 401) handleUnauthorized();
        }
        throw error;
      }
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const sortedClients = [...(clientsResponse?.data || [])].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let valueA: string | number;
    let valueB: string | number;

    if (sortConfig.key === "plan.name") {
      valueA = a.plan?.name?.toLowerCase() ?? "";
      valueB = b.plan?.name?.toLowerCase() ?? "";
    } else {
      const rawValueA = a[sortConfig.key];
      const rawValueB = b[sortConfig.key];

      if (sortConfig.key === "dueDate") {
        valueA = new Date(rawValueA as string).getTime() || 0;
        valueB = new Date(rawValueB as string).getTime() || 0;
      } else if (sortConfig.key === "isActive") {
        valueA = rawValueA === true ? 1 : 0;
        valueB = rawValueB === true ? 1 : 0;
      } else if (typeof rawValueA === "string") {
        valueA = (rawValueA as string).toLowerCase() ?? "";
        valueB = (rawValueB as string).toLowerCase() ?? "";
      } else {
        valueA = (rawValueA as number) ?? 0;
        valueB = (rawValueB as number) ?? 0;
      }
    }

    if (valueA < valueB) return sortConfig.direction === "asc" ? -1 : 1;
    if (valueA > valueB) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (key: keyof Client | "plan.name") => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleReactivate = async (client: Client) => {
    try {
      await reactivateClient(client.id);
      toast.success("Cliente reativado com sucesso!", {
        autoClose: 2000,
        pauseOnHover: false,
        pauseOnFocusLoss: false,
      });
      queryClient.invalidateQueries({ queryKey: ["expiredClients"] });
    } catch (error) {
      if (error instanceof AxiosError) {
        toast.error(`Erro ao reativar cliente: ${error.message}`, {
          autoClose: 2000,
          pauseOnHover: false,
          pauseOnFocusLoss: false,
        });
        if (error.response?.status === 401) handleUnauthorized();
      }
    }
  };

  const handlePageChange = (newPage: number) => {
    if (
      clientsResponse &&
      newPage > 0 &&
      newPage <= Math.ceil(clientsResponse.total / limit)
    ) {
      setPage(newPage);
    }
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  if (error) {
    return (
      <div className="error-message">Erro: {(error as Error).message}</div>
    );
  }

  const isDataReady = clientsResponse?.data && clientsResponse.data.length > 0;

  return (
    <div className="dashboard-container">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-center sm:text-left">
          Clientes Expirados
        </h1>
      </div>
      <ClientSearch />
      <div className="clients-table-container">
        <div className="table-wrapper">
          {isDataReady ? (
            <ExpiredClientsTable
              clients={sortedClients}
              onSort={handleSort}
              onReactivate={handleReactivate}
              sortConfig={sortConfig}
              isFetching={isFetching}
              isLoading={isLoading}
            />
          ) : (
            <p className="text-center mt-4">
              Nenhum cliente expirado encontrado.
            </p>
          )}
        </div>
        {isFetching && <div className="text-center mt-2">Atualizando...</div>}
        <div className="pagination">
          <select
            value={limit}
            onChange={(e) => handleLimitChange(parseInt(e.target.value))}
            className="pagination-select"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
          </select>
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="pagination-button"
          >
            Anterior
          </button>
          <span className="pagination-info">
            Página {page} de{" "}
            {clientsResponse ? Math.ceil(clientsResponse.total / limit) : 1}
          </span>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={
              clientsResponse ? page * limit >= clientsResponse.total : true
            }
            className="pagination-button"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
