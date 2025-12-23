// frontend/src/app/newpage/components/ReactivateClientModal.tsx
"use client";

import React from "react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Button,
  Input,
  Divider,
  useDisclosure,
} from "@heroui/react";

import { Zap, Loader2 } from "lucide-react";
import { toast } from "react-toastify";

import styles from "../testeScroll.module.css";

import { Client } from "@/types/client";
import { reactivateClient } from "@/app/expired/api";

type ReactivateClientModalProps = {
  client: Client;
  onReactivated: (id: number) => void;
  iconClassName?: string;
};

const getTodayYYYYMMDD = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatDateBRFromYYYYMMDD = (yyyyMMdd?: string) => {
  if (!yyyyMMdd) return "-";
  const [y, m, d] = yyyyMMdd.split("-");
  if (!y || !m || !d) return "-";
  return `${d}/${m}/${y}`;
};

const ReactivateClientModal: React.FC<ReactivateClientModalProps> = ({
  client,
  onReactivated,
  iconClassName,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [newDueDate, setNewDueDate] = React.useState<string>(() =>
    getTodayYYYYMMDD()
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string>("");

  // sempre que trocar o cliente, reseta o estado
  React.useEffect(() => {
    setNewDueDate(getTodayYYYYMMDD());
    setErrorMsg("");
    setIsSaving(false);
  }, [client?.id]);

  const newDueBR = React.useMemo(
    () => formatDateBRFromYYYYMMDD(newDueDate),
    [newDueDate]
  );

  const handleOpenChange = (open: boolean) => {
    // não deixa fechar enquanto estiver salvando
    if (!open && isSaving) return;

    if (!open) {
      setErrorMsg("");
      setIsSaving(false);
      onClose();
      return;
    }

    // ao abrir, sempre sugere a data de hoje
    setNewDueDate(getTodayYYYYMMDD());
    setErrorMsg("");
    setIsSaving(false);
    onOpen();
  };

  const handleConfirm = async () => {
    setErrorMsg("");

    if (!newDueDate) {
      setErrorMsg("Selecione uma data de vencimento.");
      toast.error("Informe a nova data de vencimento.");
      return;
    }

    const parsed = new Date(newDueDate);
    if (Number.isNaN(parsed.getTime())) {
      setErrorMsg("Data inválida. Use o formato correto.");
      toast.error("Data inválida. Use o formato YYYY-MM-DD.");
      return;
    }

    try {
      setIsSaving(true);

      // ❗ mantém exatamente o comportamento antigo:
      // envia a string "YYYY-MM-DD" para o back
      await reactivateClient(client.id, newDueDate);

      toast.success("Cliente reativado com sucesso!");
      onReactivated(client.id);
      onClose();
    } catch (error) {
      console.error("Erro ao reativar cliente:", error);
      setErrorMsg(
        "Não foi possível reativar. Verifique sua conexão e tente novamente."
      );
      toast.error("Não foi possível reativar o cliente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Botão de abrir - mesmo estilo base do Renovar */}
      <Button
        isIconOnly
        size="sm"
        variant="light"
        onPress={onOpen}
        aria-label="Reativar"
        className="
          w-[30px] h-[30px] min-w-[30px]
          p-0 rounded-full
          hover:bg-white/10
        "
      >
        <Zap
          className={`w-[18px] h-[18px] ${iconClassName ?? ""}`}
          strokeWidth={2.4}
        />
      </Button>

      <Modal
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        placement="center"
        backdrop="blur"
        radius="lg"
        classNames={{
          base: "bg-[#18181B] text-foreground w-[92vw] sm:w-full max-w-[410px] rounded-2xl",
          backdrop: "backdrop-blur-md",
          closeButton:
            "right-3 left-auto top-3 text-foreground-500 hover:bg-white/10 active:bg-white/10",
        }}
      >
        <ModalContent>
          {(modalOnClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <Zap className="w-8 h-8 text-warning-400" strokeWidth={2.4} />
                <div className="flex flex-col leading-tight">
                  <span className="text-xl font-semibold">
                    Reativar cliente
                  </span>
                  <span className="text-xs text-foreground-500">
                    Defina a nova data de vencimento para reativar o acesso.
                  </span>
                </div>
              </ModalHeader>

              <Divider className="bg-white/10" />

              <ModalBody className={`py-4 ${styles.customScroll}`}>
                {/* Bloco central com ícone grande */}
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-24 h-24 rounded-full border-4 border-warning-400/90 flex items-center justify-center">
                    <span className="text-warning-400 text-5xl font-extrabold">
                      !
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold">Reativar usuário</h2>
                    <p className="text-sm text-foreground-600">
                      Confirme os dados abaixo e escolha a nova data de
                      vencimento.
                    </p>
                  </div>
                </div>

                {/* Card com informações do cliente */}
                <div className="mt-4 rounded-2xl bg-white/[0.05] border border-white/10 p-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-foreground-500">
                        Usuário:
                      </span>
                      <span className="text-base font-medium">
                        {client.user?.username ?? "-"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-foreground-500">Nome:</span>
                      <span className="text-sm truncate max-w-[260px]">
                        {client.fullName ?? "-"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-foreground-500">
                        Plano:
                      </span>
                      <span className="text-base">
                        {client.plan?.name ?? "-"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-foreground-500">
                        Novo vencimento:
                      </span>
                      <span className="text-base text-warning-400 font-semibold">
                        {newDueBR}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Campo de data */}
                <div className="mt-3">
                  <span className="text-[11px] uppercase tracking-wide text-foreground-500">
                    Nova data de vencimento
                  </span>

                  <Input
                    type="date"
                    value={newDueDate}
                    onChange={(ev) => setNewDueDate(ev.target.value)}
                    variant="flat"
                    radius="lg"
                    classNames={{
                      inputWrapper: `
                        mt-2 bg-[#27272A] rounded-2xl h-14 px-4
                        border border-white/10
                        shadow-[0_10px_35px_rgba(0,0,0,0.35)]
                        data-[hover=true]:bg-[#2F2F35]
                        data-[hover=true]:border-white/15
                        data-[focus-visible=true]:bg-[#27272A]
                        data-[focus-visible=true]:border-primary/40
                        data-[focus-visible=true]:ring-0
                        data-[focus-visible=true]:outline-none
                      `,
                      input:
                        "text-lg text-foreground placeholder:text-foreground-500 h-full outline-none",
                    }}
                  />

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
                  isDisabled={isSaving}
                  className="
                    rounded-2xl w-full sm:w-auto
                    text-rose-400
                    data-[hover=true]:bg-rose-500/15
                    data-[pressed=true]:scale-[0.98]
                  "
                >
                  Cancelar
                </Button>

                <Button
                  variant="light"
                  onPress={handleConfirm}
                  disabled={isSaving}
                  className="
                    rounded-2xl w-full sm:w-auto
                    text-emerald-400
                    data-[hover=true]:bg-emerald-500/15
                    data-[pressed=true]:scale-[0.98]
                  "
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Reativando...
                    </span>
                  ) : (
                    "Confirmar reativação"
                  )}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default ReactivateClientModal;
