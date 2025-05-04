import {
  FaEdit,
  FaTrash,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaBolt, // Substituí FaRedo por FaBolt
  FaEllipsisV,
} from "react-icons/fa";
import { Client } from "../types";
import { useState, useEffect, useRef } from "react";

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
}

export default function ClientsTable({
  clients,
  onEdit,
  onDelete,
  onRenew,
  onSort,
  sortConfig,
}: ClientsTableProps) {
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fechar o menu ao clicar fora
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
    if (sortConfig.key !== columnKey) {
      return <FaSort className="sort-icon" />;
    }
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
    if ((e.target as HTMLElement).closest(".action-button")) {
      return;
    }
    toggleRow(clientId);
  };

  const toggleMenu = (clientId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenu((prev) => (prev === clientId ? null : clientId));
  };

  return (
    <>
      {/* Tabela para telas grandes e médias (md e acima) */}
      <div className="clients-table-container">
        <table className="clients-table hidden md:table">
          <thead>
            <tr>
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
                        />
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
                        />
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
                        />
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

      {/* Layout de cards para telas pequenas (abaixo de md) */}
      <div className="md:hidden space-y-4">
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
                  Plano: {client.plan.name}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Método: {client.paymentMethod.name}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Vencimento: {formatDateToUTC(client.dueDate)}
                </p>
              </div>
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
                    <FaBolt size={16} /> {/* Substituí FaRedo por FaBolt */}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
