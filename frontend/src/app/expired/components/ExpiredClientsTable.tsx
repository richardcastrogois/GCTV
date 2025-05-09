import {
  FaSort,
  FaSortUp,
  FaSortDown,
  FaBolt,
  FaInfoCircle,
  FaTimes,
} from "react-icons/fa";
import { Client } from "../../clients/types";
import { useState } from "react";
import { Skeleton } from "@mui/material";

const formatDateToUTC = (date: string | Date): string => {
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

interface ExpiredClientsTableProps {
  clients: Client[];
  onSort: (key: keyof Client | "plan.name") => void;
  onReactivate: (client: Client) => void;
  sortConfig: {
    key: keyof Client | "plan.name" | null;
    direction: "asc" | "desc";
  };
  isFetching?: boolean;
  isLoading?: boolean;
}

export default function ExpiredClientsTable({
  clients,
  onSort,
  onReactivate,
  sortConfig,
  isFetching = false,
  isLoading = false,
}: ExpiredClientsTableProps) {
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const getSortIcon = (columnKey: keyof Client | "plan.name") => {
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
                  <th className="email-column hidden lg:table-cell">
                    <Skeleton variant="text" width={200} />
                  </th>
                  <th className="plan-column">
                    <Skeleton variant="text" width={120} />
                  </th>
                  <th className="due-date-column">
                    <Skeleton variant="text" width={100} />
                  </th>
                  <th className="status-column">
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
                    <td className="email-column hidden lg:table-cell">
                      <Skeleton variant="text" width={200} />
                    </td>
                    <td className="plan-column">
                      <Skeleton variant="text" width={120} />
                    </td>
                    <td className="due-date-column">
                      <Skeleton variant="text" width={100} />
                    </td>
                    <td className="status-column">
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
                <th className="status-column"></th>
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
                  <td className="status-column text-center"></td>
                  <td className="name-column text-center">{client.fullName}</td>
                  <td className="email-column hidden lg:table-cell text-center">
                    {client.email}
                  </td>
                  <td className="plan-column text-center">
                    {client.plan.name}
                  </td>
                  <td className="due-date-column text-center">
                    {formatDateToUTC(client.dueDate)}
                  </td>
                  <td className="status-column text-center">
                    <span
                      className={`status-dot ${
                        client.isActive ? "bg-green-500" : "bg-red-500"
                      }`}
                    ></span>
                    {client.isActive ? "Ativo" : "Inativo"}
                  </td>
                  <td className="actions-column text-center">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => openInfoModal(client)}
                        className="action-button"
                        title="Mais Informações"
                      >
                        <FaInfoCircle size={16} />
                      </button>
                      <button
                        onClick={() => onReactivate(client)}
                        className="action-button"
                        title="Reativar"
                      >
                        <FaBolt size={16} />
                      </button>
                      <button className="action-button" title="Observação">
                        <FaInfoCircle
                          size={16}
                          style={{ transform: "rotate(45deg)" }}
                        />
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
                  Plano: {client.plan.name}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Vencimento: {formatDateToUTC(client.dueDate)}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Status: {client.isActive ? "Ativo" : "Inativo"}
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
                    onClick={() => openInfoModal(client)}
                    className="action-button"
                    title="Mais Informações"
                  >
                    <FaInfoCircle size={16} />
                  </button>
                  <button
                    onClick={() => onReactivate(client)}
                    className="action-button"
                    title="Reativar"
                  >
                    <FaBolt size={16} />
                  </button>
                  <button className="action-button" title="Observação">
                    <FaInfoCircle
                      size={16}
                      style={{ transform: "rotate(45deg)" }}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {isInfoModalOpen && selectedClient && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeInfoModal();
          }}
        >
          <div className="modal-content">
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
                <strong>Plano:</strong> {selectedClient.plan.name}
              </p>
              <p className="text-[var(--text-primary)] mb-2">
                <strong>Data de Vencimento:</strong>{" "}
                {formatDateToUTC(selectedClient.dueDate)}
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
