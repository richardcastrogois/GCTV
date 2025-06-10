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
    FaSave,
  } from "react-icons/fa";
  import { Client } from "@/types/client";
  import { useState, useEffect, useRef, useMemo } from "react";
  import { createPortal } from "react-dom";
  import { Skeleton } from "@mui/material";
  import axios from "axios";
  import { toast } from "react-toastify";

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

  interface PaymentEntry {
    paymentDate: string;
    amount: number;
  }

  interface ExtendedClient extends Client {
    paymentHistory: PaymentEntry[] | null;
  }

  interface ClientsTableProps {
    clients: ExtendedClient[];
    onEdit: (client: Client) => void;
    onDelete: (id: number) => void;
    onRenew: (client: Client) => void;
    onSort: (
      key:
        | keyof Omit<Client, "plan" | "paymentMethod" | "user">
        | "plan.name"
        | "paymentMethod.name"
        | "user.username"
    ) => void;
    sortConfig: {
      key:
        | keyof Omit<Client, "plan" | "paymentMethod" | "user">
        | "plan.name"
        | "paymentMethod.name"
        | "user.username"
        | null;
      direction: "asc" | "desc";
    };
    isFetching?: boolean;
    isLoading?: boolean;
    onUpdatePaymentStatus: (
      clientId: number,
      verified: boolean,
      date?: string
    ) => Promise<void>;
  }

  export default function ClientsTable({
    clients,
    onEdit,
    onDelete,
    onRenew,
    onSort,
    sortConfig,
    isFetching = false,
    isLoading = false,
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
    const [newPaymentAmount, setNewPaymentAmount] = useState<number>(0);
    const [editingPaymentIndex, setEditingPaymentIndex] = useState<
      number | null
    >(null);
    const [editPaymentDate, setEditPaymentDate] = useState<string>("");
    const [editPaymentAmount, setEditPaymentAmount] = useState<number>(0);
    const [selectedClient, setSelectedClient] = useState<ExtendedClient | null>(
      null
    );
    const [isPaidVisualStatus, setIsPaidVisualStatus] = useState<
      Map<number, boolean>
    >(new Map());
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
    const infoModalRef = useRef<HTMLDivElement>(null);

    const currentDate = useMemo(() => new Date(), []);

    useEffect(() => {
      const initialStatus = new Map<number, boolean>();
      clients.forEach((client) => {
        initialStatus.set(client.id, client.visualPaymentConfirmed ?? false);
      });
      setIsPaidVisualStatus(initialStatus);
    }, [clients]);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          menuRef.current &&
          !menuRef.current.contains(event.target as Node)
        ) {
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
        | keyof Omit<Client, "plan" | "paymentMethod" | "user">
        | "plan.name"
        | "paymentMethod.name"
        | "user.username"
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

    const setVisualPaidStatus = async (clientId: number, isPaid: boolean) => {
      setIsPaidVisualStatus((prev) => {
        const newMap = new Map(prev);
        newMap.set(clientId, isPaid);
        return newMap;
      });
      await onUpdatePaymentStatus(clientId, isPaid);
    };

    const openModal = async (clientId: number) => {
      const client = clients.find((c) => c.id === clientId);
      if (!client) return;

      try {
        const response = await axios.get(
          process.env.NEXT_PUBLIC_API_URL + `/api/clients/${clientId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setModalClient(response.data);
        setNewPaymentDate(new Date().toISOString().split("T")[0]);
        setNewPaymentAmount(client.grossAmount);
        setIsModalOpen(true);
      } catch (error) {
        console.error("Erro ao carregar detalhes do cliente:", error);
        toast.error("Erro ao carregar detalhes do cliente");
      }
    };

    const closeModal = () => {
      setIsModalOpen(false);
      setModalClient(null);
      setNewPaymentDate("");
      setNewPaymentAmount(0);
      setEditingPaymentIndex(null);
      setEditPaymentDate("");
      setEditPaymentAmount(0);
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

      if (!newPaymentDate || isNaN(new Date(newPaymentDate).getTime())) {
        toast.error("Data de pagamento inválida");
        return;
      }

      if (isNaN(newPaymentAmount)) {
        toast.error("Valor do pagamento inválido");
        return;
      }

      if (newPaymentAmount <= 0) {
        toast.error("Valor do pagamento deve ser maior que zero");
        return;
      }

      try {
        console.log("Token:", localStorage.getItem("token"));
        console.log("Payload:", {
          paymentDate: new Date(newPaymentDate).toISOString(),
          amount: newPaymentAmount,
        });
        const response = await axios.put(
          process.env.NEXT_PUBLIC_API_URL +
            `/api/clients/payment-status/${modalClient.id}`,
          {
            paymentDate: new Date(newPaymentDate).toISOString(),
            amount: newPaymentAmount,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        console.log("Response:", response.data);
        toast.success("Pagamento adicionado!");
        const clientResponse = await axios.get(
          process.env.NEXT_PUBLIC_API_URL + `/api/clients/${modalClient.id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setModalClient(clientResponse.data);
        setNewPaymentDate(new Date().toISOString().split("T")[0]);
        setNewPaymentAmount(modalClient.grossAmount);
      } catch (error) {
        console.error("Erro ao adicionar pagamento:", error);
        toast.error("Erro ao adicionar pagamento");
      }
    };

    const handleEditPayment = (index: number, payment: PaymentEntry) => {
      setEditingPaymentIndex(index);
      setEditPaymentDate(formatDateToLocal(payment.paymentDate));
      setEditPaymentAmount(payment.amount);
    };

    const handleSaveEditPayment = async () => {
      if (!modalClient || editingPaymentIndex === null) return;

      if (!editPaymentDate || isNaN(new Date(editPaymentDate).getTime())) {
        toast.error("Data de pagamento inválida");
        return;
      }

      if (isNaN(editPaymentAmount)) {
        toast.error("Valor do pagamento inválido");
        return;
      }

      if (editPaymentAmount <= 0) {
        toast.error("Valor do pagamento deve ser maior que zero");
        return;
      }

      try {
        const response = await axios.put(
          process.env.NEXT_PUBLIC_API_URL +
            `/api/clients/payments/edit/${modalClient.id}`,
          {
            index: editingPaymentIndex,
            paymentDate: new Date(editPaymentDate).toISOString(),
            amount: editPaymentAmount,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        console.log("Response from edit payment:", response.data);
        toast.success("Pagamento atualizado!");
        const clientResponse = await axios.get(
          process.env.NEXT_PUBLIC_API_URL + `/api/clients/${modalClient.id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setModalClient(clientResponse.data);
        setEditingPaymentIndex(null);
        setEditPaymentDate("");
        setEditPaymentAmount(0);
      } catch (error) {
        console.error("Erro ao atualizar pagamento:", error);
        toast.error("Erro ao atualizar pagamento");
      }
    };

    const handleDeletePayment = async (index: number) => {
      if (!modalClient) return;

      try {
        const response = await axios.delete(
          process.env.NEXT_PUBLIC_API_URL +
            `/api/clients/payments/delete/${modalClient.id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            data: { index },
          }
        );
        console.log("Response from delete payment:", response.data);
        toast.success("Pagamento excluído!");
        const clientResponse = await axios.get(
          process.env.NEXT_PUBLIC_API_URL + `/api/clients/${modalClient.id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setModalClient(clientResponse.data);
      } catch (error) {
        console.error("Erro ao excluir pagamento:", error);
        toast.error("Erro ao excluir pagamento");
      }
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
                    <th className="user-column">
                      <Skeleton variant="text" width={150} />
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
                      <td className="user-column">
                        <Skeleton variant="text" width={150} />
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
                  <th className="status-column">Pago</th>
                  <th
                    className="user-column"
                    onClick={() => onSort("user.username")}
                  >
                    Usuário {getSortIcon("user.username")}
                  </th>
                  <th
                    className="name-column"
                    onClick={() => onSort("fullName")}
                  >
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
                          isPaidVisualStatus.get(client.id) ?? false
                            ? "Verificado (visual)"
                            : "Não Verificado (visual)"
                        }
                      >
                        {isPaidVisualStatus.get(client.id) ? (
                          <FaCheck
                            size={16}
                            className={`${
                              isPaidVisualStatus.get(client.id)
                                ? "text-[var(--button-active-bg)]"
                                : "text-[var(--text-secondary)]"
                            }`}
                          />
                        ) : (
                          <FaTimes
                            size={16}
                            className={`${
                              !isPaidVisualStatus.get(client.id)
                                ? "text-[var(--danger-bg)]"
                                : "text-[var(--text-secondary)]"
                            }`}
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
                          onClick={() => openInfoModal(client)}
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
                    Usuário: {client.user.username}
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
                      className={getMethodClass(
                        client.paymentMethod?.name || ""
                      )}
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
                    isPaidVisualStatus.get(client.id) ?? false
                      ? "Verificado (visual)"
                      : "Não Verificado (visual)"
                  }
                >
                  {isPaidVisualStatus.get(client.id) ? (
                    <FaCheck
                      size={16}
                      className={`${
                        isPaidVisualStatus.get(client.id)
                          ? "text-[var(--button-active-bg)]"
                          : "text-[var(--text-secondary)]"
                      }`}
                    />
                  ) : (
                    <FaTimes
                      size={16}
                      className={`${
                        !isPaidVisualStatus.get(client.id)
                          ? "text-[var(--danger-bg)]"
                          : "text-[var(--text-secondary)]"
                      }`}
                    />
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
                <FaEdit size={16} className="text-[var(--accent-blue)]" />{" "}
                Editar
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
                <FaBolt size={16} className="text-[var(--accent-blue)]" />{" "}
                Renovar
              </button>
            </div>,
            document.body
          )}

        {isModalOpen &&
          modalClient &&
          createPortal(
            <div className="modal-overlay" onClick={closeModal}>
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h2 className="modal-title">Gerenciar Pagamentos</h2>
                  <button onClick={closeModal} className="modal-close-button">
                    <FaTimes size={20} />
                  </button>
                </div>
                <div className="modal-body">
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
                  <div className="flex space-x-4 mb-4">
                    <div>
                      <label className="modal-label">Data de Pagamento</label>
                      <input
                        type="date"
                        value={newPaymentDate}
                        onChange={(e) => setNewPaymentDate(e.target.value)}
                        className="modal-input"
                      />
                    </div>
                    <div>
                      <label className="modal-label">Valor (R$)</label>
                      <input
                        type="number"
                        value={newPaymentAmount === 0 ? "" : newPaymentAmount}
                        onChange={(e) =>
                          setNewPaymentAmount(
                            e.target.value === ""
                              ? 0
                              : parseFloat(e.target.value)
                          )
                        }
                        className="modal-input"
                        min="0"
                        step="0.01"
                        placeholder="Digite o valor"
                      />
                    </div>
                    <button
                      onClick={handleAddPayment}
                      className="modal-button modal-button-save mt-6"
                    >
                      Adicionar
                    </button>
                  </div>

                  <h3 className="text-lg font-semibold mb-2">
                    Pagamentos Registrados
                  </h3>
                  {modalClient.paymentHistory !== null &&
                  modalClient.paymentHistory.length > 0 ? (
                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            <th className="border p-2 sticky top-0 bg-[var(--table-bg)] z-10">
                              Data
                            </th>
                            <th className="border p-2 sticky top-0 bg-[var(--table-bg)] z-10">
                              Valor (R$)
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
                                        editPaymentAmount === 0
                                          ? ""
                                          : editPaymentAmount
                                      }
                                      onChange={(e) =>
                                        setEditPaymentAmount(
                                          e.target.value === ""
                                            ? 0
                                            : parseFloat(e.target.value)
                                        )
                                      }
                                      className="modal-input w-full"
                                      min="0"
                                      step="0.01"
                                      placeholder="Digite o valor"
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
                                      onClick={() =>
                                        setEditingPaymentIndex(null)
                                      }
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
                                    {payment.amount.toFixed(2)}
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
                className="modal-content responsive-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h2 className="modal-title">Detalhes do Cliente</h2>
                  <button
                    onClick={closeInfoModal}
                    className="modal-close-button"
                  >
                    <FaTimes size={20} />
                  </button>
                </div>
                <div className="modal-body">
                  <p className="text-[var(--text-primary)] mb-2">
                    <strong>Nome:</strong> {selectedClient.fullName}
                  </p>
                  <p className="text-[var(--text-primary)] mb-2">
                    <strong>Usuário:</strong> {selectedClient.user.username}
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
                      className={getMethodClass(
                        selectedClient.paymentMethod?.name || ""
                      )}
                    >
                      {selectedClient.paymentMethod?.name}
                    </span>
                  </p>
                  <p className="text-[var(--text-primary)] mb-2">
                    <strong>Data de Vencimento:</strong>{" "}
                    <span
                      className={getDueDateClass(
                        selectedClient.dueDate,
                        currentDate
                      )}
                    >
                      {formatDateToUTC(selectedClient.dueDate)}
                    </span>
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
                      "Nenhuma observação registrada"}
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
  }