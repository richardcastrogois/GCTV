"use client";

// MUDANÇA: useMemo foi removido pois a ordenação agora é feita no back-end
import { useState, useEffect, useCallback } from "react";
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
  updateClientVisualPaymentStatus,
} from "./api";
import { Client, Plan, PaymentMethod, EditFormData } from "./types";
import { useAuth } from "@/hooks/useAuth";
import { FaTimes } from "react-icons/fa";
import { useSearch } from "@/hooks/useSearch";
import { Skeleton } from "@mui/material";
import EditClientModal from "./components/EditClientModal";

// --- INÍCIO: NOVO COMPONENTE SKELETON ---
const ClientsTableSkeleton = () => (
  <>
    <div className="clients-table-container hidden md:block animate-pulse">
      <div className="table-wrapper">
        <table className="clients-table">
          <thead>
            <tr>
              <th className="status-column">
                <Skeleton
                  variant="text"
                  sx={{ bgcolor: "grey.800" }}
                  width={50}
                />
              </th>
              <th className="user-column">
                <Skeleton
                  variant="text"
                  sx={{ bgcolor: "grey.800" }}
                  width={150}
                />
              </th>
              <th className="name-column">
                <Skeleton
                  variant="text"
                  sx={{ bgcolor: "grey.800" }}
                  width={150}
                />
              </th>
              <th className="email-column hidden md:table-cell">
                <Skeleton
                  variant="text"
                  sx={{ bgcolor: "grey.800" }}
                  width={200}
                />
              </th>
              <th className="phone-column hidden sm:table-cell">
                <Skeleton
                  variant="text"
                  sx={{ bgcolor: "grey.800" }}
                  width={100}
                />
              </th>
              <th className="plan-column hidden lg:table-cell">
                <Skeleton
                  variant="text"
                  sx={{ bgcolor: "grey.800" }}
                  width={120}
                />
              </th>
              <th className="method-column hidden xl:table-cell">
                <Skeleton
                  variant="text"
                  sx={{ bgcolor: "grey.800" }}
                  width={120}
                />
              </th>
              <th className="due-date-column hidden xl:table-cell">
                <Skeleton
                  variant="text"
                  sx={{ bgcolor: "grey.800" }}
                  width={100}
                />
              </th>
              <th className="gross-amount-column hidden 2xl:table-cell">
                <Skeleton
                  variant="text"
                  sx={{ bgcolor: "grey.800" }}
                  width={80}
                />
              </th>
              <th className="net-amount-column hidden 2xl:table-cell">
                <Skeleton
                  variant="text"
                  sx={{ bgcolor: "grey.800" }}
                  width={80}
                />
              </th>
              <th className="actions-column">
                <Skeleton
                  variant="text"
                  sx={{ bgcolor: "grey.800" }}
                  width={40}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {[...Array(10)].map((_, index) => (
              <tr key={index}>
                <td className="status-column">
                  <Skeleton
                    variant="circular"
                    sx={{ bgcolor: "grey.900" }}
                    width={24}
                    height={24}
                  />
                </td>
                <td className="user-column">
                  <Skeleton variant="text" sx={{ bgcolor: "grey.900" }} />
                </td>
                <td className="name-column">
                  <Skeleton variant="text" sx={{ bgcolor: "grey.900" }} />
                </td>
                <td className="email-column hidden md:table-cell">
                  <Skeleton variant="text" sx={{ bgcolor: "grey.900" }} />
                </td>
                <td className="phone-column hidden sm:table-cell">
                  <Skeleton variant="text" sx={{ bgcolor: "grey.900" }} />
                </td>
                <td className="plan-column hidden lg:table-cell">
                  <Skeleton variant="text" sx={{ bgcolor: "grey.900" }} />
                </td>
                <td className="method-column hidden xl:table-cell">
                  <Skeleton variant="text" sx={{ bgcolor: "grey.900" }} />
                </td>
                <td className="due-date-column hidden xl:table-cell">
                  <Skeleton variant="text" sx={{ bgcolor: "grey.900" }} />
                </td>
                <td className="gross-amount-column hidden 2xl:table-cell">
                  <Skeleton variant="text" sx={{ bgcolor: "grey.900" }} />
                </td>
                <td className="net-amount-column hidden 2xl:table-cell">
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
          className="client-card bg-[var(--table-bg)] p-4 rounded-lg"
        >
          <div className="w-full">
            <Skeleton
              variant="text"
              sx={{ bgcolor: "grey.800" }}
              width="60%"
              height={30}
            />
            <Skeleton
              variant="text"
              sx={{ bgcolor: "grey.800" }}
              width="40%"
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
      ))}
    </div>
  </>
);
// --- FIM: NOVO COMPONENTE SKELETON ---

const ClientsTable = dynamic(() => import("./components/ClientsTable"), {
  loading: () => <ClientsTableSkeleton />,
});

type SortKey =
  | keyof Omit<Client, "plan" | "paymentMethod" | "user">
  | "plan.name"
  | "paymentMethod.name"
  | "user.username";

const formatDateToLocal = (date: string | Date): string => {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getUTCDate()).padStart(2, "0")}`;
};

export default function Clients() {
  const router = useRouter();
  const { handleUnauthorized } = useAuth();
  const queryClient = useQueryClient();
  const { searchTerm } = useSearch();

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
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey | null;
    direction: "asc" | "desc";
  }>({ key: "createdAt", direction: "desc" });
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
        const cachedData:
          | { plans: Plan[]; paymentMethods: PaymentMethod[] }
          | undefined = queryClient.getQueryData(["preloadData"]);
        if (cachedData) {
          setPlans(cachedData.plans);
          setPaymentMethods(cachedData.paymentMethods);
        } else {
          const [plansData, paymentMethodsData] = await Promise.all([
            fetchPlans(),
            fetchPaymentMethods(),
          ]);
          setPlans(plansData);
          setPaymentMethods(paymentMethodsData);
        }
      } catch (error) {
        if (error instanceof AxiosError) {
          toast.error(`Erro ao carregar planos ou métodos: ${error.message}`);
          if (error.response?.status === 401) handleUnauthorized();
        }
      }
    };
    loadPlansAndMethods();
  }, [queryClient, handleUnauthorized]);

  const {
    data: clientsResponse,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    // OTIMIZAÇÃO: Adicionado sortConfig à chave da query
    queryKey: ["clients", page, limit, searchTerm, sortConfig],
    // OTIMIZAÇÃO: Passando os parâmetros de ordenação para a função de fetch
    queryFn: () =>
      fetchClients(
        page,
        limit,
        searchTerm,
        sortConfig.key,
        sortConfig.direction
      ),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (previousData) => previousData,
  });

  // OTIMIZAÇÃO: Removida a ordenação do lado do cliente.
  const clients = clientsResponse?.data ?? [];

  const handleSort = useCallback((key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  const handleNewClient = useCallback(() => {
    router.push("/clients/new");
  }, [router]);

  const handleDelete = useCallback((id: number) => {
    setClientToDelete(id);
    setIsDeleteModalOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (clientToDelete === null) return;
    try {
      await deleteClient(clientToDelete);
      toast.success("Cliente excluído!");
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
    } catch (error) {
      if (error instanceof AxiosError) {
        toast.error(`Erro: ${error.response?.data?.message || error.message}`);
        if (error.response?.status === 401) handleUnauthorized();
      }
    } finally {
      setIsDeleteModalOpen(false);
      setClientToDelete(null);
    }
  }, [clientToDelete, queryClient, handleUnauthorized]);

  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
    setClientToDelete(null);
  }, []);

  const handleEdit = useCallback((client: Client) => {
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
  }, []);

  const handleUpdate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedClient) return;
      try {
        await updateClient(selectedClient.id, {
          ...editFormData,
          grossAmount: Number(editFormData.grossAmount),
          dueDate: new Date(editFormData.dueDate).toISOString(),
        });
        toast.success("Cliente atualizado!");
        setIsModalOpen(false);
        await queryClient.invalidateQueries({ queryKey: ["clients"] });
      } catch (error) {
        if (error instanceof AxiosError) {
          toast.error(
            `Erro: ${error.response?.data?.message || error.message}`
          );
          if (error.response?.status === 401) handleUnauthorized();
        }
      }
    },
    [selectedClient, editFormData, queryClient, handleUnauthorized]
  );

  const handleRenew = useCallback((client: Client) => {
    setClientToRenew(client);
    setNewDueDate("");
    setIsRenewModalOpen(true);
  }, []);

  const handleRenewSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!clientToRenew || !newDueDate) {
        toast.error("Informe a data!");
        return;
      }
      try {
        await renewClient(clientToRenew.id, new Date(newDueDate).toISOString());
        toast.success("Renovado!");
        setIsRenewModalOpen(false);
        await queryClient.invalidateQueries({ queryKey: ["clients"] });
      } catch (error) {
        if (error instanceof AxiosError) {
          toast.error(
            `Erro: ${error.response?.data?.message || error.message}`
          );
          if (error.response?.status === 401) handleUnauthorized();
        }
      }
    },
    [clientToRenew, newDueDate, queryClient, handleUnauthorized]
  );

  const closeRenewModal = useCallback(() => {
    setIsRenewModalOpen(false);
    setClientToRenew(null);
  }, []);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isRenewModalOpen) closeRenewModal();
        if (isDeleteModalOpen) closeDeleteModal();
        if (isModalOpen) setIsModalOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscKey);
    return () => document.removeEventListener("keydown", handleEscKey);
  }, [
    isRenewModalOpen,
    isDeleteModalOpen,
    isModalOpen,
    closeRenewModal,
    closeDeleteModal,
  ]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const handleUpdatePaymentStatus = useCallback(
    async (clientId: number, verified: boolean) => {
      try {
        await updateClientVisualPaymentStatus(clientId, verified);
        await queryClient.invalidateQueries({
          queryKey: ["clients", page, limit, searchTerm],
        });
      } catch (error) {
        if (error instanceof AxiosError) {
          toast.error(
            `Erro: ${error.response?.data?.message || error.message}`
          );
          if (error.response?.status === 401) handleUnauthorized();
        }
      }
    },
    [queryClient, page, limit, searchTerm, handleUnauthorized]
  );

  if (error)
    return (
      <div className="error-message">Erro: {(error as Error).message}</div>
    );

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
          {isLoading ? (
            <ClientsTableSkeleton />
          ) : clientsResponse && clients.length > 0 ? (
            <ClientsTable
              clients={clients}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRenew={handleRenew}
              onSort={handleSort}
              sortConfig={sortConfig}
              onUpdatePaymentStatus={handleUpdatePaymentStatus}
              isFetching={isFetching}
            />
          ) : (
            <p className="text-center mt-4">Nenhum cliente encontrado.</p>
          )}
        </div>

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
