//frontend/src/app/clients/components/ClientsTable.tsx

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
} from "react-icons/fa";
import { Client } from "../types";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Skeleton } from "@mui/material";

const formatDateToUTC = (date: string | Date): string => {
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

interface ClientsTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (id: number) => void;
  onRenew: (client: Client) => void;
  onSort: (
    key:
      | keyof Omit<Client, "plan" | "paymentMethod">
      | "plan.name"
      | "paymentMethod.name"
  ) => void;
  sortConfig: {
    key:
      | keyof Omit<Client, "plan" | "paymentMethod">
      | "plan.name"
      | "paymentMethod.name"
      | null;
    direction: "asc" | "desc";
  };
  onUpdatePaymentStatus?: (
    clientId: number,
    verified: boolean,
    date?: string
  ) => void;
  isFetching?: boolean;
  isLoading?: boolean;
  onUpdateObservations?: (id: number, observations: string) => void;
}

export default function ClientsTable({
  clients,
  onEdit,
  onDelete,
  onRenew,
  onSort,
  sortConfig,
  onUpdatePaymentStatus,
  isFetching = false,
  isLoading = false,
}: ClientsTableProps) {
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [modalClientId, setModalClientId] = useState<number | null>(null);
  const [modalIsVerified, setModalIsVerified] = useState<boolean>(false);
  const [modalDate, setModalDate] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const infoModalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
      if (
        infoModalRef.current &&
        !infoModalRef.current.contains(event.target as Node) &&
        event.target instanceof Element &&
        event.target.closest(".modal-overlay")
      ) {
        closeInfoModal();
      }
      if (
        isModalOpen &&
        event.target instanceof Element &&
        !event.target.closest(".modal-content")
      ) {
        closeModal();
      }
      if (
        isInfoModalOpen &&
        event.target instanceof Element &&
        !event.target.closest(".modal-content")
      ) {
        closeInfoModal();
      }
    };

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
        closeInfoModal();
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

  const getSortIcon = (
    columnKey:
      | keyof Omit<Client, "plan" | "paymentMethod">
      | "plan.name"
      | "paymentMethod.name"
  ) => {
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
    let left = rect.left + window.scrollX;

    if (left + menuWidth > windowWidth) {
      left = windowWidth - menuWidth - 10;
    }
    if (top + 150 > windowHeight + window.scrollY) {
      top = rect.top + window.scrollY - 150;
    }

    setMenuPosition({ top, left });
    setOpenMenu((prev) => (prev === clientId ? null : clientId));
  };

  const openModal = (clientId: number, isVerified: boolean) => {
    setModalClientId(clientId);
    setModalIsVerified(isVerified);
    setIsModalOpen(true);
    setModalDate(isVerified ? "" : new Date().toISOString().split("T")[0]);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalClientId(null);
    setModalIsVerified(false);
    setModalDate("");
  };

  const openInfoModal = (client: Client) => {
    setSelectedClient(client);
    setIsInfoModalOpen(true);
  };

  const closeInfoModal = () => {
    setIsInfoModalOpen(false);
    setSelectedClient(null);
  };

  const handleModalSubmit = () => {
    if (!onUpdatePaymentStatus || modalClientId === null) return;

    if (modalIsVerified) {
      onUpdatePaymentStatus(modalClientId, false);
    } else {
      if (!modalDate || isNaN(new Date(modalDate).getTime())) {
        alert("Data inválida. Use o formato YYYY-MM-DD.");
        return;
      }
      onUpdatePaymentStatus(modalClientId, true, modalDate);
    }
    closeModal();
    setOpenMenu(null);
  };

  const getPlanClass = (planName: string) => {
    switch (planName.toLowerCase()) {
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
    switch (methodName.toLowerCase()) {
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

  if (isLoading) {
    return (
      <>
        <div className="clients-table-container hidden md:block">
          <div className="table-wrapper">
            <table className="clients-table">
              <thead>
                <tr>
                  <th className="status-column">
                    <Skeleton variant="text" width={50} />
                  </th>
                  <th className="name-column">
                    <Skeleton variant="text" width={150} />
                  </th>
                  <th className="email-column hidden md:table-cell">
                    <Skeleton variant="text" width={200} />
                  </th>
                  <th className="phone-column hidden sm:table-cell">
                    <Skeleton variant="text" width={100} />
                  </th>
                  <th className="plan-column hidden lg:table-cell">
                    <Skeleton variant="text" width={120} />
                  </th>
                  <th className="method-column hidden xl:table-cell">
                    <Skeleton variant="text" width={120} />
                  </th>
                  <th className="due-date-column hidden xl:table-cell">
                    <Skeleton variant="text" width={100} />
                  </th>
                  <th className="gross-amount-column hidden 2xl:table-cell">
                    <Skeleton variant="text" width={80} />
                  </th>
                  <th className="net-amount-column hidden 2xl:table-cell">
                    <Skeleton variant="text" width={80} />
                  </th>
                  <th className="actions-column">
                    <Skeleton variant="text" width={40} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, index) => (
                  <tr key={index}>
                    <td className="status-column">
                      <Skeleton variant="text" width={50} />
                    </td>
                    <td className="name-column">
                      <Skeleton variant="text" width={150} />
                    </td>
                    <td className="email-column hidden md:table-cell">
                      <Skeleton variant="text" width={200} />
                    </td>
                    <td className="phone-column hidden sm:table-cell">
                      <Skeleton variant="text" width={100} />
                    </td>
                    <td className="plan-column hidden lg:table-cell">
                      <Skeleton variant="text" width={120} />
                    </td>
                    <td className="method-column hidden xl:table-cell">
                      <Skeleton variant="text" width={120} />
                    </td>
                    <td className="due-date-column hidden xl:table-cell">
                      <Skeleton variant="text" width={100} />
                    </td>
                    <td className="gross-amount-column hidden 2xl:table-cell">
                      <Skeleton variant="text" width={80} />
                    </td>
                    <td className="net-amount-column hidden 2xl:table-cell">
                      <Skeleton variant="text" width={80} />
                    </td>
                    <td className="actions-column">
                      <Skeleton variant="text" width={40} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="md:hidden space-y-4">
          {[...Array(5)].map((_, index) => (
            <div
              key={index}
              className="client-card bg-[var(--table-bg)] backdrop-blur-sm rounded-lg p-4 shadow-md"
            >
              <div className="flex justify-between items-start">
                <div>
                  <Skeleton variant="text" width={150} height={30} />
                  <Skeleton variant="text" width={120} height={20} />
                  <Skeleton variant="text" width={100} height={20} />
                  <Skeleton variant="text" width={80} height={20} />
                </div>
                <Skeleton variant="circular" width={24} height={24} />
              </div>
              <div className="mt-3 space-y-2 expanded-content">
                <Skeleton variant="text" width={200} height={20} />
                <Skeleton variant="text" width={150} height={20} />
                <Skeleton variant="text" width={150} height={20} />
                <div className="flex gap-2 mt-2">
                  <Skeleton variant="rectangular" width={40} height={40} />
                  <Skeleton variant="rectangular" width={40} height={40} />
                  <Skeleton variant="rectangular" width={40} height={40} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="clients-table-container hidden md:block">
        <div className="table-wrapper">
          <table className={`clients-table ${isFetching ? "fade" : ""}`}>
            <thead>
              <tr>
                <th className="status-column">Status Pag</th>
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
                  Método de Pagamento {getSortIcon("paymentMethod.name")}
                </th>
                <th
                  className="due-date-column hidden xl:table-cell"
                  onClick={() => onSort("dueDate")}
                >
                  Data de Vencimento {getSortIcon("dueDate")}
                </th>
                <th
                  className="gross-amount-column hidden 2xl:table-cell"
                  onClick={() => onSort("grossAmount")}
                >
                  Valor Bruto {getSortIcon("grossAmount")}
                </th>
                <th
                  className="net-amount-column hidden 2xl:table-cell"
                  onClick={() => onSort("netAmount")}
                >
                  Valor Líquido {getSortIcon("netAmount")}
                </th>
                <th className="actions-column">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td className="status-column">
                    <button
                      onClick={() =>
                        openModal(client.id, client.paymentVerified)
                      }
                      className="action-button"
                      title={
                        client.paymentVerified ? "Verificado" : "Não Verificado"
                      }
                    >
                      {client.paymentVerified ? (
                        <FaCheck className="text-green-500" />
                      ) : (
                        <FaTimes className="text-red-500" />
                      )}
                    </button>
                  </td>
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
                    <span className={getMethodClass(client.paymentMethod.name)}>
                      {client.paymentMethod.name}
                    </span>
                  </td>
                  <td className="due-date-column hidden xl:table-cell">
                    {formatDateToUTC(client.dueDate)}
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
                        onClick={() => openInfoModal(client)}
                        className="action-button"
                        title="Mais Informações"
                      >
                        <FaInfoCircle size={16} />
                      </button>
                      <button
                        ref={(el) => {
                          if (el) buttonRefs.current.set(client.id, el);
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

      <div className="md:hidden space-y-4">
        {clients.map((client) => (
          <div
            key={client.id}
            className={`client-card bg-[var(--table-bg)] backdrop-blur-sm rounded-lg p-4 shadow-md ${
              isFetching ? "fade" : ""
            }`}
            onClick={(e) => handleCardClick(client.id, e)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {client.fullName}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Plano:{" "}
                  <span className={getPlanClass(client.plan.name)}>
                    {client.plan.name}
                  </span>
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Método:{" "}
                  <span className={getMethodClass(client.paymentMethod.name)}>
                    {client.paymentMethod.name}
                  </span>
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Vencimento: {formatDateToUTC(client.dueDate)}
                </p>
              </div>
              <button
                onClick={() => openModal(client.id, client.paymentVerified)}
                className="action-button"
                title={client.paymentVerified ? "Verificado" : "Não Verificado"}
              >
                {client.paymentVerified ? (
                  <FaCheck className="text-green-500" />
                ) : (
                  <FaTimes className="text-red-500" />
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
                    onClick={() => openInfoModal(client)}
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

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modalIsVerified
                  ? "Marcar como Não Verificado?"
                  : "Marcar como Verificado?"}
              </h2>
              <button onClick={closeModal} className="modal-close-button">
                <FaTimes size={20} />
              </button>
            </div>
            <div className="modal-body">
              {!modalIsVerified && (
                <div>
                  <label className="modal-label">Data de Recebimento</label>
                  <input
                    type="date"
                    value={modalDate}
                    onChange={(e) => setModalDate(e.target.value)}
                    className="modal-input"
                  />
                </div>
              )}
              <p className="text-[var(--text-primary)] mt-2">
                Deseja confirmar esta ação?
              </p>
            </div>
            <div className="modal-footer">
              <button
                onClick={closeModal}
                className="modal-button modal-button-cancel"
              >
                Cancelar
              </button>
              <button
                onClick={handleModalSubmit}
                className="modal-button modal-button-save"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {isInfoModalOpen && selectedClient && (
        <div className="modal-overlay" onClick={closeInfoModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Detalhes do Cliente</h2>
              <button onClick={closeInfoModal} className="modal-close-button">
                <FaTimes size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="text-[var(--text-primary)] mb-2">
                <strong>Nome:</strong> {selectedClient.fullName}
              </p>
              <p className="text-[var(--text-primary)] mb-2">
                <strong>Email:</strong> {selectedClient.email}
              </p>
              <p className="text-[var(--text-primary)] mb-2">
                <strong>Telefone:</strong> {selectedClient.phone}
              </p>
              <p className="text-[var(--text-primary)] mb-2">
                <strong>Plano:</strong>{" "}
                <span className={getPlanClass(selectedClient.plan.name)}>
                  {selectedClient.plan.name}
                </span>
              </p>
              <p className="text-[var(--text-primary)] mb-2">
                <strong>Método de Pagamento:</strong>{" "}
                <span
                  className={getMethodClass(selectedClient.paymentMethod.name)}
                >
                  {selectedClient.paymentMethod.name}
                </span>
              </p>
              <p className="text-[var(--text-primary)] mb-2">
                <strong>Data de Vencimento:</strong>{" "}
                {formatDateToUTC(selectedClient.dueDate)}
              </p>
              <p className="text-[var(--text-primary)] mb-2">
                <strong>Valor Bruto:</strong> R${" "}
                {selectedClient.grossAmount.toFixed(2)}
              </p>
              <p className="text-[var(--text-primary)] mb-2">
                <strong>Valor Líquido:</strong> R${" "}
                {selectedClient.netAmount.toFixed(2)}
              </p>
              <p className="text-[var(--text-primary)] mb-2">
                <strong>Observações:</strong>{" "}
                {selectedClient.observations ||
                  "Nenhuma observação disponível."}
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
        </div>
      )}
    </>
  );
}
