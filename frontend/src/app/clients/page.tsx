"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import Navbar from "@/components/Navbar";
import ClientsTable from "./components/ClientsTable";
import EditClientModal from "./components/EditClientModal";
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

// Função auxiliar para formatar a data para o formato YYYY-MM-DD
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
  const [searchTerm, setSearchTerm] = useState("");
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

  useEffect(() => {
    const loadPlansAndMethods = async () => {
      try {
        console.log("Carregando planos e métodos de pagamento...");
        const [plansData, paymentMethodsData] = await Promise.all([
          fetchPlans(),
          fetchPaymentMethods(),
        ]);
        setPlans(plansData);
        setPaymentMethods(paymentMethodsData);
        console.log("Planos carregados:", plansData);
        console.log("Métodos de pagamento carregados:", paymentMethodsData);
      } catch (error) {
        console.error(
          "Erro ao carregar planos ou métodos de pagamento:",
          error
        );
        if (error instanceof AxiosError) {
          console.log("Detalhes do erro Axios:", {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
          });
          toast.error(
            `Erro ao carregar planos ou métodos de pagamento: ${
              error.response?.data?.message || error.message
            }`
          );
          if (error.response?.status === 401) {
            handleUnauthorized();
          }
        } else {
          toast.error(
            "Erro desconhecido ao carregar planos ou métodos de pagamento."
          );
        }
      }
    };

    loadPlansAndMethods();
  }, [handleUnauthorized]);

  const {
    data: clients,
    isLoading,
    error,
  } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      try {
        const result = await fetchClients();
        console.log("Dados buscados do backend (clientes):", result);
        return result;
      } catch (error: unknown) {
        console.error("Erro ao buscar clientes:", error);
        if (error instanceof AxiosError) {
          console.log("Detalhes do erro Axios (fetchClients):", {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
          });
          if (error.response?.status === 401) {
            handleUnauthorized();
          }
        }
        throw error;
      }
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const filterClients = useCallback(
    (term: string) => {
      if (!Array.isArray(clients)) {
        setFilteredClients([]);
        return;
      }

      if (!term) {
        setFilteredClients(clients);
        return;
      }

      const lowerSearchTerm = term.toLowerCase();
      const filtered = clients.filter((client) => {
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
      console.log("Clientes filtrados:", filtered);
    },
    [clients]
  );

  useEffect(() => {
    filterClients(searchTerm);
  }, [clients, searchTerm, filterClients]);

  const sortedClients = [...filteredClients].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let valueA: string | number | Date | boolean;
    let valueB: string | number | Date | boolean;

    if (sortConfig.key === "plan.name") {
      valueA = a.plan?.name?.toLowerCase() ?? "";
      valueB = b.plan?.name?.toLowerCase() ?? "";
    } else if (sortConfig.key === "paymentMethod.name") {
      valueA = a.paymentMethod?.name?.toLowerCase() ?? "";
      valueB = b.paymentMethod?.name?.toLowerCase() ?? "";
    } else {
      valueA = a[sortConfig.key] ?? "";
      valueB = b[sortConfig.key] ?? "";

      if (typeof valueA === "string" && sortConfig.key !== "dueDate") {
        valueA = valueA.toLowerCase();
      }
      if (typeof valueB === "string" && sortConfig.key !== "dueDate") {
        valueB = valueB.toLowerCase();
      }

      if (sortConfig.key === "dueDate") {
        valueA = new Date(valueA as string).getTime();
        valueB = new Date(valueB as string).getTime();
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

  const handleNewClient = () => {
    router.push("/clients/new");
  };

  const handleDelete = async (id: number) => {
    const confirm = window.confirm(
      "Tem certeza que deseja excluir este cliente?"
    );
    if (!confirm) return;

    try {
      await deleteClient(id);
      toast.success("Cliente excluído com sucesso.");
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      await queryClient.invalidateQueries({ queryKey: ["expiredClients"] }); // Adicionado
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        console.log("Erro ao excluir cliente:", error.response?.data);
        toast.error(
          `Erro ao excluir cliente: ${
            error.response?.data?.message || error.message
          }`
        );
        if (error.response?.status === 401) {
          handleUnauthorized();
        }
      } else {
        toast.error("Erro desconhecido ao excluir cliente.");
      }
    }
  };

  const handleEdit = (client: Client) => {
    const formattedDueDate = formatDateToLocal(client.dueDate);
    setSelectedClient(client);
    setEditFormData({
      fullName: client.fullName,
      email: client.email,
      phone: client.phone || "",
      planId: client.plan.id,
      paymentMethodId: client.paymentMethod.id,
      dueDate: formattedDueDate,
      grossAmount: client.grossAmount.toString(),
      isActive: client.isActive,
    });
    console.log("Dados iniciais do formulário de edição:", {
      ...client,
      dueDate: formattedDueDate,
    });
    setIsModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClient) return;

    if (
      !editFormData.fullName ||
      !editFormData.email ||
      editFormData.planId === 0 ||
      editFormData.paymentMethodId === 0 ||
      !editFormData.dueDate ||
      !editFormData.grossAmount
    ) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const grossAmountNum = parseFloat(editFormData.grossAmount);
    if (isNaN(grossAmountNum)) {
      toast.error("O valor bruto deve ser um número válido.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editFormData.email)) {
      toast.error("Por favor, insira um email válido.");
      return;
    }

    const parsedDueDate = new Date(editFormData.dueDate + "T00:00:00Z");
    if (isNaN(parsedDueDate.getTime())) {
      toast.error("Por favor, insira uma data de vencimento válida.");
      return;
    }
    const dueDateISO = parsedDueDate.toISOString();

    console.log("Estado do formulário antes de enviar:", editFormData);
    const updatedClientData = {
      fullName: editFormData.fullName,
      email: editFormData.email,
      phone: editFormData.phone || null,
      planId: editFormData.planId,
      paymentMethodId: editFormData.paymentMethodId,
      dueDate: dueDateISO,
      grossAmount: grossAmountNum,
      isActive: editFormData.isActive,
    };
    console.log("Dados enviados para o backend:", updatedClientData);

    try {
      const updatedClient = await updateClient(
        selectedClient.id,
        updatedClientData
      );
      console.log("Cliente atualizado:", updatedClient);
      toast.success("Cliente atualizado com sucesso!");
      setIsModalOpen(false);
      setSelectedClient(null);
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      await queryClient.invalidateQueries({ queryKey: ["expiredClients"] }); // Adicionado
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        console.log("Erro ao atualizar cliente:", error.response?.data);
        if (error.response?.status === 401) {
          handleUnauthorized();
        } else {
          toast.error(
            `Erro ao atualizar cliente: ${
              error.response?.data?.message || error.message
            }`
          );
        }
      } else {
        toast.error("Erro desconhecido ao atualizar cliente.");
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
      toast.error("Por favor, insira uma nova data de vencimento.");
      return;
    }

    const parsedDueDate = new Date(newDueDate + "T00:00:00Z");
    if (isNaN(parsedDueDate.getTime())) {
      toast.error("Por favor, insira uma data de vencimento válida.");
      return;
    }
    const dueDateISO = parsedDueDate.toISOString();

    try {
      await renewClient(clientToRenew.id, dueDateISO);
      toast.success("Data de vencimento renovada com sucesso!");
      setIsRenewModalOpen(false);
      setClientToRenew(null);
      setNewDueDate("");
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      await queryClient.invalidateQueries({ queryKey: ["expiredClients"] }); // Adicionado
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        console.log("Erro ao renovar cliente:", error.response?.data);
        if (error.response?.status === 401) {
          handleUnauthorized();
        } else {
          toast.error(
            `Erro ao renovar data de vencimento: ${
              error.response?.data?.message || error.message
            }`
          );
        }
      } else {
        toast.error("Erro desconhecido ao renovar data de vencimento.");
      }
    }
  };

  const closeRenewModal = () => {
    setIsRenewModalOpen(false);
    setClientToRenew(null);
    setNewDueDate("");
  };

  if (isLoading)
    return <div className="loading-message">Carregando clientes...</div>;
  if (error) {
    console.error("Erro ao carregar clientes (final):", error);
    return (
      <div className="error-message">
        Erro ao carregar clientes: {(error as Error).message}
      </div>
    );
  }

  return (
    <div style={{ background: "var(--background-primary)" }}>
      <Navbar />
      <div className="dashboard-container">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-center sm:text-left">
            Clientes Ativos
          </h1>
          <button onClick={handleNewClient} className="new-client-button">
            Cadastrar Novo Cliente
          </button>
        </div>
        <ClientSearch onSearchTermChange={setSearchTerm} />
        {sortedClients?.length ? (
          <div className="clients-table-container">
            <ClientsTable
              clients={sortedClients}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRenew={handleRenew}
              onSort={handleSort}
              sortConfig={sortConfig}
            />
          </div>
        ) : (
          <p className="text-center mt-4">Nenhum cliente encontrado.</p>
        )}
        <EditClientModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          formData={editFormData}
          onChange={setEditFormData}
          onSubmit={handleUpdate}
          plans={plans}
          paymentMethods={paymentMethods}
        />
      </div>

      {isRenewModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 sm:p-0"
          onClick={closeRenewModal}
        >
          <div className="renew-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Renovar Assinatura</h2>
              <button onClick={closeRenewModal} className="close-button">
                <FaTimes size={20} />
              </button>
            </div>
            <form onSubmit={handleRenewSubmit}>
              <div className="mb-4">
                <label className="block">Nova Data de Vencimento</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  required
                  className="w-full"
                />
              </div>
              <button type="submit" className="submit-button">
                Salvar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
