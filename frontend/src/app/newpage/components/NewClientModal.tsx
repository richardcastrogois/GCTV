// frontend/src/app/newpage/components/EditClientModal.tsx
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
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Textarea,
  useDisclosure,
} from "@heroui/react";
import {
  Users as UsersIcon,
  ChevronDown,
  UserPlus,
  Loader2,
} from "lucide-react";

import styles from "../testeScroll.module.css";

import api from "@/utils/api";
import type { Client } from "@/types/client";
import { toast } from "react-hot-toast";
import { AxiosError } from "axios";

type Plan = { id: number; name: string };
type PaymentMethod = { id: number; name: string };

type NewFormData = {
  fullName: string;
  email: string;
  phone: string;
  username: string;
  planId: number;
  paymentMethodId: number;
  dueDate: string; // YYYY-MM-DD
  grossAmount: number; // number
  netAmount: number; // number (só preview)
  isActive: boolean;
  observations: string;
};

type Props = {
  onCreated: (created: Client) => void;
  /** opcional: se quiser controlar a aparência do botão de abrir */
  triggerClassName?: string;
};

function toISOFromYYYYMMDD_UTC(yyyyMMdd: string) {
  const [y, m, d] = yyyyMMdd.split("-").map((n) => Number(n));
  if (!y || !m || !d) return "";
  return new Date(Date.UTC(y, m - 1, d)).toISOString();
}

function calcGrossByPlanName(planName?: string) {
  if (!planName) return 0;

  if (planName === "Comum") return 30.0;

  if (planName === "Platinum" || planName === "Hibrid" || planName === "P2P") {
    return 35.0;
  }

  return 0;
}

function calcNetByPaymentName(gross: number, paymentName?: string) {
  if (!paymentName) return gross;

  if (paymentName === "PagSeguro") {
    if (gross === 35.0) return 32.85;
    if (gross === 30.0) return 28.1;
  }

  return gross;
}

// === TOASTS (sucesso / erro / aviso) ===

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
        duration: 2200,
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
          className={`hero-toast-error ${
            !t.visible ? "hero-toast-error--leave" : ""
          }`}
        >
          <div className="hero-toast-text">
            <div className="hero-toast-error-title">{title}</div>
            {description && (
              <div className="hero-toast-error-subtitle">{description}</div>
            )}
          </div>

          <button
            type="button"
            className="hero-toast-error-close"
            onClick={() => toast.dismiss(t.id)}
          >
            ×
          </button>
        </div>
      ),
      {
        position: "top-right",
        duration: 2600,
      }
    );
  }, 330);
};

const showWarningToast = (title: string, description?: string) => {
  toast.dismiss();

  setTimeout(() => {
    toast.custom(
      (t) => (
        <div
          className={`hero-toast-warning ${
            !t.visible ? "hero-toast-warning--leave" : ""
          }`}
        >
          <div className="hero-toast-text">
            <div className="hero-toast-warning-title">{title}</div>
            {description && (
              <div className="hero-toast-warning-subtitle">{description}</div>
            )}
          </div>

          <button
            type="button"
            className="hero-toast-warning-close"
            onClick={() => toast.dismiss(t.id)}
          >
            ×
          </button>
        </div>
      ),
      {
        position: "top-right",
        duration: 2300,
      }
    );
  }, 330);
};

const NewClientModal: React.FC<Props> = ({ onCreated, triggerClassName }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [paymentMethods, setPaymentMethods] = React.useState<PaymentMethod[]>(
    []
  );
  const [isLoadingOptions, setIsLoadingOptions] = React.useState(false);

  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");

  const initialForm = React.useMemo<NewFormData>(
    () => ({
      fullName: "",
      email: "",
      phone: "",
      username: "",
      planId: 0,
      paymentMethodId: 0,
      dueDate: "",
      grossAmount: 0,
      netAmount: 0,
      isActive: true,
      observations: "",
    }),
    []
  );

  const [form, setForm] = React.useState<NewFormData>(initialForm);

  const loadOptions = React.useCallback(async () => {
    if (plans.length && paymentMethods.length) return;

    try {
      setIsLoadingOptions(true);
      const [pRes, pmRes] = await Promise.all([
        api.get<Plan[]>("/api/clients/plans"),
        api.get<PaymentMethod[]>("/api/clients/payment-methods"),
      ]);
      setPlans(pRes.data ?? []);
      setPaymentMethods(pmRes.data ?? []);
    } catch {
      setErrorMsg("Não foi possível carregar planos/métodos de pagamento.");
      showErrorToast(
        "Erro ao carregar dados.",
        "Não foi possível carregar planos/métodos de pagamento."
      );
    } finally {
      setIsLoadingOptions(false);
    }
  }, [plans.length, paymentMethods.length]);

  const openModal = async () => {
    setErrorMsg("");
    await loadOptions();
    onOpen();
  };

  const handleClose = () => {
    setForm(initialForm);
    setErrorMsg("");
    setIsSaving(false);
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    // 🔒 impede fechar enquanto está salvando
    if (!open && isSaving) return;

    if (!open) {
      handleClose();
      return;
    }

    onOpen();
  };

  const planName =
    plans.find((p) => p.id === form.planId)?.name ??
    (form.planId ? "" : undefined);

  const paymentName =
    paymentMethods.find((p) => p.id === form.paymentMethodId)?.name ??
    (form.paymentMethodId ? "" : undefined);

  const planLabel =
    plans.find((p) => p.id === form.planId)?.name ?? "Selecione";

  const paymentLabel =
    paymentMethods.find((p) => p.id === form.paymentMethodId)?.name ??
    "Selecione";

  React.useEffect(() => {
    if (!form.planId || !form.paymentMethodId || !plans.length) {
      setForm((prev) => ({ ...prev, grossAmount: 0, netAmount: 0 }));
      return;
    }

    const gross = calcGrossByPlanName(planName);
    const net = calcNetByPaymentName(gross, paymentName);

    setForm((prev) => ({ ...prev, grossAmount: gross, netAmount: net }));
  }, [form.planId, form.paymentMethodId, plans.length, planName, paymentName]);

  const save = async () => {
    setErrorMsg("");

    if (!form.fullName.trim()) {
      const msg = "Informe o nome.";
      setErrorMsg(msg);
      showWarningToast(msg);
      return;
    }
    if (!form.username.trim()) {
      const msg = "Informe o usuário.";
      setErrorMsg(msg);
      showWarningToast(msg);
      return;
    }
    if (!form.email.trim()) {
      const msg = "Informe o e-mail.";
      setErrorMsg(msg);
      showWarningToast(msg);
      return;
    }
    if (!form.planId) {
      const msg = "Selecione o plano.";
      setErrorMsg(msg);
      showWarningToast(msg);
      return;
    }
    if (!form.paymentMethodId) {
      const msg = "Selecione o pagamento.";
      setErrorMsg(msg);
      showWarningToast(msg);
      return;
    }
    if (!form.dueDate) {
      const msg = "Selecione a data de vencimento.";
      setErrorMsg(msg);
      showWarningToast(msg);
      return;
    }
    if (!form.grossAmount) {
      const msg = "Valor bruto inválido.";
      setErrorMsg(msg);
      showWarningToast(msg);
      return;
    }

    const dueDateIso = toISOFromYYYYMMDD_UTC(form.dueDate);
    if (!dueDateIso) {
      const msg = "Data de vencimento inválida.";
      setErrorMsg(msg);
      showWarningToast(msg);
      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        username: form.username,
        planId: form.planId,
        paymentMethodId: form.paymentMethodId,
        dueDate: dueDateIso,
        grossAmount: Number(form.grossAmount),
        isActive: Boolean(form.isActive),
        observations: form.observations ?? "",
      };

      const res = await api.post<Client>("/api/clients", payload);

      const created = res.data;
      onCreated(created);

      handleClose();
      showSuccessToast("Usuário cadastrado com sucesso!");
    } catch (err) {
      console.error("Erro ao cadastrar cliente:", err);

      if (err instanceof AxiosError) {
        const backendMessage = (err.response?.data as { message?: string })
          ?.message;

        if (backendMessage) {
          setErrorMsg(backendMessage);
          showErrorToast(backendMessage);
        } else {
          const msg =
            "Não foi possível cadastrar. Verifique os dados e tente novamente.";
          setErrorMsg(msg);
          showErrorToast(
            "Erro ao cadastrar.",
            "Verifique os dados e tente novamente."
          );
        }
      } else {
        const msg =
          "Não foi possível cadastrar. Verifique os dados e tente novamente.";
        setErrorMsg(msg);
        showErrorToast(
          "Erro ao cadastrar.",
          "Verifique os dados e tente novamente."
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ===== classes (mantendo estética) =====
  const labelCls = "text-[10px] uppercase tracking-wide text-foreground-500";

  const inputWrapperCls = `
    bg-[#27272A]
    rounded-2xl
    h-11 sm:h-12
    px-4
    border border-transparent
    data-[hover=true]:bg-[#3F3F46]
    data-[focus-visible=true]:bg-[#27272A]
    data-[focus-visible=true]:border-primary/40
    data-[focus-visible=true]:ring-0
    data-[focus-visible=true]:outline-none
  `;

  const inputTextCls =
    "text-[15px] sm:text-base text-foreground placeholder:text-foreground-500 h-full outline-none";

  const dropdownBtnCls = `
    w-full justify-between
    bg-[#27272A]
    rounded-2xl
    h-10 sm:h-11
    px-4
    border border-transparent
    text-[15px] sm:text-base
    font-normal
    text-foreground-500
    data-[hover=true]:bg-[#3F3F46]
    data-[pressed=true]:scale-[0.99]
    data-[focus-visible=true]:bg-[#27272A]
    data-[focus-visible=true]:border-primary/40
    data-[focus-visible=true]:outline-none
    data-[focus-visible=true]:ring-0
  `;

  return (
    <>
      {/* Botão de abrir (mantém o visual do seu header) */}
      <Button
        startContent={<UsersIcon className="w-4 h-4" />}
        variant="shadow"
        onPress={openModal}
        className={
          triggerClassName ??
          `
            rounded-xl mb-4
            bg-[#4064b2]
            text-white
            shadow-[0_0_0_1px_#3b82f6,0_0_25px_rgba(37,99,235,0.6)]
          `
        }
      >
        Novo usuário
      </Button>

      <Modal
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        placement="center"
        backdrop="blur"
        radius="lg"
        size="lg"
        classNames={{
          // 🔁 mesmo layout/altura do Gerenciar Pagamentos
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
            "right-4 top-4 text-foreground-500 hover:bg-white/10 active:bg-white/10",
        }}
      >
        <ModalContent>
          {(modalOnClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-8 h-8 text-emerald-400" />
                  <span className="text-[15px] px-3 sm:text-xl font-semibold">
                    Cadastrar cliente
                  </span>
                </div>
              </ModalHeader>
              <Divider className="bg-white/10" />

              {/* 🔁 corpo com scroll interno, igual ManagePayments */}
              <ModalBody
                className={`py-4 px-6 overflow-y-auto ${styles.customScroll}`}
              >
                {isLoadingOptions ? (
                  <div className="text-sm text-foreground-500">
                    Carregando...
                  </div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <span className={labelCls}>Nome</span>
                    <Input
                      value={form.fullName}
                      onChange={(ev) =>
                        setForm((p) => ({ ...p, fullName: ev.target.value }))
                      }
                      variant="flat"
                      radius="lg"
                      classNames={{
                        inputWrapper: `mt-2 ${inputWrapperCls}`,
                        input: inputTextCls,
                      }}
                    />
                  </div>

                  <div>
                    <span className={labelCls}>Usuário (username)</span>
                    <Input
                      value={form.username}
                      onChange={(ev) =>
                        setForm((p) => ({ ...p, username: ev.target.value }))
                      }
                      variant="flat"
                      radius="lg"
                      classNames={{
                        inputWrapper: `mt-2 ${inputWrapperCls}`,
                        input: inputTextCls,
                      }}
                    />
                  </div>

                  <div>
                    <span className={labelCls}>Telefone</span>
                    <Input
                      value={form.phone}
                      onChange={(ev) =>
                        setForm((p) => ({ ...p, phone: ev.target.value }))
                      }
                      variant="flat"
                      radius="lg"
                      classNames={{
                        inputWrapper: `mt-2 ${inputWrapperCls}`,
                        input: inputTextCls,
                      }}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <span className={labelCls}>E-mail</span>
                    <Input
                      value={form.email}
                      onChange={(ev) =>
                        setForm((p) => ({ ...p, email: ev.target.value }))
                      }
                      variant="flat"
                      radius="lg"
                      classNames={{
                        inputWrapper: `mt-2 ${inputWrapperCls}`,
                        input: inputTextCls,
                      }}
                    />
                  </div>

                  <div>
                    <span className={labelCls}>Plano</span>
                    <div className="mt-2">
                      <Dropdown placement="bottom-start" offset={6}>
                        <DropdownTrigger>
                          <Button
                            size="sm"
                            radius="lg"
                            variant="flat"
                            className={dropdownBtnCls}
                            endContent={
                              <ChevronDown className="w-3 h-3 text-foreground-500" />
                            }
                          >
                            {planLabel}
                          </Button>
                        </DropdownTrigger>

                        <DropdownMenu
                          aria-label="Selecionar plano"
                          selectionMode="single"
                          className="
                            bg-[#27272A]
                            rounded-2xl
                            py-1 px-2
                            shadow-[0_18px_45px_rgba(0,0,0,0.65)]
                          "
                          itemClasses={{
                            base: `
                              text-sm text-foreground-500
                              px-3 py-2 rounded-xl
                              data-[hover=true]:bg-white/5
                              data-[hover=true]:text-white
                              cursor-pointer
                            `,
                          }}
                          onSelectionChange={(keys) => {
                            const raw = Array.from(keys)[0];
                            const id = Number(raw?.toString() ?? 0);
                            setForm((p) => ({ ...p, planId: id }));
                          }}
                        >
                          {plans.map((p) => (
                            <DropdownItem key={String(p.id)}>
                              {p.name}
                            </DropdownItem>
                          ))}
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  </div>

                  <div>
                    <span className={labelCls}>Pagamento</span>
                    <div className="mt-2">
                      <Dropdown placement="bottom-start" offset={6}>
                        <DropdownTrigger>
                          <Button
                            size="sm"
                            radius="lg"
                            variant="flat"
                            className={dropdownBtnCls}
                            endContent={
                              <ChevronDown className="w-3 h-3 text-foreground-500" />
                            }
                          >
                            {paymentLabel}
                          </Button>
                        </DropdownTrigger>

                        <DropdownMenu
                          aria-label="Selecionar pagamento"
                          selectionMode="single"
                          className="
                            bg-[#27272A]
                            rounded-2xl
                            py-1 px-2
                            shadow-[0_18px_45px_rgba(0,0,0,0.65)]
                          "
                          itemClasses={{
                            base: `
                              text-sm text-foreground-500
                              px-3 py-2 rounded-xl
                              data-[hover=true]:bg-white/5
                              data-[hover=true]:text-white
                              cursor-pointer
                            `,
                          }}
                          onSelectionChange={(keys) => {
                            const raw = Array.from(keys)[0];
                            const id = Number(raw?.toString() ?? 0);
                            setForm((p) => ({ ...p, paymentMethodId: id }));
                          }}
                        >
                          {paymentMethods.map((pm) => (
                            <DropdownItem key={String(pm.id)}>
                              {pm.name}
                            </DropdownItem>
                          ))}
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  </div>

                  <div>
                    <span className={labelCls}>Valor bruto</span>
                    <Input
                      type="number"
                      value={String(form.grossAmount ?? 0)}
                      isReadOnly
                      variant="flat"
                      radius="lg"
                      classNames={{
                        inputWrapper: `mt-2 ${inputWrapperCls} opacity-90`,
                        input: `${inputTextCls} cursor-not-allowed`,
                      }}
                    />
                  </div>

                  <div>
                    <span className={labelCls}>Valor líquido (preview)</span>
                    <Input
                      type="number"
                      value={String(form.netAmount ?? 0)}
                      isReadOnly
                      variant="flat"
                      radius="lg"
                      classNames={{
                        inputWrapper: `mt-2 ${inputWrapperCls} opacity-90`,
                        input: `${inputTextCls} cursor-not-allowed`,
                      }}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <span className={labelCls}>Vencimento</span>
                    <Input
                      type="date"
                      value={form.dueDate}
                      onChange={(ev) =>
                        setForm((p) => ({ ...p, dueDate: ev.target.value }))
                      }
                      variant="flat"
                      radius="lg"
                      classNames={{
                        inputWrapper: `mt-2 ${inputWrapperCls}`,
                        input: inputTextCls,
                      }}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <span className={labelCls}>Observações</span>

                    <Textarea
                      value={form.observations ?? ""}
                      onChange={(ev) =>
                        setForm((p) => ({
                          ...p,
                          observations: ev.target.value,
                        }))
                      }
                      variant="flat"
                      radius="lg"
                      minRows={3}
                      maxRows={3}
                      disableAutosize
                      classNames={{
                        inputWrapper: `
                          mt-2
                          bg-[#27272A]
                          rounded-2xl
                          px-4
                          border border-transparent
                          data-[hover=true]:bg-[#3F3F46]
                          data-[focus-visible=true]:bg-[#27272A]
                          data-[focus-visible=true]:border-primary/40
                          data-[focus-visible=true]:ring-0
                          data-[focus-visible=true]:outline-none
                          !h-[88px] sm:!h-[96px]
                          !max-h-[82px] sm:!max-h-[90px]
                          py-3
                          overflow-hidden
                        `,
                        input: `
                          ${inputTextCls}
                          resize-none
                          !h-full
                          !max-h-full
                          overflow-y-auto
                          pr-2
                          outline-none
                          [overflow-wrap:anywhere]
                        `,
                      }}
                      placeholder="Digite observações (opcional)..."
                    />
                  </div>

                  {/* ATIVO (switch simples igual o do editar) */}
                  <div className="md:col-span-2 flex items-center justify-start gap-3 pt-1">
                    <span className={labelCls}>Ativo</span>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.isActive}
                      onClick={() =>
                        setForm((p) => ({ ...p, isActive: !p.isActive }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setForm((p) => ({ ...p, isActive: !p.isActive }));
                        }
                      }}
                      className={`
                        relative inline-flex items-center
                        h-6 w-11 sm:h-7 sm:w-12
                        rounded-full
                        border border-white/10
                        transition-colors
                        focus:outline-none focus-visible:ring-0
                        ${form.isActive ? "bg-[#A855F7]" : "bg-white/10"}
                        hover:${form.isActive ? "bg-[#9333EA]" : "bg-white/15"}
                      `}
                    >
                      <span
                        className={`
                          pointer-events-none inline-block
                          h-5 w-5 sm:h-5 sm:w-5
                          rounded-full
                          border border-white/10
                          bg-white
                          shadow-sm
                          transform transition-transform
                          ${
                            form.isActive
                              ? "translate-x-5 sm:translate-x-6"
                              : "translate-x-1"
                          }
                        `}
                      />
                    </button>
                  </div>
                </div>

                {errorMsg ? (
                  <p className="mt-3 text-xs text-rose-300">{errorMsg}</p>
                ) : null}
              </ModalBody>
              <Divider className="bg-white/10" />
              <ModalFooter className="gap-2">
                <Button
                  variant="light"
                  onPress={modalOnClose}
                  isDisabled={isSaving}
                  className="
                    rounded-2xl
                    w-full sm:w-auto
                    text-rose-500
                    data-[hover=true]:bg-rose-600/10
                    data-[pressed=true]:scale-[0.98]
                  "
                >
                  Cancelar
                </Button>

                {/* ✅ “Cadastrar” com spinner + texto */}
                <Button
                  onPress={save}
                  disabled={isSaving}
                  className="
                    rounded-2xl
                    w-full sm:w-auto
                    bg-emerald-500 text-white
                    hover:bg-emerald-600
                    data-[pressed=true]:scale-[0.98]
                  "
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cadastrando...
                    </span>
                  ) : (
                    "Cadastrar"
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

export default NewClientModal;