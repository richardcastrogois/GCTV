// frontend/src/app/newpage/components/ManagePaymentsModal.tsx
"use client";

import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Divider,
  Input,
  Tooltip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import {
  CircleCheckBig,
  CircleX,
  Pencil,
  Trash2,
  Save,
  X,
  MoreVertical,
  Loader2,
} from "lucide-react";

import api from "@/utils/api";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { AxiosError } from "axios";

import styles from "../testeScroll.module.css";
import "../toastStyles.css";

import type { Client, PaymentEntry } from "@/types/client";

type Props = {
  client: Client;
  onUpdatePaymentStatus: (clientId: number, verified: boolean) => Promise<void>;
  onUpdated: (updated: Client) => void;
  buttonClassName?: string;
};

const showSuccessToast = (title: string, description?: string) => {
  toast.dismiss();

  setTimeout(() => {
    toast.custom(
      (t) => (
        <div className={`hero-toast ${!t.visible ? "hero-toast--leave" : ""}`}>
          <div className="hero-toast-text">
            <div className="hero-toast-text-title">{title}</div>
            {description && (
              <div className="hero-toast-text-subtitle">{description}</div>
            )}
          </div>

          <button
            type="button"
            className="hero-toast-close"
            onClick={() => toast.dismiss(t.id)}
          >
            ×
          </button>
        </div>
      ),
      {
        position: "top-right",
        duration: 2000,
      }
    );
  }, 330);
};

const showErrorToast = (title: string, description?: string) => {
  toast.dismiss();
  setTimeout(() => {
    toast.custom(
      (t) => (
        <div
          className={`hero-toast hero-toast--error ${
            !t.visible ? "hero-toast--leave" : ""
          }`}
        >
          <div className="hero-toast-text">
            <div className="hero-toast-text-title hero-toast-text-title--error">
              {title}
            </div>
            {description && (
              <div className="hero-toast-text-subtitle hero-toast-text-subtitle--error">
                {description}
              </div>
            )}
          </div>

          <button
            type="button"
            className="hero-toast-close hero-toast-close--error"
            onClick={() => toast.dismiss(t.id)}
          >
            ×
          </button>
        </div>
      ),
      {
        position: "top-right",
        duration: 3000,
      }
    );
  }, 330);
};

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

type ExtendedClient = Client & { paymentHistory?: PaymentEntry[] | null };

const normalizePaymentHistory = (history: unknown): PaymentEntry[] => {
  if (!Array.isArray(history)) return [];
  return history.map((entry: unknown) => {
    if (typeof entry === "object" && entry !== null) {
      const p = entry as Partial<PaymentEntry>;
      return {
        paymentDate: p.paymentDate || new Date().toISOString(),
        paymentBruto: p.paymentBruto || 0,
        paymentLiquido: p.paymentLiquido || 0,
      };
    }
    return {
      paymentDate: new Date().toISOString(),
      paymentBruto: 0,
      paymentLiquido: 0,
    };
  });
};

export default function ManagePaymentsModal({
  client,
  onUpdatePaymentStatus,
  onUpdated,
  buttonClassName,
}: Props) {
  const { handleUnauthorized } = useAuth();

  const [isOpen, setIsOpen] = React.useState(false);

  const [isLoadingClient, setIsLoadingClient] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");

  const [modalClient, setModalClient] = React.useState<ExtendedClient | null>(
    null
  );

  const isPaidVisual = Boolean(modalClient?.visualPaymentConfirmed);

  const [newPaymentDate, setNewPaymentDate] = React.useState<string>("");
  const [newPaymentBruto, setNewPaymentBruto] = React.useState<number>(0);
  const [newPaymentLiquido, setNewPaymentLiquido] = React.useState<number>(0);

  const [editingPaymentIndex, setEditingPaymentIndex] = React.useState<
    number | null
  >(null);
  const [editPaymentDate, setEditPaymentDate] = React.useState<string>("");
  const [editPaymentBruto, setEditPaymentBruto] = React.useState<number>(0);
  const [editPaymentLiquido, setEditPaymentLiquido] = React.useState<number>(0);

  // ✅ estados específicos de loading para cada ação
  const [isAddingPayment, setIsAddingPayment] = React.useState(false);
  const [isSavingEditedPayment, setIsSavingEditedPayment] =
    React.useState(false);
  const [deletingPaymentIndex, setDeletingPaymentIndex] = React.useState<
    number | null
  >(null);

  const fetchFreshClient =
    React.useCallback(async (): Promise<ExtendedClient> => {
      const response = await api.get(`/api/clients/${client.id}`);
      const fresh = response.data as ExtendedClient;

      return {
        ...fresh,
        paymentHistory: normalizePaymentHistory(fresh.paymentHistory || []),
      };
    }, [client.id]);

  const open = async () => {
    setErrorMsg("");
    setIsLoadingClient(true);

    try {
      const fresh = await fetchFreshClient();
      setModalClient(fresh);

      setNewPaymentDate(new Date().toISOString().split("T")[0]);
      setNewPaymentBruto(Number(fresh.grossAmount ?? 0));
      setNewPaymentLiquido(Number(fresh.netAmount ?? 0));

      setEditingPaymentIndex(null);
      setEditPaymentDate("");
      setEditPaymentBruto(0);
      setEditPaymentLiquido(0);

      setIsOpen(true);
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 401) {
        handleUnauthorized();
      } else {
        showErrorToast("Erro ao carregar detalhes do cliente");
      }
    } finally {
      setIsLoadingClient(false);
    }
  };

  const close = () => {
    setIsOpen(false);
    setErrorMsg("");

    setModalClient(null);
    setNewPaymentDate("");
    setNewPaymentBruto(0);
    setNewPaymentLiquido(0);

    setEditingPaymentIndex(null);
    setEditPaymentDate("");
    setEditPaymentBruto(0);
    setEditPaymentLiquido(0);

    setIsAddingPayment(false);
    setIsSavingEditedPayment(false);
    setDeletingPaymentIndex(null);
  };

  const setVisualPaidStatus = async (verified: boolean) => {
    if (!modalClient) return;

    const original = Boolean(modalClient.visualPaymentConfirmed);

    setModalClient((prev) =>
      prev ? { ...prev, visualPaymentConfirmed: verified } : prev
    );

    try {
      await onUpdatePaymentStatus(modalClient.id, verified);

      onUpdated({
        ...(modalClient as Client),
        visualPaymentConfirmed: verified,
      });

      showSuccessToast("Status de Pagamento Atualizado!");
    } catch (err) {
      setModalClient((prev) =>
        prev ? { ...prev, visualPaymentConfirmed: original } : prev
      );

      if (err instanceof AxiosError && err.response?.status === 401) {
        handleUnauthorized();
      } else {
        showErrorToast("Erro ao atualizar status visual");
      }
    }
  };

  const handleAddPayment = async () => {
    if (!modalClient) return;

    setErrorMsg("");

    if (
      !newPaymentDate ||
      Number.isNaN(new Date(newPaymentDate).getTime()) ||
      newPaymentBruto <= 0 ||
      newPaymentLiquido <= 0
    ) {
      showErrorToast(
        "Por favor, preencha todos os campos com valores válidos."
      );
      return;
    }

    try {
      setIsAddingPayment(true);

      const response = await api.put(
        `/api/clients/payment-status/${modalClient.id}`,
        {
          paymentDate: new Date(newPaymentDate).toISOString(),
          paymentBruto: newPaymentBruto,
          paymentLiquido: newPaymentLiquido,
        }
      );

      const updatedFromServer = response.data as ExtendedClient;

      const normalized: ExtendedClient = {
        ...updatedFromServer,
        paymentHistory: normalizePaymentHistory(
          updatedFromServer.paymentHistory || []
        ),
      };

      setModalClient(normalized);

      setNewPaymentDate(new Date().toISOString().split("T")[0]);
      setNewPaymentBruto(Number(normalized.grossAmount ?? 0));
      setNewPaymentLiquido(Number(normalized.netAmount ?? 0));

      onUpdated(normalized as Client);

      showSuccessToast("Pagamento adicionado!");
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 401) {
        handleUnauthorized();
      } else if (err instanceof AxiosError) {
        showErrorToast(
          `Erro ao adicionar pagamento: ${
            (err.response?.data as { message?: string })?.message || err.message
          }`
        );
      } else {
        showErrorToast("Erro ao adicionar pagamento");
        console.error(err);
      }
    } finally {
      setIsAddingPayment(false);
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
      Number.isNaN(new Date(editPaymentDate).getTime()) ||
      editPaymentBruto <= 0 ||
      editPaymentLiquido <= 0
    ) {
      showErrorToast("Preencha os campos de edição com valores válidos.");
      return;
    }

    try {
      setIsSavingEditedPayment(true);

      const response = await api.put(
        `/api/clients/payments/edit/${modalClient.id}`,
        {
          index: editingPaymentIndex,
          paymentDate: new Date(editPaymentDate).toISOString(),
          paymentBruto: editPaymentBruto,
          paymentLiquido: editPaymentLiquido,
        }
      );

      const updatedFromServer = response.data as ExtendedClient;

      const normalized: ExtendedClient = {
        ...updatedFromServer,
        paymentHistory: normalizePaymentHistory(
          updatedFromServer.paymentHistory || []
        ),
      };

      setModalClient(normalized);
      setEditingPaymentIndex(null);

      onUpdated(normalized as Client);

      showSuccessToast("Pagamento atualizado!");
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 401) {
        handleUnauthorized();
      } else {
        showErrorToast("Erro ao atualizar pagamento");
      }
    } finally {
      setIsSavingEditedPayment(false);
    }
  };

  const handleDeletePayment = async (index: number) => {
    if (!modalClient) return;

    try {
      setDeletingPaymentIndex(index);

      const response = await api.delete(
        `/api/clients/payments/delete/${modalClient.id}`,
        { data: { index } }
      );

      const updatedFromServer = response.data as ExtendedClient;

      const normalized: ExtendedClient = {
        ...updatedFromServer,
        paymentHistory: normalizePaymentHistory(
          updatedFromServer.paymentHistory || []
        ),
      };

      setModalClient(normalized);
      onUpdated(normalized as Client);

      showSuccessToast("Pagamento excluído!");
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 401) {
        handleUnauthorized();
      } else {
        showErrorToast("Erro ao excluir pagamento");
      }
    } finally {
      setDeletingPaymentIndex(null);
    }
  };

  const labelCls = "text-[11px] uppercase tracking-wide text-foreground-500";

  const inputWrapperCls = `
    mt-2 bg-[#27272A] rounded-2xl h-12 px-4
    border border-transparent
    data-[hover=true]:bg-[#3F3F46]
    data-[focus-visible=true]:bg-[#27272A]
    data-[focus-visible=true]:border-primary/40
    data-[focus-visible=true]:ring-0
    data-[focus-visible=true]:outline-none
  `;

  const inputWrapperSmallCls = `
    bg-[#27272A] rounded-xl h-9 sm:h-10 px-2 sm:px-3
    border border-transparent
    data-[hover=true]:bg-[#3F3F46]
    data-[focus-visible=true]:bg-[#27272A]
    data-[focus-visible=true]:border-primary/40
    data-[focus-visible=true]:ring-0
    data-[focus-visible=true]:outline-none
  `;

  const inputTextCls =
    "text-[15px] sm:text-base text-foreground placeholder:text-foreground-500 h-full outline-none";

  const inputTextSmallCls =
    "text-[12px] sm:text-sm text-foreground placeholder:text-foreground-500 h-full outline-none";

  const tipContent = client.visualPaymentConfirmed
    ? "Verificado (visual)"
    : "Não Verificado (visual)";

  // ===== Dropdown (ações) com o MESMO estilo do seu filtro =====
  const actionsMenuCls = `
    bg-[#27272A]
    rounded-2xl
    py-1 px-2
    mt-1.5
    shadow-[0_18px_45px_rgba(0,0,0,0.65)]
  `;

  const actionsItemBaseCls = `
    text-sm text-foreground-500
    px-3 py-2
    rounded-xl
    data-[hover=true]:bg-white/5
    data-[hover=true]:text-white
    cursor-pointer
  `;

  const actionsDeleteCls = `
    ${actionsItemBaseCls}
    text-[#D01355]
    data-[hover=true]:bg-[#521729]
    data-[hover=true]:text-[#D01355]
  `;

  const isSomeActionLoading =
    isAddingPayment || isSavingEditedPayment || deletingPaymentIndex !== null;

  return (
    <>
      <Tooltip
        content={tipContent}
        classNames={{
          content:
            "text-sm font-semibold px-3 py-2 bg-[#0b0c10] border border-white/10",
        }}
      >
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onPress={open}
          aria-label="Gerenciar pagamentos"
          className={`w-[34px] h-[34px] min-w-[34px] p-0 rounded-full hover:bg-white/10 ${
            buttonClassName ?? ""
          }`}
        >
          {client.visualPaymentConfirmed ? (
            <CircleCheckBig className="w-6 h-6 text-emerald-400" />
          ) : (
            <CircleX className="w-6 h-6 text-rose-400" />
          )}
        </Button>
      </Tooltip>

      <Modal
        isOpen={isOpen}
        onOpenChange={(openState) => {
          if (!openState) {
            // 🔒 não deixa fechar enquanto tiver ação pendente
            if (isSomeActionLoading) return;
            close();
          } else {
            setIsOpen(true);
          }
        }}
        placement="center"
        backdrop="blur"
        radius="lg"
        size="md"
        classNames={{
          base: `
            bg-[#18181B] rounded-2xl text-foreground
            w-[90vw] sm:w-full
            max-w-[620px] md:max-w-[680px]
            max-h-[90vh]
            overflow-hidden
            flex flex-col
          `,
          backdrop: "backdrop-blur-md",
          closeButton:
            "right-3 left-auto top-3 text-foreground-500 hover:bg-white/10 active:bg-white/10",
        }}
      >
        <ModalContent>
          {(modalOnClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <span className="text-[22px] sm:text-2xl font-semibold text-[#AE7DAC]">
                  Gerenciar Pagamentos
                </span>

                <span className="text-base text-foreground-500">
                  Usuário:{" "}
                  <span className="text-foreground font-semibold text-[18px] sm:text-xl">
                    {modalClient?.user?.username ??
                      client.user?.username ??
                      "-"}
                  </span>
                </span>
              </ModalHeader>

              <Divider className="bg-white/10" />
              {/* ✅ sem scroll vertical NA TABELA; se precisar, quem rola é o ModalBody */}
              <ModalBody
                className={`py-6 px-4 overflow-y-auto ${styles.customScroll}`}
              >
                <div className="flex flex-col gap-4">
                  {isLoadingClient ? (
                    <div className="text-sm text-foreground-500">
                      Carregando...
                    </div>
                  ) : null}

                  <div className="flex items-center gap-3">
                    <span className="text-[17px] sm:text-lg font-semibold text-[#AE7DAC]">
                      Status Visual
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        radius="full"
                        onPress={() => setVisualPaidStatus(true)}
                        className={`
                          w-11 h-11 min-w-[44px] rounded-full
                          ${
                            isPaidVisual
                              ? "bg-emerald-500/15 border-2 border-emerald-400"
                              : "bg-white/5 border border-white/10"
                          }
                          hover:bg-emerald-500/20
                        `}
                        aria-label="Marcar como verificado (visual)"
                      >
                        <CircleCheckBig
                          className={`w-6 h-6 ${
                            isPaidVisual ? "text-emerald-400" : "text-white/40"
                          }`}
                        />
                      </Button>

                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        radius="full"
                        onPress={() => setVisualPaidStatus(false)}
                        className={`
                          w-11 h-11 min-w-[44px] rounded-full
                          ${
                            !isPaidVisual
                              ? "bg-rose-500/15 border-2 border-rose-400"
                              : "bg-white/5 border border-white/10"
                          }
                          hover:bg-rose-500/20
                        `}
                        aria-label="Marcar como não verificado (visual)"
                      >
                        <CircleX
                          className={`w-6 h-6 ${
                            !isPaidVisual ? "text-rose-400" : "text-white/40"
                          }`}
                        />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[17px] sm:text-lg font-semibold text-[#AE7DAC]">
                      Adicionar Pagamento
                    </span>

                    <div className="flex gap-2">
                      <div className="flex-1 min-w-0">
                        <span className={labelCls}>Bruto (R$)</span>
                        <Input
                          type="number"
                          value={String(newPaymentBruto || "")}
                          onChange={(e) =>
                            setNewPaymentBruto(
                              e.target.value === "" ? 0 : Number(e.target.value)
                            )
                          }
                          variant="flat"
                          radius="lg"
                          classNames={{
                            inputWrapper: inputWrapperCls,
                            input: inputTextCls,
                          }}
                          min={0}
                          step="0.01"
                          placeholder="Digite o valor bruto"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className={labelCls}>Líquido (R$)</span>
                        <Input
                          type="number"
                          value={String(newPaymentLiquido || "")}
                          onChange={(e) =>
                            setNewPaymentLiquido(
                              e.target.value === "" ? 0 : Number(e.target.value)
                            )
                          }
                          variant="flat"
                          radius="lg"
                          classNames={{
                            inputWrapper: inputWrapperCls,
                            input: inputTextCls,
                          }}
                          min={0}
                          step="0.01"
                          placeholder="Digite o valor líquido"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 items-end">
                      <div className="flex-[3] min-w-0">
                        <span className={labelCls}>Data</span>
                        <Input
                          type="date"
                          value={newPaymentDate}
                          onChange={(e) => setNewPaymentDate(e.target.value)}
                          variant="flat"
                          radius="lg"
                          classNames={{
                            inputWrapper: inputWrapperCls,
                            input: inputTextCls,
                          }}
                        />
                      </div>

                      <div className="flex-[2] min-w-0">
                        <Button
                          onPress={handleAddPayment}
                          disabled={isAddingPayment}
                          className="
                            w-full rounded-2xl h-12
                            bg-emerald-500 text-white
                            hover:bg-emerald-600
                            data-[pressed=true]:scale-[0.98]
                          "
                        >
                          {isAddingPayment ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Adicionando...
                            </span>
                          ) : (
                            "Add"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[17px] sm:text-lg font-semibold text-[#AE7DAC]">
                      Pagamentos Registrados
                    </span>

                    {modalClient?.paymentHistory &&
                    modalClient.paymentHistory.length > 0 ? (
                      <div className="rounded-2xl border border-white/10 overflow-hidden">
                        <Table
                          aria-label="Pagamentos registrados"
                          removeWrapper
                          classNames={{
                            table: "w-full table-fixed",
                            tbody: `[&>tr.w-px.h-px.block]:hidden`,
                            th: `
                              bg-[#27272A]
                              h-9 sm:h-10
                              px-1 sm:px-2
                              py-0
                              text-[9px] sm:text-[11px]
                              uppercase tracking-wider text-foreground-500
                              text-center
                              align-middle
                              whitespace-nowrap
                              leading-none
                              rounded-none
                            `,
                            td: `
                              text-[11px] sm:text-sm text-foreground
                              py-1.5 sm:py-2
                              px-1 sm:px-2
                              text-center
                              align-middle
                              whitespace-nowrap
                            `,
                          }}
                        >
                          <TableHeader>
                            <TableColumn className="w-[26%] sm:w-[96px] text-center">
                              Data
                            </TableColumn>
                            <TableColumn className="w-[26%] sm:w-[110px] text-center">
                              Bruto (R$)
                            </TableColumn>
                            <TableColumn className="w-[26%] sm:w-[120px] text-center">
                              Líquido (R$)
                            </TableColumn>
                            <TableColumn className="w-[22%] sm:w-[92px] text-center">
                              Ações
                            </TableColumn>
                          </TableHeader>

                          <TableBody>
                            {modalClient.paymentHistory.map((p, index) => {
                              const isEditing = editingPaymentIndex === index;
                              const isDeletingThisRow =
                                deletingPaymentIndex === index;

                              return (
                                <TableRow key={`${index}-${p.paymentDate}`}>
                                  <TableCell>
                                    {isEditing ? (
                                      <Input
                                        type="date"
                                        value={editPaymentDate}
                                        onChange={(e) =>
                                          setEditPaymentDate(e.target.value)
                                        }
                                        variant="flat"
                                        radius="lg"
                                        classNames={{
                                          inputWrapper: inputWrapperSmallCls,
                                          input: inputTextSmallCls,
                                        }}
                                      />
                                    ) : (
                                      <span className="tabular-nums">
                                        {formatDateToUTC(p.paymentDate)}
                                      </span>
                                    )}
                                  </TableCell>

                                  <TableCell>
                                    {isEditing ? (
                                      <Input
                                        type="number"
                                        value={String(editPaymentBruto || "")}
                                        onChange={(e) =>
                                          setEditPaymentBruto(
                                            e.target.value === ""
                                              ? 0
                                              : Number(e.target.value)
                                          )
                                        }
                                        variant="flat"
                                        radius="lg"
                                        classNames={{
                                          inputWrapper: inputWrapperSmallCls,
                                          input: inputTextSmallCls,
                                        }}
                                        min={0}
                                        step="0.01"
                                      />
                                    ) : (
                                      <span className="tabular-nums">
                                        {(p.paymentBruto ?? 0).toFixed(2)}
                                      </span>
                                    )}
                                  </TableCell>

                                  <TableCell>
                                    {isEditing ? (
                                      <Input
                                        type="number"
                                        value={String(editPaymentLiquido || "")}
                                        onChange={(e) =>
                                          setEditPaymentLiquido(
                                            e.target.value === ""
                                              ? 0
                                              : Number(e.target.value)
                                          )
                                        }
                                        variant="flat"
                                        radius="lg"
                                        classNames={{
                                          inputWrapper: inputWrapperSmallCls,
                                          input: inputTextSmallCls,
                                        }}
                                        min={0}
                                        step="0.01"
                                      />
                                    ) : (
                                      <span className="tabular-nums">
                                        {(p.paymentLiquido ?? 0).toFixed(2)}
                                      </span>
                                    )}
                                  </TableCell>

                                  <TableCell>
                                    {isEditing ? (
                                      <div className="flex items-center justify-center gap-1 sm:gap-2">
                                        <Button
                                          isIconOnly
                                          size="sm"
                                          variant="light"
                                          radius="full"
                                          onPress={handleSaveEditPayment}
                                          disabled={isSavingEditedPayment}
                                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full hover:bg-emerald-500/15"
                                        >
                                          {isSavingEditedPayment ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                                          ) : (
                                            <Save className="w-4 h-4 text-emerald-400" />
                                          )}
                                        </Button>

                                        <Button
                                          isIconOnly
                                          size="sm"
                                          variant="light"
                                          radius="full"
                                          onPress={() =>
                                            setEditingPaymentIndex(null)
                                          }
                                          disabled={isSavingEditedPayment}
                                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full hover:bg-rose-500/15"
                                        >
                                          <X className="w-4 h-4 text-rose-400" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <>
                                        {/* ✅ Desktop/Tablet: ícones inline */}
                                        <div className="hidden sm:flex items-center justify-center gap-2">
                                          <Button
                                            isIconOnly
                                            size="sm"
                                            variant="light"
                                            radius="full"
                                            onPress={() =>
                                              handleEditPayment(index, p)
                                            }
                                            disabled={isSavingEditedPayment}
                                            className="w-9 h-9 rounded-full hover:bg-sky-500/15"
                                          >
                                            <Pencil className="w-4 h-4 text-sky-400" />
                                          </Button>

                                          <Button
                                            isIconOnly
                                            size="sm"
                                            variant="light"
                                            radius="full"
                                            onPress={() =>
                                              handleDeletePayment(index)
                                            }
                                            disabled={isDeletingThisRow}
                                            className="w-9 h-9 rounded-full hover:bg-rose-500/15"
                                          >
                                            {isDeletingThisRow ? (
                                              <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                                            ) : (
                                              <Trash2 className="w-4 h-4 text-rose-400" />
                                            )}
                                          </Button>
                                        </div>

                                        {/* ✅ Mobile: 3 pontinhos + dropdown */}
                                        <div className="flex sm:hidden justify-center">
                                          <Dropdown
                                            placement="bottom-end"
                                            offset={4}
                                          >
                                            <DropdownTrigger>
                                              <Button
                                                isIconOnly
                                                size="sm"
                                                variant="light"
                                                radius="full"
                                                aria-label="Ações"
                                                className="
                                                  w-8 h-8 min-w-[32px]
                                                  rounded-full
                                                  hover:bg-white/10
                                                "
                                              >
                                                <MoreVertical className="w-4 h-4 text-foreground-500" />
                                              </Button>
                                            </DropdownTrigger>

                                            <DropdownMenu
                                              aria-label="Ações do pagamento"
                                              className={actionsMenuCls}
                                              itemClasses={{
                                                base: actionsItemBaseCls,
                                              }}
                                            >
                                              <DropdownItem
                                                key="edit"
                                                isDisabled={
                                                  isSavingEditedPayment ||
                                                  isDeletingThisRow
                                                }
                                                onPress={() =>
                                                  handleEditPayment(index, p)
                                                }
                                                startContent={
                                                  <Pencil className="w-4 h-4 text-sky-400" />
                                                }
                                              >
                                                Editar
                                              </DropdownItem>

                                              <DropdownItem
                                                key="delete"
                                                className={actionsDeleteCls}
                                                isDisabled={
                                                  isSavingEditedPayment ||
                                                  isDeletingThisRow
                                                }
                                                onPress={() =>
                                                  handleDeletePayment(index)
                                                }
                                                startContent={
                                                  <Trash2 className="w-4 h-4 text-[#D01355]" />
                                                }
                                              >
                                                Excluir
                                              </DropdownItem>
                                            </DropdownMenu>
                                          </Dropdown>
                                        </div>
                                      </>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-sm text-foreground-500">
                        Nenhum pagamento registrado.
                      </p>
                    )}
                  </div>

                  {errorMsg ? (
                    <p className="mt-2 text-xs text-rose-300">{errorMsg}</p>
                  ) : null}
                </div>
              </ModalBody>
              <Divider className="bg-white/10" />
              <ModalFooter className="gap-2">
                <Button
                  variant="light"
                  onPress={modalOnClose}
                  isDisabled={isSomeActionLoading}
                  className="
                    rounded-2xl
                    w-full sm:w-auto
                    text-foreground-500
                    data-[hover=true]:bg-white/5
                    data-[pressed=true]:scale-[0.98]
                  "
                >
                  Fechar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
