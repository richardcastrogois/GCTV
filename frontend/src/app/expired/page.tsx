"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import Navbar from "@/components/Navbar";
import { toast } from "react-toastify";
import {
  FaTrash,
  FaEdit,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaEllipsisV,
} from "react-icons/fa";
import ClientSearch from "@/components/ClientSearch";
import { Client } from "@/app/clients/types";

export default function ExpiredClients() {
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  const menuRef = useRef<HTMLDivElement>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Client | "plan.name" | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });

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

  const {
    data: clients,
    isLoading,
    error,
  } = useQuery<Client[]>({
    queryKey: ["expiredClients"],
    queryFn: async () => {
      const { data } = await axios.get(
        "http://localhost:3001/api/clients/expired",
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      console.log("Dados retornados pela API:", data);
      return data;
    },
  });

  // Atualizar selectedClients quando a lista de clientes mudar
  useEffect(() => {
    if (clients) {
      setSelectedClients((prev) =>
        prev.filter((id) => clients.some((client) => client.id === id))
      );
    }
  }, [clients]);

  // Filtrar os clientes com base no termo de busca
  useEffect(() => {
    if (!clients) {
      setFilteredClients([]);
      return;
    }

    if (!searchTerm) {
      setFilteredClients(clients);
      return;
    }

    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = clients.filter((client) => {
      const fields = [
        client.fullName.toLowerCase(),
        client.email.toLowerCase(),
        client.plan.name.toLowerCase(),
      ];

      return fields.some((field) => field.includes(lowerSearchTerm));
    });

    setFilteredClients(filtered);
  }, [clients, searchTerm]);

  const sortedClients = [...filteredClients].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let valueA: string;
    let valueB: string;

    if (sortConfig.key === "plan.name") {
      valueA = a.plan.name.toLowerCase();
      valueB = b.plan.name.toLowerCase();
    } else {
      valueA = a[sortConfig.key] as string;
      valueB = b[sortConfig.key] as string;

      valueA = valueA.toLowerCase();
      valueB = valueB.toLowerCase();
    }

    if (valueA < valueB) return sortConfig.direction === "asc" ? -1 : 1;
    if (valueA > valueB) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (key: keyof Client | "plan.name") => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const getSortIcon = (columnKey: keyof Client | "plan.name") => {
    if (sortConfig.key !== columnKey) {
      return <FaSort className="sort-icon" />;
    }
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

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      axios.delete(`http://localhost:3001/api/clients/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["expiredClients"] });
      toast.success("Cliente excluído com sucesso!");
    },
    onError: (error: unknown) => {
      if (error instanceof AxiosError) {
        toast.error(
          `Erro ao excluir cliente: ${
            error.response?.data?.message || error.message
          }`
        );
      } else {
        toast.error("Erro desconhecido ao excluir cliente");
      }
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) =>
      Promise.all(
        ids.map((id) =>
          axios.delete(`http://localhost:3001/api/clients/${id}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          })
        )
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["expiredClients"] });
      setSelectedClients([]);
      toast.success("Clientes excluídos com sucesso!");
    },
    onError: (error: unknown) => {
      if (error instanceof AxiosError) {
        toast.error(
          `Erro ao excluir clientes: ${
            error.response?.data?.message || error.message
          }`
        );
      } else {
        toast.error("Erro desconhecido ao excluir clientes");
      }
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: number) =>
      axios.put(
        `http://localhost:3001/api/clients/reactivate/${id}`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expiredClients"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente reativado com sucesso!");
    },
    onError: (error: unknown) => {
      if (error instanceof AxiosError) {
        toast.error(
          `Erro ao reativar cliente: ${
            error.response?.data?.message || error.message
          }`
        );
      } else {
        toast.error("Erro desconhecido ao reativar cliente");
      }
    },
  });

  const handleSelectClient = (id: number) => {
    setSelectedClients((prev) =>
      prev.includes(id)
        ? prev.filter((clientId) => clientId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allClientIds = sortedClients?.map((client) => client.id) || [];
      setSelectedClients(allClientIds);
    } else {
      setSelectedClients([]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedClients.length > 0) {
      bulkDeleteMutation.mutate(selectedClients);
    }
  };

  if (isLoading) return <div className="loading-message">Carregando...</div>;
  if (error)
    return (
      <div className="error-message">
        Erro ao carregar clientes expirados: {error.message}
      </div>
    );

  return (
    <div>
      <Navbar />
      <div className="dashboard-container">
        <div className="flex sm:flex-row flex-col justify-between items-center mb-5">
          <h1 className="text-3xl mb-4 sm:mb-0">Clientes Expirados</h1>
          <div className="flex space-x-2">
            {selectedClients.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="new-client-button bg-[var(--danger-bg)] text-white hover:bg-red-600"
              >
                Excluir Selecionados ({selectedClients.length})
              </button>
            )}
          </div>
        </div>
        <ClientSearch onSearchTermChange={setSearchTerm} />
        <div className="clients-table-container">
          <table className="clients-table w-full">
            <thead>
              <tr>
                <th className="w-12">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      sortedClients &&
                      sortedClients.length > 0 &&
                      selectedClients.length === sortedClients.length
                    }
                  />
                </th>
                <th onClick={() => handleSort("fullName")}>
                  Nome {getSortIcon("fullName")}
                </th>
                <th
                  className="hidden lg:table-cell"
                  onClick={() => handleSort("email")}
                >
                  Email {getSortIcon("email")}
                </th>
                <th onClick={() => handleSort("plan.name")}>
                  Plano {getSortIcon("plan.name")}
                </th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {sortedClients && sortedClients.length > 0 ? (
                sortedClients.map((client) => (
                  <tr key={client.id}>
                    <td className="w-12 text-center">
                      <input
                        type="checkbox"
                        checked={selectedClients.includes(client.id)}
                        onChange={() => handleSelectClient(client.id)}
                      />
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
                              deleteMutation.mutate(client.id);
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
                            onClick={() => {
                              reactivateMutation.mutate(client.id);
                              setOpenMenu(null);
                            }}
                            className="action-menu-item"
                          >
                            <FaEdit
                              size={16}
                              className="text-[var(--accent-blue)]"
                            />
                            Reativar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-2 text-center">
                    Nenhum cliente expirado encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
