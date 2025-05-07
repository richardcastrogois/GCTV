"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import ClientsTable from "./components/ClientsTable";
import EditClientModal from "./components/EditClientModal";
import ClientSearch from "@/components/ClientSearch";
import {
  fetchPlans,
  fetchPaymentMethods,
  deleteClient,
  updateClient,
  renewClient,
} from "./api";
import { Client, Plan, PaymentMethod, EditFormData } from "./types";
import { useAuth } from "@/hooks/useAuth";
import { FaTimes } from "react-icons/fa";
import axios from "axios";
import { useSearch } from "@/hooks/useSearch";

const formatDateToLocal = (date: string | Date): string => {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function Clients() {
  const router = useRouter();
  const { handleUnauthorized } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    fullName: "",
    email: "",
    phone: "",
    planId: 0,
    paymentMethodId: 0,
    dueDate: "",
    grossAmount: "",
    isActive: true,
  });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const { searchTerm } = useSearch();
  const [sortConfig, setSortConfig] = useState<{
    key:
      | keyof Omit<Client, "plan" | "paymentMethod">
      | "plan.name"
      | "paymentMethod.name"
      | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [clientToRenew, setClientToRenew] = useState<Client | null>(null);
  const [newDueDate, setNewDueDate] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    const loadPlansAndMethods = async () => {
      try {
        const [plansData, paymentMethodsData] = await Promise.all([
          fetchPlans(),
          fetchPaymentMethods(),
        ]);
        setPlans(plansData);
        setPaymentMethods(paymentMethodsData);
      } catch (error) {
        if (error instanceof AxiosError) {
          toast.error(`Erro ao carregar planos ou métodos: ${error.message}`);
          if (error.response?.status === 401) handleUnauthorized();
        }
      }
    };
    loadPlansAndMethods();
  }, [handleUnauthorized]);

  const { data: allClients } = useQuery<Client[]>({
    queryKey: ["allClients"],
    queryFn: async () => {
      const response = await axios.get("http://localhost:3001/api/clients", {
        params: { limit: 9999 },
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
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
    queryKey: ["clients", page, limit],
    queryFn: async () => {
      try {
        const response = await axios.get("http://localhost:3001/api/clients", {
          params: { page, limit },
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        return response.data;
      } catch (error) {
        if (error instanceof AxiosError) {
          if (error.response?.status === 401) handleUnauthorized();
        }
        throw error;
      }
    },
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const filterClients = useCallback(
    (term: string) => {
      if (!Array.isArray(allClients)) {
        setFilteredClients(clientsResponse?.data || []);
        return;
      }

      if (!term) {
        setFilteredClients(clientsResponse?.data || []);
        return;
      }

      const lowerSearchTerm = term.toLowerCase();
      const filtered = allClients.filter((client) => {
        const fields = [
          client.fullName.toLowerCase(),
          client.email.toLowerCase(),
          client.phone?.toLowerCase() || "",
          client.plan.name.toLowerCase(),
          client.paymentMethod.name.toLowerCase(),
          client.grossAmount.toString(),
          client.netAmount.toString(),
          new Date(client.dueDate).toLocaleDateString("pt-BR").toLowerCase(),
          client.isActive ? "ativo" : "inativo",
        ];
        return fields.some((field) => field.includes(lowerSearchTerm));
      });
      setFilteredClients(filtered);
    },
    [allClients, clientsResponse?.data]
  );

  useEffect(() => {
    filterClients(searchTerm);
  }, [searchTerm, filterClients, allClients, clientsResponse?.data]);

  const sortedClients = [...filteredClients].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let valueA: string | number;
    let valueB: string | number;

    if (sortConfig.key === "plan.name") {
      valueA = a.plan?.name?.toLowerCase() ?? "";
      valueB = b.plan?.name?.toLowerCase() ?? "";
    } else if (sortConfig.key === "paymentMethod.name") {
      valueA = a.paymentMethod?.name?.toLowerCase() ?? "";
      valueB = b.paymentMethod?.name?.toLowerCase() ?? "";
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

  const handleSort = (
    key:
      | keyof Omit<Client, "plan" | "paymentMethod">
      | "plan.name"
      | "paymentMethod.name"
  ) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleNewClient = () => router.push("/clients/new");
  const handleDelete = async (id: number) => {
    if (window.confirm("Tem certeza?")) {
      try {
        await deleteClient(id);
        toast.success("Cliente excluído!");
        queryClient.invalidateQueries({ queryKey: ["clients"] });
        queryClient.invalidateQueries({ queryKey: ["allClients"] });
      } catch (error) {
        if (error instanceof AxiosError) {
          toast.error(`Erro: ${error.message}`);
          if (error.response?.status === 401) handleUnauthorized();
        }
      }
    }
  };
  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setEditFormData({
      fullName: client.fullName,
      email: client.email,
      phone: client.phone || "",
      planId: client.plan.id,
      paymentMethodId: client.paymentMethod.id,
      dueDate: formatDateToLocal(client.dueDate),
      grossAmount: client.grossAmount.toString(),
      isActive: client.isActive,
    });
    setIsModalOpen(true);
  };
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !selectedClient ||
      !editFormData.fullName ||
      !editFormData.email ||
      editFormData.planId === 0 ||
      editFormData.paymentMethodId === 0 ||
      !editFormData.dueDate ||
      !editFormData.grossAmount
    ) {
      toast.error("Preencha todos os campos!");
      return;
    }
    const grossAmountNum = parseFloat(editFormData.grossAmount);
    if (isNaN(grossAmountNum)) {
      toast.error("Valor inválido!");
      return;
    }
    const dueDateISO = new Date(editFormData.dueDate).toISOString();
    try {
      await updateClient(selectedClient.id, {
        ...editFormData,
        grossAmount: grossAmountNum,
        dueDate: dueDateISO,
      });
      toast.success("Cliente atualizado!");
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["allClients"] });
    } catch (error) {
      if (error instanceof AxiosError) {
        toast.error(`Erro: ${error.message}`);
        if (error.response?.status === 401) handleUnauthorized();
      }
    }
  };
  const handleRenew = (client: Client) => {
    setClientToRenew(client);
    setNewDueDate("");
    setIsRenewModalOpen(true);
  };
  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientToRenew || !newDueDate) {
      toast.error("Informe a data!");
      return;
    }
    try {
      await renewClient(clientToRenew.id, new Date(newDueDate).toISOString());
      toast.success("Renovado!");
      setIsRenewModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["allClients"] });
    } catch (error) {
      if (error instanceof AxiosError) {
        toast.error(`Erro: ${error.message}`);
        if (error.response?.status === 401) handleUnauthorized();
      }
    }
  };
  const closeRenewModal = () => {
    setIsRenewModalOpen(false);
    setClientToRenew(null);
    setNewDueDate("");
  };
  const handlePageChange = (newPage: number) => {
    if (
      clientsResponse &&
      newPage > 0 &&
      newPage <= Math.ceil(clientsResponse.total / limit)
    )
      setPage(newPage);
  };
  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };
  const handleUpdatePaymentStatus = async (
    clientId: number,
    verified: boolean,
    date?: string
  ) => {
    try {
      await axios.put(
        `http://localhost:3001/api/clients/payment-status/${clientId}`,
        { paymentVerified: verified, paymentVerifiedDate: date },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      toast.success("Status atualizado!");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["allClients"] });
    } catch (error) {
      if (error instanceof AxiosError) {
        toast.error(`Erro: ${error.message}`);
        if (error.response?.status === 401) handleUnauthorized();
      }
    }
  };

  if (error) {
    return (
      <div className="error-message">Erro: {(error as Error).message}</div>
    );
  }

  const isDataReady = clientsResponse?.data && filteredClients.length > 0;

  return (
    <div className="dashboard-container">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-center sm:text-left">
          Clientes Ativos
        </h1>
        <button onClick={handleNewClient} className="new-client-button">
          Cadastrar Novo Cliente
        </button>
      </div>
      <ClientSearch />
      <div className="clients-table-container">
        <div className="table-wrapper">
          {isDataReady ? (
            <ClientsTable
              clients={sortedClients}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRenew={handleRenew}
              onSort={handleSort}
              sortConfig={sortConfig}
              onUpdatePaymentStatus={handleUpdatePaymentStatus}
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
      <EditClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        formData={editFormData}
        onChange={setEditFormData}
        onSubmit={handleUpdate}
        plans={plans}
        paymentMethods={paymentMethods}
      />
      {isRenewModalOpen && (
        <div className="modal-overlay" onClick={closeRenewModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Renovar Assinatura</h2>
              <button onClick={closeRenewModal} className="modal-close-button">
                <FaTimes size={20} />
              </button>
            </div>
            <form onSubmit={handleRenewSubmit}>
              <div className="modal-body">
                <label className="modal-label">Nova Data de Vencimento</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  required
                  className="modal-input"
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={closeRenewModal}
                  className="modal-button modal-button-cancel"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="modal-button modal-button-save"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
