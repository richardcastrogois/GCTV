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
import { Skeleton } from "@mui/material";

// --- INÍCIO: COMPONENTE SKELETON (SEM ALTERAÇÃO) ---
const ExpiredClientsTableSkeleton = () => (
  <>
    <div className="clients-table-container hidden md:block animate-pulse">
      <div className="table-wrapper">
        <table className="clients-table">
          <thead>
            <tr>
              <th className="user-column">
                <Skeleton
                  variant="text"
                  sx={{ bgcolor: "grey.800" }}
                  width="80%"
                />
              </th>
              <th className="name-column">
                <Skeleton
                  variant="text"
                  sx={{ bgcolor: "grey.800" }}
                  width="80%"
                />
              </th>
              <th className="email-column hidden lg:table-cell">
                <Skeleton
                  variant="text"
                  sx={{ bgcolor: "grey.800" }}
                  width="80%"
                />
              </th>
              <th className="plan-column">
                <Skeleton
                  variant="text"
                  sx={{ bgcolor: "grey.800" }}
                  width="80%"
                />
              </th>
              <th className="due-date-column">
                <Skeleton
                  variant="text"
                  sx={{ bgcolor: "grey.800" }}
                  width="80%"
                />
              </th>
              <th className="status-column">
                <Skeleton
                  variant="text"
                  sx={{ bgcolor: "grey.800" }}
                  width="80%"
                />
              </th>
              <th className="actions-column">
                <Skeleton
                  variant="text"
                  sx={{ bgcolor: "grey.800" }}
                  width="50%"
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {[...Array(10)].map((_, index) => (
              <tr key={index}>
                <td className="user-column">
                  <Skeleton variant="text" sx={{ bgcolor: "grey.900" }} />
                </td>
                <td className="name-column">
                  <Skeleton variant="text" sx={{ bgcolor: "grey.900" }} />
                </td>
                <td className="email-column hidden lg:table-cell">
                  <Skeleton variant="text" sx={{ bgcolor: "grey.900" }} />
                </td>
                <td className="plan-column">
                  <Skeleton variant="text" sx={{ bgcolor: "grey.900" }} />
                </td>
                <td className="due-date-column">
                  <Skeleton variant="text" sx={{ bgcolor: "grey.900" }} />
                </td>
                <td className="status-column">
                  <Skeleton variant="text" sx={{ bgcolor: "grey.900" }} />
                </td>
                <td className="actions-column">
                  <Skeleton variant="text" sx={{ bgcolor: "grey.900" }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    <div className="md:hidden space-y-4 animate-pulse">
      {[...Array(5)].map((_, index) => (
        <div
          key={index}
          className="client-card bg-[var(--table-bg)] backdrop-blur-sm rounded-lg p-4 shadow-md"
        >
          <div className="flex justify-between items-start">
            <div className="w-full">
              <Skeleton
                variant="text"
                sx={{ bgcolor: "grey.800" }}
                width="40%"
                height={20}
              />
              <Skeleton
                variant="text"
                sx={{ bgcolor: "grey.800" }}
                width="60%"
                height={30}
              />
              <Skeleton
                variant="text"
                sx={{ bgcolor: "grey.800" }}
                width="50%"
                height={20}
              />
              <Skeleton
                variant="text"
                sx={{ bgcolor: "grey.800" }}
                width="50%"
                height={20}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  </>
);
// --- FIM: COMPONENTE SKELETON ---

const ExpiredClientsTable = dynamic(
  () => import("./components/ExpiredClientsTable"),
  {
    loading: () => <ExpiredClientsTableSkeleton />,
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
          {isLoading ? (
            <ExpiredClientsTableSkeleton />
          ) : clients.length > 0 ? (
            <ExpiredClientsTable
              clients={clients}
              onSort={handleSort}
              onReactivate={handleReactivate}
              sortConfig={sortConfig}
              isFetching={isFetching} // <-- MUDANÇA: Passando a prop para o componente da tabela
            />
          ) : (
            <p className="text-center mt-4">
              Nenhum cliente expirado encontrado.
            </p>
          )}
        </div>

        {/* MUDANÇA: O bloco que mostrava o LoadingSimple foi removido daqui */}

        {clients.length > 0 && !isLoading && (
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
