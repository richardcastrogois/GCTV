// frontend/src/app/clients/new/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/utils/api";
import { toast } from "react-toastify";
import Navbar from "@/components/Navbar";
import { FaArrowLeft } from "react-icons/fa";
import Select, { StylesConfig } from "react-select";
import { useAuth } from "@/hooks/useAuth";
import { AxiosError } from "axios";

type SelectOption = { value: string; label: string } | null;

const customStyles: StylesConfig<SelectOption, false> = {
  control: (provided) => ({
    ...provided,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    backdropFilter: "blur(5px)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "0.5rem",
    padding: "0.25rem 0.5rem",
    boxShadow: "none",
    color: "var(--text-primary)",
    transition: "border-color 0.3s ease, box-shadow 0.3s ease",
    "&:hover": {
      borderColor: "rgba(255, 255, 255, 0.5)",
    },
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: "rgba(255, 240, 240, 0.8)",
    backdropFilter: "blur(5px)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "0.5rem",
    marginTop: "0.25rem",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
    zIndex: 9999,
  }),
  menuList: (provided) => ({
    ...provided,
    padding: 0,
    maxHeight: "200px",
    scrollbarWidth: "thin",
    scrollbarColor: "var(--accent-gray) transparent",
    "&::-webkit-scrollbar": { width: "6px" },
    "&::-webkit-scrollbar-track": { background: "transparent" },
    "&::-webkit-scrollbar-thumb": {
      background: "var(--accent-gray)",
      borderRadius: "3px",
    },
    "&::-webkit-scrollbar-thumb:hover": {
      background: "rgba(174, 125, 172, 0.8)",
    },
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? "var(--accent-blue)"
      : state.isFocused
      ? "rgba(241, 145, 109, 0.8)"
      : "transparent",
    color: state.isSelected
      ? "var(--button-active-text)"
      : "var(--text-primary-secondary)",
    padding: "0.5rem 1rem",
    transition: "background-color 0.2s ease",
    "&:hover": {
      backgroundColor: state.isSelected
        ? "var(--accent-blue)"
        : "rgba(241, 145, 109, 0.8)",
    },
  }),
  singleValue: (provided) => ({ ...provided, color: "var(--text-primary)" }),
  placeholder: (provided) => ({
    ...provided,
    color: "rgba(255, 255, 255, 0.9)",
  }),
  indicatorSeparator: (provided) => ({
    ...provided,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    color: "var(--text-primary)",
    padding: "0.25rem",
    "&:hover": { color: "var(--accent-blue)" },
  }),
};

interface Plan {
  id: number;
  name: string;
}
interface PaymentMethod {
  id: number;
  name: string;
}
interface FormData {
  fullName: string;
  email: string;
  phone: string;
  username: string;
  planId: number;
  paymentMethodId: number;
  dueDate: string;
  grossAmount: string;
  isActive: boolean;
  observations: string;
}

export default function NewClient() {
  const router = useRouter();
  const { handleUnauthorized } = useAuth();

  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    username: "",
    planId: 0,
    paymentMethodId: 0,
    dueDate: "",
    grossAmount: "",
    isActive: true,
    observations: "",
  });

  const [plans, setPlans] = useState<Plan[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // CORREÇÃO: Função específica para inputs de texto e textarea
  const handleTextChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // CORREÇÃO: Função específica para o checkbox
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSelectChange = (
    name: "planId" | "paymentMethodId",
    selectedOption: SelectOption
  ) => {
    const value = selectedOption ? parseInt(selectedOption.value, 10) : 0;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (formData.planId === 0) {
      setFormData((prev) => ({ ...prev, grossAmount: "" }));
      return;
    }
    const selectedPlan = plans.find((plan) => plan.id === formData.planId);
    if (!selectedPlan) return;

    if (selectedPlan.name === "Comum")
      setFormData((prev) => ({ ...prev, grossAmount: "30.00" }));
    else if (selectedPlan.name === "Platinum" || selectedPlan.name === "P2P")
      setFormData((prev) => ({ ...prev, grossAmount: "35.00" }));
    else setFormData((prev) => ({ ...prev, grossAmount: "" }));
  }, [formData.planId, plans]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [plansResponse, paymentMethodsResponse] = await Promise.all([
          api.get("/api/clients/plans"),
          api.get("/api/clients/payment-methods"),
        ]);
        setPlans(plansResponse.data);
        setPaymentMethods(paymentMethodsResponse.data);
      } catch (error) {
        console.error("Erro ao carregar opções:", error);
        if (error instanceof AxiosError && error.response?.status === 401) {
          handleUnauthorized();
        } else {
          toast.error("Erro ao carregar opções para o formulário.");
        }
      }
    };
    fetchOptions();
  }, [handleUnauthorized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.fullName ||
      !formData.email ||
      !formData.username ||
      formData.planId === 0 ||
      formData.paymentMethodId === 0 ||
      !formData.dueDate ||
      !formData.grossAmount
    ) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    try {
      await api.post("/api/clients", {
        ...formData,
        grossAmount: parseFloat(formData.grossAmount),
        dueDate: new Date(formData.dueDate).toISOString(),
      });
      toast.success("Cliente cadastrado com sucesso!");
      router.push("/clients");
    } catch (error) {
      if (error instanceof AxiosError) {
        const message = error.response?.data?.message || "Erro desconhecido";
        toast.error(`Erro ao cadastrar cliente: ${message}`);
        if (error.response?.status === 401) {
          handleUnauthorized();
        }
      } else {
        toast.error(`Erro ao cadastrar cliente: ${String(error)}`);
      }
    }
  };

  const handleBack = () => router.push("/clients");

  const planOptions = plans.map((plan) => ({
    value: plan.id.toString(),
    label: plan.name,
  }));
  const paymentMethodOptions = paymentMethods.map((method) => ({
    value: method.id.toString(),
    label: method.name,
  }));

  return (
    <div>
      <Navbar />
      <div className="p-6">
        <div className="max-w-md mx-auto bg-[var(--dashboard-bg)] backdrop-blur-md rounded-xl shadow-lg p-5">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-medium text-[var(--text-secondary)]">
              Cadastrar Novo Cliente
            </h1>
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-[var(--text-primary)] hover:text-[var(--accent-blue)] transition-colors duration-300"
            >
              <FaArrowLeft size={16} />
              <span>Voltar</span>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--text-primary)] mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleTextChange}
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.3)] rounded-lg text-[var(--text-primary)] text-sm transition-all duration-300 focus:outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_2px_rgba(241,145,109,0.3)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-primary)] mb-1">
                Usuário (Username)
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleTextChange}
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.3)] rounded-lg text-[var(--text-primary)] text-sm transition-all duration-300 focus:outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_2px_rgba(241,145,109,0.3)]"
                placeholder="Exemplo: joao.silva"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-primary)] mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleTextChange}
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.3)] rounded-lg text-[var(--text-primary)] text-sm transition-all duration-300 focus:outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_2px_rgba(241,145,109,0.3)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-primary)] mb-1">
                Telefone
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleTextChange}
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.3)] rounded-lg text-[var(--text-primary)] text-sm transition-all duration-300 focus:outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_2px_rgba(241,145,109,0.3)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-primary)] mb-1">
                Plano
              </label>
              <Select
                options={planOptions}
                value={planOptions.find(
                  (o) => o.value === String(formData.planId)
                )}
                onChange={(opt) => handleSelectChange("planId", opt)}
                styles={customStyles}
                placeholder="Selecione um plano"
                isSearchable={false}
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-primary)] mb-1">
                Método de Pagamento
              </label>
              <Select
                options={paymentMethodOptions}
                value={paymentMethodOptions.find(
                  (o) => o.value === String(formData.paymentMethodId)
                )}
                onChange={(opt) => handleSelectChange("paymentMethodId", opt)}
                styles={customStyles}
                placeholder="Selecione um método de pagamento"
                isSearchable={false}
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-primary)] mb-1">
                Data de Vencimento
              </label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleTextChange}
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.3)] rounded-lg text-[var(--text-primary)] text-sm transition-all duration-300 focus:outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_2px_rgba(241,145,109,0.3)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-primary)] mb-1">
                Valor Bruto
              </label>
              <input
                type="number"
                name="grossAmount"
                value={formData.grossAmount}
                readOnly
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.3)] rounded-lg text-[var(--text-primary)] text-sm opacity-70 cursor-not-allowed"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-primary)] mb-1">
                Observações
              </label>
              <textarea
                name="observations"
                value={formData.observations}
                onChange={handleTextChange}
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.3)] rounded-lg text-[var(--text-primary)] text-sm transition-all duration-300 focus:outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_2px_rgba(241,145,109,0.3)]"
                placeholder="Sem observações"
              />
            </div>
            <div className="flex items-center">
              {/* CORREÇÃO: Usando a função handleCheckboxChange específica para este input */}
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleCheckboxChange}
                className="mr-2 rounded text-[var(--accent-blue)] focus:ring-[var(--accent-blue)] bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.3)]"
              />
              <label className="text-sm text-[var(--text-primary)]">
                Ativo
              </label>
            </div>
            <button type="submit" className="new-client-button w-full">
              Cadastrar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
