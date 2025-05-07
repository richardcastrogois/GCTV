"use client";

import { useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { toast } from "react-toastify";
import { Client } from "@/app/clients/types";
import ExpiredClientsTable from "@/app/expired/components/ExpiredClientsTable";
import ClientSearch from "@/components/ClientSearch";
import { useSearch } from "@/hooks/useSearch";

export default function ExpiredClients() {
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const { searchTerm } = useSearch();
  const queryClient = useQueryClient();
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Client | "plan.name" | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data: allExpiredClients } = useQuery<Client[]>({
    queryKey: ["allExpiredClients"],
    queryFn: async () => {
      const response = await axios.get(
        "http://localhost:3001/api/clients/expired",
        {
          params: { limit: 9999 },
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      return response.data.data;
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const {
    data: clientsResponse,
    isLoading,
    isFetching,
    error,
  } = useQuery<{ data: Client[]; total: number; page: number; limit: number }>({
    queryKey: ["expiredClients", page, limit],
    queryFn: async () => {
      const { data } = await axios.get(
        "http://localhost:3001/api/clients/expired",
        {
          params: { page, limit },
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      return data;
    },
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (clientsResponse?.data)
      setSelectedClients((prev) =>
        prev.filter((id) =>
          clientsResponse.data.some((client) => client.id === id)
        )
      );
  }, [clientsResponse?.data]);

  useEffect(() => {
    if (!allExpiredClients) {
      setFilteredClients(clientsResponse?.data || []);
      return;
    }
    if (!searchTerm) {
      setFilteredClients(clientsResponse?.data || []);
      return;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = allExpiredClients.filter((client) => {
      const fields = [
        client.fullName.toLowerCase(),
        client.email.toLowerCase(),
        client.plan.name.toLowerCase(),
      ];
      return fields.some((field) => field.includes(lowerSearchTerm));
    });
    setFilteredClients(filtered);
  }, [searchTerm, allExpiredClients, clientsResponse?.data]);

  const sortedClients = [...filteredClients].sort((a, b) => {
    if (!sortConfig.key) return 0;

    const valueA =
      sortConfig.key === "plan.name"
        ? a.plan.name.toLowerCase()
        : (a[sortConfig.key] as string);
    const valueB =
      sortConfig.key === "plan.name"
        ? b.plan.name.toLowerCase()
        : (b[sortConfig.key] as string);

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

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      axios.delete(`http://localhost:3001/api/clients/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expiredClients"] });
      queryClient.invalidateQueries({ queryKey: ["allExpiredClients"] });
      toast.success("Excluído!");
    },
    onError: (error) =>
      toast.error(
        error instanceof AxiosError
          ? `Erro: ${error.message}`
          : "Erro desconhecido"
      ),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) =>
      Promise.all(
        ids.map((id) =>
          axios.delete(`http://localhost:3001/api/clients/${id}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          })
        )
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expiredClients"] });
      queryClient.invalidateQueries({ queryKey: ["allExpiredClients"] });
      setSelectedClients([]);
      toast.success("Excluídos!");
    },
    onError: (error) =>
      toast.error(
        error instanceof AxiosError
          ? `Erro: ${error.message}`
          : "Erro desconhecido"
      ),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: number) =>
      axios.put(
        `http://localhost:3001/api/clients/reactivate/${id}`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expiredClients"] });
      queryClient.invalidateQueries({ queryKey: ["allExpiredClients"] });
      toast.success("Reativado!");
    },
    onError: (error) =>
      toast.error(
        error instanceof AxiosError
          ? `Erro: ${error.message}`
          : "Erro desconhecido"
      ),
  });

  const handleSelectClient = (id: number) =>
    setSelectedClients((prev) =>
      prev.includes(id)
        ? prev.filter((clientId) => clientId !== id)
        : [...prev, id]
    );

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked)
      setSelectedClients(sortedClients.map((client) => client.id));
    else setSelectedClients([]);
  };

  const handleBulkDelete = () =>
    selectedClients.length > 0 && bulkDeleteMutation.mutate(selectedClients);

  const handlePaymentStatusClick = (
    clientId: number,
    currentStatus: boolean
  ) => {
    if (currentStatus) {
      if (window.confirm("Marcar como não verificado?")) {
        axios
          .put(
            `http://localhost:3001/api/clients/payment-status/${clientId}`,
            { paymentVerified: false },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          )
          .then(() => {
            toast.success("Atualizado!");
            queryClient.invalidateQueries({ queryKey: ["expiredClients"] });
          })
          .catch((error) =>
            toast.error(
              error instanceof AxiosError
                ? `Erro: ${error.message}`
                : "Erro desconhecido"
            )
          );
      }
    } else {
      const date = prompt("Data (YYYY-MM-DD):");
      if (date && !isNaN(new Date(date).getTime())) {
        axios
          .put(
            `http://localhost:3001/api/clients/payment-status/${clientId}`,
            { paymentVerified: true, paymentVerifiedDate: date },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          )
          .then(() => {
            toast.success("Atualizado!");
            queryClient.invalidateQueries({ queryKey: ["expiredClients"] });
          })
          .catch((error) =>
            toast.error(
              error instanceof AxiosError
                ? `Erro: ${error.message}`
                : "Erro desconhecido"
            )
          );
      } else alert("Data inválida!");
    }
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (
      clientsResponse &&
      newPage > 0 &&
      newPage <= Math.ceil(clientsResponse.total / limit)
    )
      setPage(newPage);
  };

  if (error) return <div className="error-message">Erro: {error.message}</div>;

  const isDataReady = clientsResponse?.data && filteredClients.length > 0;

  return (
    <div className="dashboard-container">
      <div className="flex sm:flex-row flex-col justify-between items-center mb-5">
        <h1 className="text-3xl mb-4 sm:mb-0">Clientes Expirados</h1>
        {selectedClients.length > 0 && (
          <button
            onClick={handleBulkDelete}
            className="new-client-button bg-[var(--danger-bg)] text-white hover:bg-red-600"
          >
            Excluir Selecionados ({selectedClients.length})
          </button>
        )}
      </div>
      <ClientSearch />
      <div className="clients-table-container">
        <div className="table-wrapper">
          {isDataReady ? (
            <ExpiredClientsTable
              clients={sortedClients}
              sortConfig={sortConfig}
              onSort={handleSort}
              selectedClients={selectedClients}
              onSelectClient={handleSelectClient}
              onSelectAll={handleSelectAll}
              onDelete={(id: number) => deleteMutation.mutate(id)}
              onReactivate={(id: number) => reactivateMutation.mutate(id)}
              onUpdatePaymentStatus={handlePaymentStatusClick}
              isFetching={isFetching}
              isLoading={isLoading}
            />
          ) : (
            <p className="text-center mt-4">Nenhum cliente encontrado.</p>
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
