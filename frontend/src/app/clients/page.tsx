//frontend/src/app/clients/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import dynamic from "next/dynamic";
import ClientSearch from "@/components/ClientSearch";
import {
  fetchClients,
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
import Loading from "@/components/Loading";
import EditClientModal from "./components/EditClientModal";

const ClientsTable = dynamic(() => import("./components/ClientsTable"), {
  loading: () => <Loading>Carregando tabela...</Loading>,
});

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
    grossAmount: 0,
    isActive: true,
    observations: "",
    username: "",
  });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const { searchTerm } = useSearch();
  const [sortConfig, setSortConfig] = useState<{
    key:
      | keyof Omit<Client, "plan" | "paymentMethod" | "user">
      | "plan.name"
      | "paymentMethod.name"
      | "user.username"
      | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [clientToRenew, setClientToRenew] = useState<Client | null>(null);
  const [newDueDate, setNewDueDate] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<number | null>(null);

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

  const {
    data: clientsResponse,
    isLoading,
    isFetching,
    error,
  } = useQuery<{ data: Client[]; total: number; page: number; limit: number }>({
    queryKey: ["clients", page, limit, searchTerm],
    queryFn: async () => {
      try {
        const response = await fetchClients(page, limit, searchTerm);
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

  useEffect(() => {
    const checkExpiredClients = async () => {
      if (!clientsResponse?.data) return;

      const currentDate = new Date();
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      const clientsToDeactivate: Client[] = [];

      for (const client of clientsResponse.data) {
        const dueDate = new Date(client.dueDate);
        const timeDiff = currentDate.getTime() - dueDate.getTime();

        if (client.isActive && timeDiff > thirtyDaysInMs) {
          clientsToDeactivate.push(client);
        }
      }

      for (const client of clientsToDeactivate) {
        try {
          await updateClient(client.id, {
            fullName: client.fullName,
            email: client.email,
            phone: client.phone || "",
            planId: client.plan.id,
            paymentMethodId: client.paymentMethod.id,
            dueDate: client.dueDate,
            grossAmount: client.grossAmount,
            isActive: false,
            observations: client.observations || "",
            username: client.user.username,
          });
          toast.info(`Cliente ${client.fullName} movido para inativos.`);
        } catch (error) {
          if (error instanceof AxiosError) {
            toast.error(
              `Erro ao mover cliente ${client.fullName} para inativos: ${error.message}`
            );
            if (error.response?.status === 401) handleUnauthorized();
          }
        }
      }

      if (clientsToDeactivate.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["clients"] });
      }
    };

    checkExpiredClients();
  }, [clientsResponse, queryClient, handleUnauthorized]);

  const sortedClients = [...(clientsResponse?.data || [])]
    .map((client) => ({
      ...client,
      plan: {
        ...client.plan,
      },
      paymentMethod: {
        ...client.paymentMethod,
      },
    }))
    .sort((a, b) => {
      if (!sortConfig.key) return 0;

      let valueA: string | number;
      let valueB: string | number;

      if (sortConfig.key === "plan.name") {
        valueA = a.plan?.name?.toLowerCase() ?? "";
        valueB = b.plan?.name?.toLowerCase() ?? "";
      } else if (sortConfig.key === "paymentMethod.name") {
        valueA = a.paymentMethod?.name?.toLowerCase() ?? "";
        valueB = b.paymentMethod?.name?.toLowerCase() ?? "";
      } else if (sortConfig.key === "user.username") {
        valueA = a.user?.username?.toLowerCase() ?? "";
        valueB = b.user?.username?.toLowerCase() ?? "";
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
      | keyof Omit<Client, "plan" | "paymentMethod" | "user">
      | "plan.name"
      | "paymentMethod.name"
      | "user.username"
  ) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleNewClient = () => router.push("/clients/new");

  const handleDelete = (id: number) => {
    setClientToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (clientToDelete === null) return;
    try {
      await deleteClient(clientToDelete);
      toast.success("Cliente excluído!");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setIsDeleteModalOpen(false);
      setClientToDelete(null);
    } catch (error) {
      if (error instanceof AxiosError) {
        toast.error(`Erro: ${error.message}`);
        if (error.response?.status === 401) handleUnauthorized();
      }
    }
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setClientToDelete(null);
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
      grossAmount: client.grossAmount,
      isActive: client.isActive,
      observations: client.observations || "",
      username: client.user.username,
    });
    setIsModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !selectedClient ||
      !editFormData.fullName ||
      !editFormData.email ||
      !editFormData.username ||
      editFormData.planId === 0 ||
      editFormData.paymentMethodId === 0 ||
      !editFormData.dueDate ||
      editFormData.grossAmount === 0
    ) {
      toast.error("Preencha todos os campos!");
      return;
    }
    const grossAmountNum = parseFloat(editFormData.grossAmount.toString());
    if (isNaN(grossAmountNum)) {
      toast.error("Valor bruto inválido!");
      return;
    }
    const dueDateISO = new Date(editFormData.dueDate).toISOString();
    const dataToSend = {
      ...editFormData,
      grossAmount: grossAmountNum,
      dueDate: dueDateISO,
    };
    console.log("Dados enviados para updateClient:", dataToSend);
    try {
      await updateClient(selectedClient.id, dataToSend);
      toast.success("Cliente atualizado!");
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error("Erro ao atualizar cliente:", error.response?.data);
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

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isRenewModalOpen) closeRenewModal();
        if (isDeleteModalOpen) closeDeleteModal();
      }
    };
    document.addEventListener("keydown", handleEscKey);
    return () => document.removeEventListener("keydown", handleEscKey);
  }, [isRenewModalOpen, isDeleteModalOpen]);

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
    verified: boolean
  ) => {
    try {
      await axios.put(
        process.env.NEXT_PUBLIC_API_URL +
          `/api/clients/visual-payment-status/${clientId}`,
        { status: verified },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      toast.success("Status atualizado!");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
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

  const isDataReady = clientsResponse?.data && clientsResponse.data.length > 0;

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
        user={selectedClient?.user}
      />
      {isRenewModalOpen && (
        <div className="modal-overlay" onClick={closeRenewModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Renovar Cliente</h2>
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
                  className="modal-input"
                  required
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
                  Renovar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isDeleteModalOpen && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div
            className="modal-content delete-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">Confirmar Exclusão</h2>
              <button onClick={closeDeleteModal} className="modal-close-button">
                <FaTimes size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="text-[var(--text-primary)]">
                Tem certeza que deseja excluir este cliente?
              </p>
            </div>
            <div className="modal-footer">
              <button
                onClick={closeDeleteModal}
                className="modal-button modal-button-cancel delete-modal-button"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="modal-button modal-button-save delete-modal-button"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}