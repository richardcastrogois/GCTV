//backend/src/app/expired/components/ExpiredClientsTable.tsx

"use client";

import {
  FaSort,
  FaSortUp,
  FaSortDown,
  FaBolt,
  FaInfoCircle,
  FaTimes,
  FaPencilAlt,
} from "react-icons/fa";
import { Client } from "../../clients/types";
import { useState, useEffect, useRef, memo } from "react";

const formatDateToUTC = (date: string | Date): string => {
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

interface ExpiredClientsTableProps {
  clients: Client[];
  onSort: (key: keyof Client | "plan.name" | "user.username") => void;
  onReactivate: (client: Client, newDueDate: string) => void;
  sortConfig: {
    key: keyof Client | "plan.name" | "user.username" | null;
    direction: "asc" | "desc";
  };
  isFetching?: boolean;
}

const ExpiredClientsTable = memo(function ExpiredClientsTable({
  clients,
  onSort,
  onReactivate,
  sortConfig,
  isFetching = false,
}: ExpiredClientsTableProps) {
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientToReactivate, setClientToReactivate] = useState<Client | null>(
    null
  );
  const [newDueDate, setNewDueDate] = useState<string>("");

  const infoModalRef = useRef<HTMLDivElement>(null);
  const confirmModalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeInfoModal();
        closeConfirmModal();
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isInfoModalOpen &&
        infoModalRef.current &&
        !infoModalRef.current.contains(e.target as Node)
      ) {
        closeInfoModal();
      }
      if (
        isConfirmModalOpen &&
        confirmModalRef.current &&
        !confirmModalRef.current.contains(e.target as Node)
      ) {
        closeConfirmModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isInfoModalOpen, isConfirmModalOpen]);

  const getSortIcon = (
    columnKey: keyof Client | "plan.name" | "user.username"
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
        : [clientId]
    );
  };

  const handleCardClick = (clientId: number, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".action-button")) return;
    toggleRow(clientId);
  };

  const openInfoModal = (client: Client) => {
    setSelectedClient(client);
    setIsInfoModalOpen(true);
  };
  const closeInfoModal = () => {
    setIsInfoModalOpen(false);
    setSelectedClient(null);
  };

  const openConfirmModal = (client: Client) => {
    setClientToReactivate(client);
    setNewDueDate(new Date().toISOString().split("T")[0]);
    setIsConfirmModalOpen(true);
  };
  const closeConfirmModal = () => {
    setIsConfirmModalOpen(false);
    setClientToReactivate(null);
    setNewDueDate("");
  };

  const handleConfirmReactivate = () => {
    if (clientToReactivate && newDueDate) {
      if (isNaN(new Date(newDueDate).getTime())) {
        alert("Data inválida. Use o formato YYYY-MM-DD.");
        return;
      }
      onReactivate(clientToReactivate, newDueDate);
    }
    closeConfirmModal();
  };

  const getStatusClass = (isActive: boolean) =>
    isActive ? "status-text--ativo" : "status-text--inativo";
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
                  className="email-column hidden lg:table-cell"
                  onClick={() => onSort("email")}
                >
                  Email {getSortIcon("email")}
                </th>
                <th className="plan-column" onClick={() => onSort("plan.name")}>
                  Plano {getSortIcon("plan.name")}
                </th>
                <th
                  className="due-date-column"
                  onClick={() => onSort("dueDate")}
                >
                  Vencimento {getSortIcon("dueDate")}
                </th>
                <th
                  className="status-column"
                  onClick={() => onSort("isActive")}
                >
                  Status {getSortIcon("isActive")}
                </th>
                <th className="actions-column">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className={expandedRows.includes(client.id) ? "expanded" : ""}
                  onClick={(e) => handleCardClick(client.id, e)}
                >
                  <td className="user-column">
                    {client.user?.username || "Sem usuário"}
                  </td>
                  <td className="name-column">{client.fullName}</td>
                  <td className="email-column hidden lg:table-cell">
                    {client.email}
                  </td>
                  <td className="plan-column">
                    <span className={getPlanClass(client.plan.name)}>
                      {client.plan.name}
                    </span>
                  </td>
                  <td className="due-date-column">
                    {formatDateToUTC(client.dueDate)}
                  </td>
                  <td className="status-column">
                    <span className={getStatusClass(client.isActive)}>
                      {client.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="actions-column">
                    <div className="flex justify-center space-x-2">
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
                          openConfirmModal(client);
                        }}
                        className="action-button"
                        title="Reativar"
                      >
                        <FaBolt size={16} />
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
                <p className="text-sm text-[var(--text-secondary)]">
                  Usuário: {client.user?.username || "Sem usuário"}
                </p>
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
                  Vencimento: {formatDateToUTC(client.dueDate)}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Status:{" "}
                  <span className={getStatusClass(client.isActive)}>
                    {client.isActive ? "Ativo" : "Inativo"}
                  </span>
                </p>
              </div>
            </div>
            {expandedRows.includes(client.id) && (
              <div className="mt-3 space-y-2 expanded-content">
                <p className="text-sm text-[var(--text-primary)]">
                  Email: {client.email}
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
                      openConfirmModal(client);
                    }}
                    className="action-button"
                    title="Reativar"
                  >
                    <FaBolt size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {isInfoModalOpen && selectedClient && (
        <div className="modal-overlay">
          <div className="modal-content" ref={infoModalRef}>
            <div className="modal-header">
              <h2 className="modal-title">Detalhes do Cliente</h2>
              <button onClick={closeInfoModal} className="modal-close-button">
                <FaTimes size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="text-[var(--text-primary)] mb-2">
                <strong>Usuário:</strong>{" "}
                {selectedClient.user?.username || "Sem usuário"}
              </p>
              <p className="text-[var(--text-primary)] mb-2">
                <strong>Nome:</strong> {selectedClient.fullName}
              </p>
              <p className="text-[var(--text-primary)] mb-2">
                <strong>Email:</strong> {selectedClient.email}
              </p>
              <p className="text-[var(--text-primary)] mb-2">
                <strong>Telefone:</strong>{" "}
                {selectedClient.phone || "Não informado"}
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
              <p className="text-[var(--text-primary)] mb-2 flex items-center">
                <strong>Observações:</strong>{" "}
                {selectedClient.observations || "Nenhuma observação"}{" "}
                <FaPencilAlt
                  size={14}
                  className="ml-2 cursor-pointer text-[var(--accent-blue)]"
                  title="Editar Observações"
                />
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

      {isConfirmModalOpen && clientToReactivate && (
        <div className="modal-overlay">
          <div className="modal-content" ref={confirmModalRef}>
            <div className="modal-header">
              <h2 className="modal-title">Confirmar Reativação</h2>
              <button
                onClick={closeConfirmModal}
                className="modal-close-button"
              >
                <FaTimes size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="text-[var(--text-primary)] mb-2">
                Tem certeza que deseja reativar o cliente?
              </p>
              <p className="text-[var(--text-primary)] mb-2">
                <strong>Usuário:</strong>{" "}
                {clientToReactivate.user?.username || "Sem usuário"}
              </p>
              <p className="text-[var(--text-primary)] mb-2">
                <strong>Nome:</strong> {clientToReactivate.fullName}
              </p>
              <p className="text-[var(--text-primary)] mb-2">
                <strong>Email:</strong> {clientToReactivate.email}
              </p>
              <p className="text-[var(--text-primary)] mb-2">
                <strong>Telefone:</strong>{" "}
                {clientToReactivate.phone || "Não informado"}
              </p>
              <p className="text-[var(--text-primary)] mb-2">
                <strong>Plano:</strong>{" "}
                <span className={getPlanClass(clientToReactivate.plan.name)}>
                  {clientToReactivate.plan.name}
                </span>
              </p>
              <p className="text-[var(--text-primary)] mb-2">
                <strong>Método de Pagamento:</strong>{" "}
                <span
                  className={getMethodClass(
                    clientToReactivate.paymentMethod.name
                  )}
                >
                  {clientToReactivate.paymentMethod.name}
                </span>
              </p>
              <p className="text-[var(--text-primary)] mb-2">
                <strong>Data de Vencimento Atual:</strong>{" "}
                {formatDateToUTC(clientToReactivate.dueDate)}
              </p>
              <div className="mb-4">
                <label className="modal-label">Nova Data de Vencimento</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="modal-input"
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={closeConfirmModal}
                className="modal-button modal-button-cancel"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReactivate}
                className="modal-button modal-button-save"
                disabled={!newDueDate}
              >
                Reativar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

ExpiredClientsTable.displayName = "ExpiredClientsTable";

export default ExpiredClientsTable;
