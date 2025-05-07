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
} from "react-icons/fa";
import { Client } from "../types";
import { useState, useEffect, useRef } from "react";
import { Skeleton } from "@mui/material";

// Função auxiliar para formatar a data no fuso horário UTC
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalClientId, setModalClientId] = useState<number | null>(null);
  const [modalIsVerified, setModalIsVerified] = useState<boolean>(false);
  const [modalDate, setModalDate] = useState<string>("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    if (openMenu !== null) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenu]);

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
        : [clientId]
    );
  };

  const handleCardClick = (clientId: number, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".action-button")) return;
    toggleRow(clientId);
  };

  const toggleMenu = (clientId: number, e: React.MouseEvent) => {
    e.stopPropagation();
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

  if (isLoading) {
    return (
      <>
        <div className="clients-table-container hidden md:block">
          <table className="clients-table">
            <thead>
              <tr>
                <th>
                  <Skeleton variant="text" width={50} />
                </th>
                <th>
                  <Skeleton variant="text" width={150} />
                </th>
                <th className="hidden lg:table-cell">
                  <Skeleton variant="text" width={200} />
                </th>
                <th>
                  <Skeleton variant="text" width={120} />
                </th>
                <th>
                  <Skeleton variant="text" width={120} />
                </th>
                <th>
                  <Skeleton variant="text" width={100} />
                </th>
                <th className="hidden xl:table-cell">
                  <Skeleton variant="text" width={80} />
                </th>
                <th className="hidden xl:table-cell">
                  <Skeleton variant="text" width={80} />
                </th>
                <th className="xl:hidden">
                  <Skeleton variant="text" width={100} />
                </th>
                <th>
                  <Skeleton variant="text" width={40} />
                </th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, index) => (
                <tr key={index}>
                  <td>
                    <Skeleton variant="text" width={50} />
                  </td>
                  <td>
                    <Skeleton variant="text" width={150} />
                  </td>
                  <td className="hidden lg:table-cell">
                    <Skeleton variant="text" width={200} />
                  </td>
                  <td>
                    <Skeleton variant="text" width={120} />
                  </td>
                  <td>
                    <Skeleton variant="text" width={120} />
                  </td>
                  <td>
                    <Skeleton variant="text" width={100} />
                  </td>
                  <td className="hidden xl:table-cell">
                    <Skeleton variant="text" width={80} />
                  </td>
                  <td className="hidden xl:table-cell">
                    <Skeleton variant="text" width={80} />
                  </td>
                  <td className="xl:hidden">
                    <Skeleton variant="text" width={100} />
                  </td>
                  <td>
                    <Skeleton variant="text" width={40} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
      <div className="clients-table-container">
        <table
          className={`clients-table hidden md:table ${
            isFetching ? "fade" : ""
          }`}
        >
          <thead>
            <tr>
              <th>Status</th>
              <th onClick={() => onSort("fullName")}>
                Nome {getSortIcon("fullName")}
              </th>
              <th
                className="hidden lg:table-cell"
                onClick={() => onSort("email")}
              >
                Email {getSortIcon("email")}
              </th>
              <th onClick={() => onSort("plan.name")}>
                Plano {getSortIcon("plan.name")}
              </th>
              <th onClick={() => onSort("paymentMethod.name")}>
                Método de Pagamento {getSortIcon("paymentMethod.name")}
              </th>
              <th onClick={() => onSort("dueDate")}>
                Data de Vencimento {getSortIcon("dueDate")}
              </th>
              <th
                className="hidden xl:table-cell"
                onClick={() => onSort("grossAmount")}
              >
                Valor Bruto {getSortIcon("grossAmount")}
              </th>
              <th
                className="hidden xl:table-cell"
                onClick={() => onSort("netAmount")}
              >
                Valor Líquido {getSortIcon("netAmount")}
              </th>
              <th className="xl:hidden">Valor (Bruto/Líquido)</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td>
                  <button
                    onClick={() => openModal(client.id, client.paymentVerified)}
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
                <td>{client.fullName}</td>
                <td className="hidden lg:table-cell email-column">
                  {client.email}
                </td>
                <td>{client.plan.name}</td>
                <td>{client.paymentMethod.name}</td>
                <td>{formatDateToUTC(client.dueDate)}</td>
                <td className="hidden xl:table-cell">
                  R$ {client.grossAmount.toFixed(2)}
                </td>
                <td className="hidden xl:table-cell">
                  R$ {client.netAmount.toFixed(2)}
                </td>
                <td className="xl:hidden">
                  R$ {client.grossAmount.toFixed(2)} / R${" "}
                  {client.netAmount.toFixed(2)}
                </td>
                <td className="relative">
                  <button
                    onClick={(e) => toggleMenu(client.id, e)}
                    className="action-button"
                    title="Ações"
                  >
                    <FaEllipsisV size={16} />
                  </button>
                  {openMenu === client.id && (
                    <div className="action-menu" ref={menuRef}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(client);
                          setOpenMenu(null);
                        }}
                        className="action-menu-item"
                      >
                        <FaEdit
                          size={16}
                          className="text-[var(--accent-blue)]"
                        />{" "}
                        Editar
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(client.id);
                          setOpenMenu(null);
                        }}
                        className="action-menu-item"
                      >
                        <FaTrash
                          size={16}
                          className="text-[var(--accent-blue)]"
                        />{" "}
                        Excluir
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRenew(client);
                          setOpenMenu(null);
                        }}
                        className="action-menu-item"
                      >
                        <FaBolt
                          size={16}
                          className="text-[var(--accent-blue)]"
                        />{" "}
                        Renovar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
                  Método: {client.paymentMethod.name}
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
                  Valor Bruto: R$ {client.grossAmount.toFixed(2)}
                </p>
                <p className="text-sm text-[var(--text-primary)]">
                  Valor Líquido: R$ {client.netAmount.toFixed(2)}
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => onEdit(client)}
                    className="action-button edit"
                    title="Editar"
                  >
                    <FaEdit size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(client.id)}
                    className="action-button delete"
                    title="Excluir"
                  >
                    <FaTrash size={16} />
                  </button>
                  <button
                    onClick={() => onRenew(client)}
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

      {isModalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="modal-content">
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
    </>
  );
}
