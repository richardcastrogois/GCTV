import { useState, useEffect, useRef } from "react";
import {
  FaTrash,
  FaEdit,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaEllipsisV,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import { Client } from "@/app/clients/types";
import { Skeleton } from "@mui/material";

interface ExpiredClientsTableProps {
  clients: Client[];
  sortConfig: {
    key: keyof Client | "plan.name" | null;
    direction: "asc" | "desc";
  };
  onSort: (key: keyof Client | "plan.name") => void;
  selectedClients: number[];
  onSelectClient: (id: number) => void;
  onSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: (id: number) => void;
  onReactivate: (id: number) => void;
  onUpdatePaymentStatus: (clientId: number, currentStatus: boolean) => void;
  isFetching?: boolean;
  isLoading?: boolean;
}

export default function ExpiredClientsTable({
  clients,
  sortConfig,
  onSort,
  selectedClients,
  onSelectClient,
  onSelectAll,
  onDelete,
  onReactivate,
  onUpdatePaymentStatus,
  isFetching = false,
  isLoading = false,
}: ExpiredClientsTableProps) {
  const [openMenu, setOpenMenu] = useState<number | null>(null);
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenu]);

  const getSortIcon = (columnKey: keyof Client | "plan.name") => {
    if (sortConfig.key !== columnKey) return <FaSort className="sort-icon" />;
    return sortConfig.direction === "asc" ? (
      <FaSortUp className="sort-icon" />
    ) : (
      <FaSortDown className="sort-icon" />
    );
  };

  const toggleMenu = (clientId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenu((prev) => (prev === clientId ? null : clientId));
  };

  if (isLoading) {
    return (
      <>
        {/* Skeleton para tabela (md e acima) */}
        <div className="clients-table-container hidden md:block">
          <div className="table-wrapper">
            <table className="clients-table w-full">
              <thead>
                <tr>
                  <th className="w-12">
                    <Skeleton variant="text" width={20} />
                  </th>
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
                    <Skeleton variant="text" width={40} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, index) => (
                  <tr key={index}>
                    <td className="w-12 text-center">
                      <Skeleton variant="circular" width={20} height={20} />
                    </td>
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
                      <Skeleton variant="text" width={40} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Skeleton para cards (abaixo de md) */}
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
      {/* Tabela para telas grandes e médias (md e acima) */}
      <div className="table-wrapper">
        <table className={`clients-table w-full ${isFetching ? "fade" : ""}`}>
          <thead>
            <tr>
              <th className="w-12">
                <input
                  type="checkbox"
                  onChange={onSelectAll}
                  checked={
                    clients.length > 0 &&
                    selectedClients.length === clients.length
                  }
                />
              </th>
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
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td className="w-12 text-center">
                  <input
                    type="checkbox"
                    checked={selectedClients.includes(client.id)}
                    onChange={() => onSelectClient(client.id)}
                  />
                </td>
                <td>
                  <button
                    onClick={() =>
                      onUpdatePaymentStatus(client.id, client.paymentVerified)
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
                <td>{client.fullName}</td>
                <td className="hidden lg:table-cell email-column">
                  {client.email}
                </td>
                <td>{client.plan.name}</td>
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
                        onClick={() => {
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
                        onClick={() => {
                          onReactivate(client.id);
                          setOpenMenu(null);
                        }}
                        className="action-menu-item"
                      >
                        <FaEdit
                          size={16}
                          className="text-[var(--accent-blue)]"
                        />{" "}
                        Reativar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
