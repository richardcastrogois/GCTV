// frontend/src/app/expired/page.tsx

"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AxiosError } from "axios";
import dynamic from "next/dynamic";
import ClientSearch from "@/components/ClientSearch";
import { fetchExpiredClients, reactivateClient } from "./api";
import { Client } from "../clients/types";
import { useAuth } from "@/hooks/useAuth";
import { useSearch } from "@/hooks/useSearch";
import LoadingSimple from "@/components/LoadingSimple";

const ExpiredClientsTable = dynamic(
  () => import("./components/ExpiredClientsTable"),
  {
    loading: () => <LoadingSimple>Carregando tabela...</LoadingSimple>,
  }
);

type SortConfig = {
  key: keyof Client | "plan.name" | "user.username" | null;
  direction: "asc" | "desc";
};

export default function Expired() {
  const { handleUnauthorized } = useAuth();
  const queryClient = useQueryClient();
  const { searchTerm } = useSearch();

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "dueDate",
    direction: "desc",
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const {
    data: clientsResponse,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ["expiredClients", page, limit, searchTerm, sortConfig],
    queryFn: async () => {
      try {
        return await fetchExpiredClients(
          page,
          limit,
          searchTerm,
          sortConfig.key,
          sortConfig.direction
        );
      } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 401) {
          handleUnauthorized();
        }
        throw error;
      }
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const clients = useMemo(
    () => clientsResponse?.data || [],
    [clientsResponse?.data]
  );

  const handleSort = useCallback(
    (key: keyof Client | "plan.name" | "user.username") => {
      setSortConfig((prev) => ({
        key,
        direction:
          prev.key === key && prev.direction === "asc" ? "desc" : "asc",
      }));
    },
    []
  );

  const handleReactivate = useCallback(
    async (client: Client, newDueDate: string) => {
      try {
        await reactivateClient(client.id, newDueDate);
        toast.success("Cliente reativado com sucesso!", {
          autoClose: 2000,
          pauseOnHover: false,
        });
        await queryClient.invalidateQueries({ queryKey: ["expiredClients"] });
        await queryClient.invalidateQueries({ queryKey: ["clients"] });
      } catch (error) {
        if (error instanceof AxiosError) {
          toast.error(`Erro ao reativar cliente: ${error.message}`, {
            autoClose: 2000,
            pauseOnHover: false,
          });
          if (error.response?.status === 401) handleUnauthorized();
        }
      }
    },
    [queryClient, handleUnauthorized]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (
        clientsResponse &&
        newPage > 0 &&
        newPage <= Math.ceil(clientsResponse.total / limit)
      ) {
        setPage(newPage);
      }
    },
    [clientsResponse, limit]
  );

  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  if (error) {
    return (
      <div className="error-message">Erro: {(error as Error).message}</div>
    );
  }

  const isDataReady = !isLoading && clients.length > 0;

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
          <ExpiredClientsTable
            clients={clients}
            onSort={handleSort}
            onReactivate={handleReactivate}
            sortConfig={sortConfig}
            isFetching={isFetching}
            isLoading={isLoading} // Pass isLoading para o componente filho
          />
          {!isLoading && !isDataReady && (
            <p className="text-center mt-4">
              Nenhum cliente expirado encontrado.
            </p>
          )}
        </div>
        {isFetching && !isLoading && (
          <LoadingSimple>Atualizando...</LoadingSimple>
        )}

        {isDataReady && (
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
        )}
      </div>
    </div>
  );
}
