// frontend/src/app/newpage/components/RenewClientModal.tsx
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
  useDisclosure,
} from "@heroui/react";
import { Zap, Loader2 } from "lucide-react";

import styles from "../testeScroll.module.css";

import type { Client } from "@/types/client";
import { renewClient } from "@/app/clients/api";
import { toast } from "react-hot-toast";

type RenewClientModalProps = {
  client: Client;
  onUpdated: (updated: Client) => void;
  buttonClassName?: string;
  iconClassName?: string;
};

type ClientWithDueDateString = Client & {
  dueDateString?: string;
};

const formatDateBRFromISOorString = (iso?: string) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
};

const formatDateBRFromYYYYMMDD = (yyyyMMdd?: string) => {
  if (!yyyyMMdd) return "-";
  const [y, m, d] = yyyyMMdd.split("-");
  if (!y || !m || !d) return "-";
  return `${d}/${m}/${y}`;
};

function daysInMonthUTC(year: number, monthIndex0: number) {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

function addOneMonthKeepDayUTC(base: Date) {
  const y = base.getUTCFullYear();
  const m = base.getUTCMonth();
  const d = base.getUTCDate();

  const nextMonthIndex = m + 1;
  const nextY = y + Math.floor(nextMonthIndex / 12);
  const nextM = nextMonthIndex % 12;

  const dim = daysInMonthUTC(nextY, nextM);
  const safeDay = Math.min(d, dim);

  return new Date(Date.UTC(nextY, nextM, safeDay));
}

function toYYYYMMDD_UTC(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* ================== TOASTS (MESMO PADRÃO DOS OUTROS) ================== */

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

/* ===================================================================== */

const RenewClientModal: React.FC<RenewClientModalProps> = ({
  client,
  onUpdated,
  buttonClassName,
  iconClassName,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const clientExt = client as ClientWithDueDateString;

  const clientId = clientExt?.id;
  const clientDueDate = clientExt?.dueDate;
  const clientEmail = clientExt?.email;
  const clientUsername = clientExt?.user?.username;

  const computeDefaultNewDueDate = React.useCallback((): string => {
    if (clientDueDate) {
      const base = new Date(clientDueDate);
      if (!Number.isNaN(base.getTime())) {
        const baseUTC = new Date(
          Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate())
        );
        const plus = addOneMonthKeepDayUTC(baseUTC);
        return toYYYYMMDD_UTC(plus);
      }
    }

    return "";
  }, [clientDueDate]);

  const [newDueDate, setNewDueDate] = React.useState<string>(() =>
    computeDefaultNewDueDate()
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string>("");

  React.useEffect(() => {
    setNewDueDate(computeDefaultNewDueDate());
    setErrorMsg("");
    setIsSaving(false);
  }, [clientId, computeDefaultNewDueDate]);

  const currentDueBR = formatDateBRFromISOorString(clientDueDate);

  const newDueBR = React.useMemo(
    () => formatDateBRFromYYYYMMDD(newDueDate),
    [newDueDate]
  );

  const handleOpenChange = (open: boolean) => {
    // 🔒 não deixa fechar enquanto estiver salvando
    if (!open && isSaving) return;

    if (!open) {
      setErrorMsg("");
      setIsSaving(false);
      onClose();
      return;
    }

    onOpen();
  };

  const handleConfirm = async () => {
    setErrorMsg("");

    if (!newDueDate) {
      setErrorMsg("Selecione uma data de vencimento.");
      return;
    }

    try {
      setIsSaving(true);

      const isoDueDate = new Date(`${newDueDate}T00:00:00.000Z`).toISOString();
      const updated = await renewClient(clientExt.id, isoDueDate);

      onUpdated(updated);
      onClose();

      showSuccessToast("Usuário renovado com sucesso!");
    } catch (err) {
      console.error(err);
      setErrorMsg(
        "Não foi possível renovar. Verifique sua conexão e tente novamente."
      );

      // ✅ toast de erro
      showErrorToast("Erro ao renovar usuário.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button
        isIconOnly
        size="sm"
        variant="light"
        onPress={onOpen}
        aria-label="Renovar"
        className={`w-[30px] h-[30px] min-w-[30px] p-0 rounded-full hover:bg-white/10 ${
          buttonClassName ?? ""
        }`}
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
                    Renovação Rápida
                  </span>
                  <span className="text-xs text-foreground-500">
                    Ajuste a data e confirme a renovação.
                  </span>
                </div>
              </ModalHeader>

              <Divider className="bg-white/10" />

              <ModalBody className={`py-4 ${styles.customScroll}`}>
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-24 h-24 rounded-full border-4 border-warning-400/90 flex items-center justify-center">
                    <span className="text-warning-400 text-5xl font-extrabold">
                      !
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold">Renovar usuário</h2>
                    <p className="text-sm text-foreground-600">
                      Confirme a nova data de vencimento abaixo.
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-white/[0.05] border border-white/10 p-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-foreground-500">
                        Usuário:
                      </span>
                      <span className="text-base font-medium">
                        {clientUsername ?? "-"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-foreground-500">
                        E-mail:
                      </span>
                      <span className="text-sm truncate max-w-[260px]">
                        {clientEmail ?? "-"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-foreground-500">
                        Vencimento atual:
                      </span>
                      <span className="text-base">{currentDueBR}</span>
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
                      Renovando...
                    </span>
                  ) : (
                    "Sim, renovar"
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

export default RenewClientModal;