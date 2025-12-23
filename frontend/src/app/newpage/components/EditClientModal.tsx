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
  useDisclosure,
  Textarea,
} from "@heroui/react";
import { UserRoundPen, ChevronDown, Loader2 } from "lucide-react";

import styles from "../testeScroll.module.css";

import api from "@/utils/api";
import type { Client, Plan, PaymentMethod, EditFormData } from "@/types/client";
import {
  fetchPlans,
  fetchPaymentMethods,
  updateClient,
} from "@/app/clients/api";
import { toast } from "react-hot-toast";
import { AxiosError } from "axios";

type Props = {
  client: Client;
  onUpdated: (updated: Client) => void;
  buttonClassName?: string;
  iconClassName?: string;
};

const toDateInputValue = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// Preview do bruto no front (o backend recalcula e garante a regra)
const calcGrossAmountByPlanName = (planName?: string) => {
  if (!planName) return 0;

  if (planName === "Comum") return 30.0;

  if (planName === "Platinum" || planName === "Hibrid" || planName === "P2P") {
    return 35.0;
  }

  return 0;
};

const mapClientToForm = (c: Client): EditFormData => ({
  fullName: c?.fullName ?? "",
  email: c?.email ?? "",
  phone: c?.phone ?? "",
  planId: c?.plan?.id ?? 0,
  paymentMethodId: c?.paymentMethod?.id ?? 0,
  dueDate: toDateInputValue(c?.dueDate ?? ""),
  grossAmount: Number(c?.grossAmount ?? 0),
  isActive: Boolean(c?.isActive),
  observations: c?.observations ?? "",
  username: c?.user?.username ?? "",
});

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

const EditClientModal: React.FC<Props> = ({
  client,
  onUpdated,
  buttonClassName,
  iconClassName,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [paymentMethods, setPaymentMethods] = React.useState<PaymentMethod[]>(
    []
  );
  const [isLoadingOptions, setIsLoadingOptions] = React.useState(false);

  const [isLoadingClient, setIsLoadingClient] = React.useState(false);

  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");

  // Snapshot "do servidor" (último que veio do backend) pra resetar quando fechar
  const [serverForm, setServerForm] = React.useState<EditFormData>(() =>
    mapClientToForm(client)
  );

  const [form, setForm] = React.useState<EditFormData>(() =>
    mapClientToForm(client)
  );

  // Se o "client" do pai mudar (ex: lista atualizada), atualiza o snapshot base
  React.useEffect(() => {
    const next = mapClientToForm(client);
    setServerForm(next);
    if (!isOpen) setForm(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    client?.id,
    client?.updatedAt,
    client?.dueDate,
    client?.grossAmount,
    client?.isActive,
  ]);

  const loadOptionsIfNeeded = async () => {
    if (plans.length && paymentMethods.length) return;

    try {
      setIsLoadingOptions(true);
      const [p, pm] = await Promise.all([fetchPlans(), fetchPaymentMethods()]);
      setPlans(p);
      setPaymentMethods(pm);
    } catch {
      setErrorMsg("Não foi possível carregar planos/métodos de pagamento.");
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const fetchFreshClient = async (): Promise<Client> => {
    const response = await api.get<Client>(`/api/clients/${client.id}`);
    return response.data;
  };

  const openWithFreshData = async () => {
    setErrorMsg("");

    try {
      await loadOptionsIfNeeded();

      setIsLoadingClient(true);
      const fresh = await fetchFreshClient();

      const next = mapClientToForm(fresh);
      setServerForm(next);
      setForm(next);

      onOpen();
    } catch {
      setErrorMsg("Não foi possível buscar os dados mais recentes do cliente.");
      // ainda abre, mas com o que você já tinha em memória
      setForm(serverForm);
      onOpen();
    } finally {
      setIsLoadingClient(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    // 🔒 não deixa fechar enquanto estiver salvando
    if (!open && isSaving) return;

    if (!open) {
      // comportamento do modal antigo: fechou sem salvar -> descarta rascunho
      setForm(serverForm);
      setErrorMsg("");
      setIsSaving(false);
      onClose();
      return;
    }

    onOpen();
  };

  const planLabel =
    plans.find((p) => p.id === form.planId)?.name ??
    client.plan?.name ??
    "Selecione";

  const paymentLabel =
    paymentMethods.find((p) => p.id === form.paymentMethodId)?.name ??
    client.paymentMethod?.name ??
    "Selecione";

  // Preview do bruto ao trocar o plano (o backend ainda recalcula ao salvar)
  React.useEffect(() => {
    const planName = plans.find((p) => p.id === form.planId)?.name;
    const calculated = calcGrossAmountByPlanName(planName);

    if (plans.length && calculated > 0) {
      setForm((prev) => ({ ...prev, grossAmount: calculated }));
    }
  }, [form.planId, plans.length, plans]);

  // 🔧 Ajustes mínimos (tamanhos/spacing) sem mudar estética:
  const labelCls = "text-[10px] uppercase tracking-wide text-foreground-500";

  // antes: h-12 sm:h-14 -> agora só um pouco menor
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

  // antes: text-base sm:text-lg -> agora só um pouco menor
  const inputTextCls =
    "text-[15px] sm:text-base text-foreground placeholder:text-foreground-500 h-full outline-none";

  const dropdownBtnCls = `
    w-full justify-between
    bg-[#27272A]
    rounded-2xl
    h-11 sm:h-12
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

    try {
      setIsSaving(true);

      const isoDueDate = new Date(
        `${form.dueDate}T00:00:00.000Z`
      ).toISOString();

      const payload: EditFormData = {
        ...form,
        dueDate: isoDueDate,
        observations: form.observations ?? "",
      };

      const updated = await updateClient(client.id, payload);
      onUpdated(updated);

      const next = mapClientToForm(updated);
      setServerForm(next);
      setForm(next);

      onClose();

      showSuccessToast("Usuário editado com sucesso!");
    } catch (err) {
      console.error("Erro ao atualizar cliente:", err);

      if (err instanceof AxiosError) {
        const backendMessage = (err.response?.data as { message?: string })
          ?.message;

        if (backendMessage) {
          setErrorMsg(backendMessage);
          showErrorToast(backendMessage);
        } else {
          const msg =
            "Erro ao salvar alterações. Verifique os dados e tente novamente.";
          setErrorMsg(msg);
          showErrorToast(
            "Erro ao salvar alterações.",
            "Verifique os dados e tente novamente."
          );
        }
      } else {
        const msg =
          "Erro ao salvar alterações. Verifique os dados e tente novamente.";
        setErrorMsg(msg);
        showErrorToast(
          "Erro ao salvar alterações.",
          "Verifique os dados e tente novamente."
        );
      }
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
        onPress={openWithFreshData}
        aria-label="Editar"
        className={`w-[30px] h-[30px] min-w-[30px] p-0 rounded-full hover:bg-white/10 ${
          buttonClassName ?? ""
        }`}
      >
        <UserRoundPen
          className={`${iconClassName ?? "w-[18px] h-[18px]"} text-current`}
          strokeWidth={2.4}
        />
      </Button>

      <Modal
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        placement="center"
        backdrop="blur"
        radius="lg"
        size="lg"
        classNames={{
          // 🔁 mesmo conceito do ManagePaymentsModal (largura + altura + scroll interno)
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
            "right-2 top-2 text-foreground-500 hover:bg-white/10 active:bg-white/10",
        }}
      >
        <ModalContent>
          {(modalOnClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <UserRoundPen className="w-8 h-8 text-green-400" />
                  <span className="text-[15px] px-3 sm:text-xl font-semibold">
                    Editar cliente
                  </span>
                </div>
              </ModalHeader>
              <Divider className="bg-white/10" />

              {/* 🔁 igual ao ManagePayments: corpo cresce e rola dentro do modal */}
              <ModalBody
                className={`py-4 overflow-y-auto ${styles.customScroll}`}
              >
                {isLoadingOptions || isLoadingClient ? (
                  <div className="text-sm text-foreground-500">
                    Carregando...
                  </div>
                ) : null}

                {/* antes: gap-4 -> agora gap-3 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2 order-1">
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

                  <div className="order-2">
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

                  <div className="order-3">
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

                  <div className="md:col-span-2 order-4">
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

                  <div className="order-5">
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
                              <ChevronDown className="w-4 h-4 text-foreground-500" />
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

                  <div className="order-6">
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
                              <ChevronDown className="w-4 h-4 text-foreground-500" />
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

                  <div className="order-7">
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

                  <div className="order-8">
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

                  <div className="md:col-span-2 order-9">
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
                          !max-h-[88px] sm:!max-h-[96px]
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
                          focus:outline-none
                          focus-visible:outline-none
                          focus:ring-0
                          focus-visible:ring-0
                          break-words
                          [overflow-wrap:anywhere]
                          [scrollbar-width:thin]
                          [scrollbar-color:rgba(255,255,255,0.25)_transparent]
                          [&::-webkit-scrollbar]:w-2
                          [&::-webkit-scrollbar-track]:bg-transparent
                          [&::-webkit-scrollbar-thumb]:bg-white/20
                          [&::-webkit-scrollbar-thumb]:rounded-full
                          hover[&::-webkit-scrollbar-thumb]:bg-white/30
                        `,
                      }}
                      placeholder="Digite observações (opcional)..."
                    />
                  </div>

                  {/* ATIVO */}
                  <div className="md:col-span-2 order-10 flex items-center justify-start gap-3 pt-1">
                    <span className={labelCls}>Ativo</span>

                    {/* SWITCH */}
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

                <Button
                  variant="light"
                  onPress={save}
                  disabled={isSaving}
                  className="
                    rounded-2xl
                    w-full sm:w-auto
                    text-emerald-500
                    data-[hover=true]:bg-emerald-600/10
                    data-[pressed=true]:scale-[0.98]
                  "
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </span>
                  ) : (
                    "Salvar"
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

export default EditClientModal;