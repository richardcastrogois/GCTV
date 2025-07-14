"use client";

import {
  FaEdit,
  FaTrash,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaBolt,
  FaEllipsisV,
  FaCheck,
  FaTimes,
  FaInfoCircle,
  FaSave,
} from "react-icons/fa";
import { Client, PaymentEntry } from "@/types/client";
import { useState, useEffect, useRef, useMemo, memo } from "react";
import { createPortal } from "react-dom";
import api from "@/utils/api";
import { toast } from "react-toastify";
import { useAuth } from "@/hooks/useAuth";
import { AxiosError } from "axios";

// --- Tipos e Funções Auxiliares (sem alteração) ---
const formatDateToUTC = (date: string | Date): string => {
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const formatDateToLocal = (date: string | Date): string => {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDueDateClass = (dueDate: string, currentDate: Date): string => {
  const due = new Date(dueDate);
  const timeDiff = due.getTime() - currentDate.getTime();
  const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
  if (due < currentDate) {
    return "text-[#ff4d4f]";
  } else if (daysDiff <= 7) {
    return "text-[#ff7f50]";
  }
  return "";
};

interface ExtendedClient extends Client {
  paymentHistory: PaymentEntry[] | null;
}

// CORREÇÃO: Definindo o tipo específico para as chaves de ordenação
type SortKey =
  | keyof Omit<Client, "plan" | "paymentMethod" | "user">
  | "plan.name"
  | "paymentMethod.name"
  | "user.username";

interface ClientsTableProps {
  clients: ExtendedClient[];
  onEdit: (client: Client) => void;
  onDelete: (id: number) => void;
  onRenew: (client: Client) => void;
  onSort: (key: SortKey) => void; // CORREÇÃO: Usando o tipo SortKey em vez de 'any'
  sortConfig: {
    key: SortKey | null; // CORREÇÃO: Usando o tipo SortKey em vez de 'any'
    direction: "asc" | "desc";
  };
  isFetching?: boolean;
  onUpdatePaymentStatus: (clientId: number, verified: boolean) => Promise<void>;
}

export default memo(function ClientsTable({
  clients,
  onEdit,
  onDelete,
  onRenew,
  onSort,
  sortConfig,
  isFetching = false,
  onUpdatePaymentStatus,
}: ClientsTableProps) {
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [modalClient, setModalClient] = useState<ExtendedClient | null>(null);
  const [newPaymentDate, setNewPaymentDate] = useState<string>("");
  const [newPaymentBruto, setNewPaymentBruto] = useState<number>(0);
  const [newPaymentLiquido, setNewPaymentLiquido] = useState<number>(0);
  const [editingPaymentIndex, setEditingPaymentIndex] = useState<number | null>(
    null
  );
  const [editPaymentDate, setEditPaymentDate] = useState<string>("");
  const [editPaymentBruto, setEditPaymentBruto] = useState<number>(0);
  const [editPaymentLiquido, setEditPaymentLiquido] = useState<number>(0);
  const [selectedClient, setSelectedClient] = useState<ExtendedClient | null>(
    null
  );
  const [isPaidVisualStatus, setIsPaidVisualStatus] = useState<
    Map<number, boolean>
  >(new Map());

  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const infoModalRef = useRef<HTMLDivElement>(null);
  const { handleUnauthorized } = useAuth();
  const currentDate = useMemo(() => new Date(), []);

  useEffect(() => {
    const newStatusMap = new Map<number, boolean>();
    if (clients) {
      clients.forEach((client) => {
        newStatusMap.set(client.id, client.visualPaymentConfirmed ?? false);
      });
    }
    setIsPaidVisualStatus(newStatusMap);
  }, [clients]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node))
        setOpenMenu(null);
      if (
        isModalOpen &&
        event.target instanceof Element &&
        !event.target.closest(".modal-content")
      )
        closeModal();
      if (
        isInfoModalOpen &&
        event.target instanceof Element &&
        !event.target.closest(".modal-content")
      )
        closeInfoModal();
    };
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
        if (isModalOpen) closeModal();
        if (isInfoModalOpen) closeInfoModal();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [isModalOpen, isInfoModalOpen]);

  const getSortIcon = (columnKey: SortKey) => {
    // CORREÇÃO: Usando o tipo SortKey
    if (sortConfig.key !== columnKey) return <FaSort className="sort-icon" />;
    return sortConfig.direction === "asc" ? (
      <FaSortUp className="sort-icon" />
    ) : (
      <FaSortDown className="sort-icon" />
    );
  };

  const toggleRow = (clientId: number) => {
    setExpandedRows((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleCardClick = (clientId: number, e: React.MouseEvent) => {
    if (e.target instanceof Element && e.target.closest(".action-button"))
      return;
    toggleRow(clientId);
  };

  const toggleMenu = (clientId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const button = buttonRefs.current.get(clientId);
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const menuWidth = 192;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    let top = rect.bottom + window.scrollY + 4;
    let left = rect.left + window.scrollX - menuWidth / 2; // Centraliza melhor o menu
    if (left + menuWidth > windowWidth) left = windowWidth - menuWidth - 10;
    if (left < 10) left = 10;
    if (top + 150 > windowHeight + window.scrollY)
      top = rect.top + window.scrollY - 150;
    setMenuPosition({ top, left });
    setOpenMenu((prev) => (prev === clientId ? null : clientId));
  };

  const setVisualPaidStatus = async (clientId: number, isPaid: boolean) => {
    const originalStatus = isPaidVisualStatus.get(clientId) ?? !isPaid;
    setIsPaidVisualStatus((prev) => new Map(prev).set(clientId, isPaid));
    try {
      await onUpdatePaymentStatus(clientId, isPaid);
    } catch (error) {
      setIsPaidVisualStatus((prev) =>
        new Map(prev).set(clientId, originalStatus)
      );
      if (error instanceof AxiosError && error.response?.status === 401)
        handleUnauthorized();
      else toast.error("Erro ao atualizar status visual");
    }
  };

  const normalizePaymentHistory = (history: unknown): PaymentEntry[] => {
    if (!Array.isArray(history)) return [];
    return history.map((entry: unknown) => {
      // CORREÇÃO: Usando 'unknown' em vez de 'any'
      if (typeof entry === "object" && entry !== null) {
        const pEntry = entry as Partial<PaymentEntry>;
        return {
          paymentDate: pEntry.paymentDate || new Date().toISOString(),
          paymentBruto: pEntry.paymentBruto || 0,
          paymentLiquido: pEntry.paymentLiquido || 0,
        };
      }
      return {
        paymentDate: new Date().toISOString(),
        paymentBruto: 0,
        paymentLiquido: 0,
      };
    });
  };

  const openModal = async (clientId: number) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    try {
      const response = await api.get(`/api/clients/${clientId}`);
      const normalizedClient = {
        ...response.data,
        paymentHistory: normalizePaymentHistory(
          response.data.paymentHistory || []
        ),
      };
      setModalClient(normalizedClient);
      setNewPaymentDate(new Date().toISOString().split("T")[0]);
      setNewPaymentBruto(client.grossAmount);
      setNewPaymentLiquido(client.netAmount);
      setIsModalOpen(true);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401)
        handleUnauthorized();
      else toast.error("Erro ao carregar detalhes do cliente");
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalClient(null);
    setNewPaymentDate("");
    setNewPaymentBruto(0);
    setNewPaymentLiquido(0);
    setEditingPaymentIndex(null);
    setEditPaymentDate("");
    setEditPaymentBruto(0);
    setEditPaymentLiquido(0);
  };

  const openInfoModal = (client: ExtendedClient) => {
    setSelectedClient(client);
    setIsInfoModalOpen(true);
  };

  const closeInfoModal = () => {
    setIsInfoModalOpen(false);
    setSelectedClient(null);
  };

  const handleAddPayment = async () => {
    if (!modalClient) return;
    if (
      !newPaymentDate ||
      isNaN(new Date(newPaymentDate).getTime()) ||
      newPaymentBruto <= 0 ||
      newPaymentLiquido <= 0
    ) {
      toast.error("Por favor, preencha todos os campos com valores válidos.");
      return;
    }
    try {
      const response = await api.put(
        `/api/clients/payment-status/${modalClient.id}`,
        {
          paymentDate: new Date(newPaymentDate).toISOString(),
          paymentBruto: newPaymentBruto,
          paymentLiquido: newPaymentLiquido,
        }
      );
      const updatedClientFromServer = response.data;
      setModalClient({
        ...updatedClientFromServer,
        paymentHistory: normalizePaymentHistory(
          updatedClientFromServer.paymentHistory || []
        ),
      });
      setNewPaymentDate(new Date().toISOString().split("T")[0]);
      setNewPaymentBruto(modalClient.grossAmount);
      setNewPaymentLiquido(modalClient.netAmount);
      toast.success("Pagamento adicionado!");
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401)
        handleUnauthorized();
      else toast.error("Erro ao adicionar pagamento");
    }
  };

  const handleEditPayment = (index: number, payment: PaymentEntry) => {
    setEditingPaymentIndex(index);
    setEditPaymentDate(formatDateToLocal(payment.paymentDate));
    setEditPaymentBruto(payment.paymentBruto ?? 0);
    setEditPaymentLiquido(payment.paymentLiquido ?? 0);
  };

  const handleSaveEditPayment = async () => {
    if (!modalClient || editingPaymentIndex === null) return;
    if (
      !editPaymentDate ||
      isNaN(new Date(editPaymentDate).getTime()) ||
      editPaymentBruto <= 0 ||
      editPaymentLiquido <= 0
    ) {
      toast.error(
        "Por favor, preencha todos os campos de edição com valores válidos."
      );
      return;
    }
    try {
      const response = await api.put(
        `/api/clients/payments/edit/${modalClient.id}`,
        {
          index: editingPaymentIndex,
          paymentDate: new Date(editPaymentDate).toISOString(),
          paymentBruto: editPaymentBruto,
          paymentLiquido: editPaymentLiquido,
        }
      );
      const updatedClientFromServer = response.data;
      setModalClient({
        ...updatedClientFromServer,
        paymentHistory: normalizePaymentHistory(
          updatedClientFromServer.paymentHistory || []
        ),
      });
      setEditingPaymentIndex(null);
      toast.success("Pagamento atualizado!");
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401)
        handleUnauthorized();
      else toast.error("Erro ao atualizar pagamento");
    }
  };

  const handleDeletePayment = async (index: number) => {
    if (!modalClient) return;
    try {
      const response = await api.delete(
        `/api/clients/payments/delete/${modalClient.id}`,
        { data: { index } }
      );
      const updatedClientFromServer = response.data;
      setModalClient({
        ...updatedClientFromServer,
        paymentHistory: normalizePaymentHistory(
          updatedClientFromServer.paymentHistory || []
        ),
      });
      toast.success("Pagamento excluído!");
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401)
        handleUnauthorized();
      else toast.error("Erro ao excluir pagamento");
    }
  };

  const getPlanClass = (planName: string) => {
    switch (planName?.toLowerCase()) {
      case "p2p":
        return "plan-text--p2p";
      case "platinum":
        return "plan-text--platinum";
      case "comum":
        return "plan-text--comum";
      default:
        return "plan-text--outros";
    }
  };

  const getMethodClass = (methodName: string) => {
    switch (methodName?.toLowerCase()) {
      case "nubank":
        return "method-text--nubank";
      case "banco do brasil":
        return "method-text--banco-do-brasil";
      case "caixa":
        return "method-text--caixa";
      case "picpay":
        return "method-text--picpay";
      case "pagseguro":
        return "method-text--pagseguro";
      default:
        return "method-text--outros";
    }
  };

  return (
    <>
      <div
        className={`clients-table-container hidden md:block transition-opacity duration-300 ${
          isFetching ? "opacity-50" : "opacity-100"
        }`}
      >
        <div className="table-wrapper">
          <table className="clients-table">
            <thead>
              <tr>
                <th className="status-column">Pago</th>
                <th
                  className="user-column"
                  onClick={() => onSort("user.username")}
                >
                  Usuário {getSortIcon("user.username")}
                </th>
                <th className="name-column" onClick={() => onSort("fullName")}>
                  Nome {getSortIcon("fullName")}
                </th>
                <th
                  className="email-column hidden md:table-cell"
                  onClick={() => onSort("email")}
                >
                  Email {getSortIcon("email")}
                </th>
                <th
                  className="phone-column hidden sm:table-cell"
                  onClick={() => onSort("phone")}
                >
                  Telefone {getSortIcon("phone")}
                </th>
                <th
                  className="plan-column hidden lg:table-cell"
                  onClick={() => onSort("plan.name")}
                >
                  Plano {getSortIcon("plan.name")}
                </th>
                <th
                  className="method-column hidden xl:table-cell"
                  onClick={() => onSort("paymentMethod.name")}
                >
                  Pagamento {getSortIcon("paymentMethod.name")}
                </th>
                <th
                  className="due-date-column hidden xl:table-cell"
                  onClick={() => onSort("dueDate")}
                >
                  Vencimento {getSortIcon("dueDate")}
                </th>
                <th
                  className="gross-amount-column hidden 2xl:table-cell"
                  onClick={() => onSort("grossAmount")}
                >
                  $ Bruto {getSortIcon("grossAmount")}
                </th>
                <th
                  className="net-amount-column hidden 2xl:table-cell"
                  onClick={() => onSort("netAmount")}
                >
                  $ Líquido {getSortIcon("netAmount")}
                </th>
                <th className="actions-column">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td className="status-column">
                    <button
                      onClick={() => openModal(client.id)}
                      className={`action-button p-2 rounded-full transition-all ${
                        isPaidVisualStatus.get(client.id)
                          ? "bg-[rgba(0,218,119,0.2)] border-2 border-[var(--button-active-bg)] scale-110"
                          : "bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.3)]"
                      }`}
                      title={
                        isPaidVisualStatus.get(client.id)
                          ? "Verificado (visual)"
                          : "Não Verificado (visual)"
                      }
                    >
                      {isPaidVisualStatus.get(client.id) ? (
                        <FaCheck
                          size={16}
                          className="text-[var(--button-active-bg)]"
                        />
                      ) : (
                        <FaTimes
                          size={16}
                          className="text-[var(--danger-bg)]"
                        />
                      )}
                    </button>
                  </td>
                  <td className="user-column">{client.user.username}</td>
                  <td className="name-column">{client.fullName}</td>
                  <td className="email-column hidden md:table-cell">
                    {client.email}
                  </td>
                  <td className="phone-column hidden sm:table-cell">
                    {client.phone}
                  </td>
                  <td className="plan-column hidden lg:table-cell">
                    <span className={getPlanClass(client.plan.name)}>
                      {client.plan.name}
                    </span>
                  </td>
                  <td className="method-column hidden xl:table-cell">
                    <span
                      className={getMethodClass(
                        client.paymentMethod?.name || ""
                      )}
                    >
                      {client.paymentMethod?.name}
                    </span>
                  </td>
                  <td className="due-date-column hidden xl:table-cell">
                    <span
                      className={getDueDateClass(client.dueDate, currentDate)}
                    >
                      {formatDateToUTC(client.dueDate)}
                    </span>
                  </td>
                  <td className="gross-amount-column hidden 2xl:table-cell">
                    R$ {client.grossAmount.toFixed(2)}
                  </td>
                  <td className="net-amount-column hidden 2xl:table-cell">
                    R$ {client.netAmount.toFixed(2)}
                  </td>
                  <td className="actions-column relative">
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openInfoModal(client);
                        }}
                        className="action-button"
                        title="Mais Informações"
                      >
                        <FaInfoCircle size={16} />
                      </button>
                      <button
                        ref={(el) => {
                          if (el) {
                            buttonRefs.current.set(client.id, el);
                          } else {
                            buttonRefs.current.delete(client.id);
                          }
                        }}
                        onClick={(e) => toggleMenu(client.id, e)}
                        className="action-button"
                        title="Ações"
                      >
                        <FaEllipsisV size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div
        className={`md:hidden space-y-4 transition-opacity duration-300 ${
          isFetching ? "opacity-50" : "opacity-100"
        }`}
      >
        {clients.map((client) => (
          <div
            key={client.id}
            className="client-card bg-[var(--table-bg)] backdrop-blur-sm rounded-lg p-4 shadow-md"
            onClick={(e) => handleCardClick(client.id, e)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {client.fullName}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Usuário: <span style={{ color: "#AE7DAC" }}></span>{" "}
                  {client.user.username}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Plano:{" "}
                  <span className={getPlanClass(client.plan.name)}>
                    {client.plan.name}
                  </span>
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Método:{" "}
                  <span
                    className={getMethodClass(client.paymentMethod?.name || "")}
                  >
                    {client.paymentMethod?.name}
                  </span>
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Vencimento:{" "}
                  <span
                    className={getDueDateClass(client.dueDate, currentDate)}
                  >
                    {formatDateToUTC(client.dueDate)}
                  </span>
                </p>
              </div>
              <button
                onClick={() => openModal(client.id)}
                className={`action-button p-2 rounded-full transition-all ${
                  isPaidVisualStatus.get(client.id)
                    ? "bg-[rgba(0,218,119,0.2)] border-2 border-[var(--button-active-bg)] scale-110"
                    : "bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.3)]"
                }`}
                title={
                  isPaidVisualStatus.get(client.id)
                    ? "Verificado (visual)"
                    : "Não Verificado (visual)"
                }
              >
                {isPaidVisualStatus.get(client.id) ? (
                  <FaCheck
                    size={16}
                    className="text-[var(--button-active-bg)]"
                  />
                ) : (
                  <FaTimes size={16} className="text-[var(--danger-bg)]" />
                )}
              </button>
            </div>
            {expandedRows.includes(client.id) && (
              <div className="mt-3 space-y-2 expanded-content">
                <p className="text-sm text-[var(--text-primary)]">
                  Email: {client.email}
                </p>
                <p className="text-sm text-[var(--text-primary)]">
                  Telefone: {client.phone}
                </p>
                <p className="text-sm text-[var(--text-primary)]">
                  Valor Bruto: R$ {client.grossAmount.toFixed(2)}
                </p>
                <p className="text-sm text-[var(--text-primary)]">
                  Valor Líquido: R$ {client.netAmount.toFixed(2)}
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openInfoModal(client);
                    }}
                    className="action-button"
                    title="Mais Informações"
                  >
                    <FaInfoCircle size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(client);
                    }}
                    className="action-button edit"
                    title="Editar"
                  >
                    <FaEdit size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(client.id);
                    }}
                    className="action-button delete"
                    title="Excluir"
                  >
                    <FaTrash size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRenew(client);
                    }}
                    className="action-button renew"
                    title="Renovar"
                  >
                    <FaBolt size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {openMenu !== null &&
        clients.find((client) => client.id === openMenu) &&
        createPortal(
          <div
            className="action-menu"
            ref={menuRef}
            style={{
              position: "fixed",
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              zIndex: 1000,
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(null);
                onEdit(clients.find((client) => client.id === openMenu)!);
              }}
              className="action-menu-item"
            >
              <FaEdit size={16} className="text-[var(--accent-blue)]" /> Editar
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(null);
                onDelete(openMenu);
              }}
              className="action-menu-item"
            >
              <FaTrash size={16} className="text-[var(--accent-blue)]" />{" "}
              Excluir
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(null);
                onRenew(clients.find((client) => client.id === openMenu)!);
              }}
              className="action-menu-item"
            >
              <FaBolt size={16} className="text-[var(--accent-blue)]" /> Renovar
            </button>
          </div>,
          document.body
        )}

      {isModalOpen &&
        modalClient &&
        createPortal(
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Gerenciar Pagamentos</h2>
                <button onClick={closeModal} className="modal-close-button">
                  <FaTimes size={20} />
                </button>
              </div>
              <div className="modal-body">
                <h3 className="text-lg font-semibold mb-2 text-white">
                  <span style={{ color: "#AE7DAC" }}>Usuário</span>:{" "}
                  {modalClient.user.username}
                </h3>
                <h3 className="text-lg font-semibold mb-3 mt-2 flex items-center">
                  Status Visual
                  <button
                    onClick={() => setVisualPaidStatus(modalClient.id, true)}
                    className={`p-2 ml-2 rounded-full transition-all status-visual-button ${
                      isPaidVisualStatus.get(modalClient.id)
                        ? "bg-[rgba(0,218,119,0.2)] border-2 border-[var(--button-active-bg)] scale-110"
                        : "bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.3)]"
                    }`}
                    title="Marcar como Pago (visual)"
                  >
                    <FaCheck
                      size={isPaidVisualStatus.get(modalClient.id) ? 18 : 16}
                      className={`${
                        isPaidVisualStatus.get(modalClient.id)
                          ? "text-[var(--button-active-bg)]"
                          : "text-[var(--text-secondary)]"
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => setVisualPaidStatus(modalClient.id, false)}
                    className={`p-2 ml-2 rounded-full transition-all status-visual-button ${
                      !isPaidVisualStatus.get(modalClient.id)
                        ? "bg-[rgba(255,77,79,0.2)] border-2 border-[var(--danger-bg)] scale-110"
                        : "bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.3)]"
                    }`}
                    title="Marcar como Não Pago (visual)"
                  >
                    <FaTimes
                      size={!isPaidVisualStatus.get(modalClient.id) ? 18 : 16}
                      className={`${
                        !isPaidVisualStatus.get(modalClient.id)
                          ? "text-[var(--danger-bg)]"
                          : "text-[var(--text-secondary)]"
                      }`}
                    />
                  </button>
                </h3>
                <h3 className="text-lg font-semibold mb-2">
                  Adicionar Pagamento
                </h3>
                <div className="flex flex-col gap-4 mb-4">
                  <div className="flex flex-wrap gap-5">
                    <div className="flex-1 min-w-[200px] w-[40%]">
                      <label className="modal-label">Bruto (R$)</label>
                      <input
                        type="number"
                        value={newPaymentBruto === 0 ? "" : newPaymentBruto}
                        onChange={(e) =>
                          setNewPaymentBruto(
                            e.target.value === ""
                              ? 0
                              : parseFloat(e.target.value)
                          )
                        }
                        className="modal-input w-full"
                        min="0"
                        step="0.01"
                        placeholder="Digite o valor bruto"
                      />
                    </div>
                    <div className="flex-1 min-w-[200px] w-[40%]">
                      <label className="modal-label">Líquido (R$)</label>
                      <input
                        type="number"
                        value={newPaymentLiquido === 0 ? "" : newPaymentLiquido}
                        onChange={(e) =>
                          setNewPaymentLiquido(
                            e.target.value === ""
                              ? 0
                              : parseFloat(e.target.value)
                          )
                        }
                        className="modal-input w-full"
                        min="0"
                        step="0.01"
                        placeholder="Digite o valor líquido"
                      />
                    </div>
                  </div>
                  <div className="flex items-end gap-5">
                    <div className="flex-1 min-w-[200px] w-[40%]">
                      <label className="modal-label">Data</label>
                      <input
                        type="date"
                        value={newPaymentDate}
                        onChange={(e) => setNewPaymentDate(e.target.value)}
                        className="modal-input w-full"
                      />
                    </div>
                    <button
                      onClick={handleAddPayment}
                      className="modal-button modal-button-save h-[38px] flex items-center justify-center"
                      style={{ width: "40%" }}
                    >
                      Add
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Pagamentos Registrados
                </h3>
                {modalClient.paymentHistory &&
                modalClient.paymentHistory.length > 0 ? (
                  <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="border p-2 sticky top-0 bg-[var(--table-bg)] z-10">
                            Data
                          </th>
                          <th className="border p-2 sticky top-0 bg-[var(--table-bg)] z-10">
                            Bruto (R$)
                          </th>
                          <th className="border p-2 sticky top-0 bg-[var(--table-bg)] z-10">
                            Líquido (R$)
                          </th>
                          <th className="border p-2 sticky top-0 bg-[var(--table-bg)] z-10">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {modalClient.paymentHistory.map((payment, index) => (
                          <tr key={index}>
                            {editingPaymentIndex === index ? (
                              <>
                                <td className="border p-2">
                                  <input
                                    type="date"
                                    value={editPaymentDate}
                                    onChange={(e) =>
                                      setEditPaymentDate(e.target.value)
                                    }
                                    className="modal-input w-full"
                                  />
                                </td>
                                <td className="border p-2">
                                  <input
                                    type="number"
                                    value={
                                      editPaymentBruto === 0
                                        ? ""
                                        : editPaymentBruto
                                    }
                                    onChange={(e) =>
                                      setEditPaymentBruto(
                                        e.target.value === ""
                                          ? 0
                                          : parseFloat(e.target.value)
                                      )
                                    }
                                    className="modal-input w-full"
                                    min="0"
                                    step="0.01"
                                    placeholder="Digite o valor bruto"
                                  />
                                </td>
                                <td className="border p-2">
                                  <input
                                    type="number"
                                    value={
                                      editPaymentLiquido === 0
                                        ? ""
                                        : editPaymentLiquido
                                    }
                                    onChange={(e) =>
                                      setEditPaymentLiquido(
                                        e.target.value === ""
                                          ? 0
                                          : parseFloat(e.target.value)
                                      )
                                    }
                                    className="modal-input w-full"
                                    min="0"
                                    step="0.01"
                                    placeholder="Digite o valor líquido"
                                  />
                                </td>
                                <td className="border p-2">
                                  <button
                                    onClick={handleSaveEditPayment}
                                    className="action-button mr-2"
                                  >
                                    <FaSave
                                      size={16}
                                      className="text-green-500"
                                    />
                                  </button>
                                  <button
                                    onClick={() => setEditingPaymentIndex(null)}
                                    className="action-button"
                                  >
                                    <FaTimes
                                      size={16}
                                      className="text-red-500"
                                    />
                                  </button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="border p-2">
                                  {formatDateToUTC(payment.paymentDate)}
                                </td>
                                <td className="border p-2">
                                  {payment.paymentBruto?.toFixed(2) ?? "0.00"}
                                </td>
                                <td className="border p-2">
                                  {payment.paymentLiquido?.toFixed(2) ?? "0.00"}
                                </td>
                                <td className="border p-2">
                                  <button
                                    onClick={() =>
                                      handleEditPayment(index, payment)
                                    }
                                    className="action-button mr-2"
                                  >
                                    <FaEdit
                                      size={16}
                                      className="text-blue-500"
                                    />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePayment(index)}
                                    className="action-button"
                                  >
                                    <FaTrash
                                      size={16}
                                      className="text-red-500"
                                    />
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[var(--text-primary)]">
                    Nenhum pagamento registrado.
                  </p>
                )}
              </div>
              <div className="modal-footer">
                <button
                  onClick={closeModal}
                  className="modal-button modal-button-cancel"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      {isInfoModalOpen &&
        selectedClient &&
        createPortal(
          <div className="modal-overlay" onClick={closeInfoModal}>
            <div
              className="modal-content"
              ref={infoModalRef}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 className="modal-title">Detalhes do Cliente</h2>
                <button onClick={closeInfoModal} className="modal-close-button">
                  <FaTimes size={20} />
                </button>
              </div>
              <div className="modal-body">
                <p>
                  <strong>Usuário:</strong> {selectedClient.user.username}
                </p>
                <p>
                  <strong>Nome:</strong> {selectedClient.fullName}
                </p>
                <p>
                  <strong>Email:</strong> {selectedClient.email}
                </p>
                <p>
                  <strong>Telefone:</strong>{" "}
                  {selectedClient.phone || "Não informado"}
                </p>
                <p>
                  <strong>Plano:</strong> {selectedClient.plan.name}
                </p>
                <p>
                  <strong>Método de Pagamento:</strong>{" "}
                  {selectedClient.paymentMethod?.name}
                </p>
                <p>
                  <strong>Data de Vencimento:</strong>{" "}
                  {formatDateToUTC(selectedClient.dueDate)}
                </p>
                <p>
                  <strong>Valor Bruto:</strong> R${" "}
                  {selectedClient.grossAmount.toFixed(2)}
                </p>
                <p>
                  <strong>Valor Líquido:</strong> R${" "}
                  {selectedClient.netAmount.toFixed(2)}
                </p>
                <p>
                  <strong>Observações:</strong>{" "}
                  {selectedClient.observations || "Nenhuma"}
                </p>
              </div>
              <div className="modal-footer">
                <button
                  onClick={closeInfoModal}
                  className="modal-button modal-button-cancel"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
});
