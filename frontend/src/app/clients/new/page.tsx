"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import Navbar from "@/components/Navbar";
import { FaArrowLeft } from "react-icons/fa";
import Select, { StylesConfig } from "react-select";

interface Plan {
  id: number;
  name: string;
}

interface PaymentMethod {
  id: number;
  name: string;
}

// Definir o tipo para as opções do react-select
type SelectOption = { value: string; label: string } | null;

// Estilos customizados para o react-select, replicados do EditClientModal.tsx e Filter.tsx
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
    "&::-webkit-scrollbar": {
      width: "6px",
    },
    "&::-webkit-scrollbar-track": {
      background: "transparent",
    },
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
  singleValue: (provided) => ({
    ...provided,
    color: "var(--text-primary)",
  }),
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
    "&:hover": {
      color: "var(--accent-blue)",
    },
  }),
};

export default function NewClient() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [planId, setPlanId] = useState<number>(0);
  const [paymentMethodId, setPaymentMethodId] = useState<number>(0);
  const [dueDate, setDueDate] = useState("");
  const [grossAmount, setGrossAmount] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    if (planId === 0) {
      setGrossAmount("");
      return;
    }

    const selectedPlan = plans.find((plan) => plan.id === planId);
    if (!selectedPlan) return;

    if (selectedPlan.name === "Comum") {
      setGrossAmount("30.00");
    } else if (
      selectedPlan.name === "Platinum" ||
      selectedPlan.name === "P2P"
    ) {
      setGrossAmount("35.00");
    } else {
      setGrossAmount("");
    }
  }, [planId, plans]);

  useEffect(() => {
    const storedToken =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    setToken(storedToken);

    if (!storedToken) {
      toast.error("Por favor, faça login para acessar esta página.");
      router.push("/");
      return;
    }

    const fetchPlans = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3001/api/clients/plans",
          {
            headers: { Authorization: `Bearer ${storedToken}` },
          }
        );
        setPlans(response.data);
      } catch (error) {
        console.error("Erro ao buscar planos:", error);
        toast.error("Erro ao carregar planos.");
      }
    };

    const fetchPaymentMethods = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3001/api/clients/payment-methods",
          {
            headers: { Authorization: `Bearer ${storedToken}` },
          }
        );
        setPaymentMethods(response.data);
      } catch (error) {
        console.error("Erro ao buscar métodos de pagamento:", error);
        toast.error("Erro ao carregar métodos de pagamento.");
      }
    };

    fetchPlans();
    fetchPaymentMethods();
  }, [router]);

  const handlePlanChange = (selectedOption: SelectOption) => {
    const updatedValue = selectedOption
      ? parseInt(selectedOption.value, 10)
      : 0;
    setPlanId(updatedValue);
    console.log("planId alterado:", updatedValue);
  };

  const handlePaymentMethodChange = (selectedOption: SelectOption) => {
    const updatedValue = selectedOption
      ? parseInt(selectedOption.value, 10)
      : 0;
    setPaymentMethodId(updatedValue);
    console.log("paymentMethodId alterado:", updatedValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !fullName ||
      !email ||
      planId === 0 ||
      paymentMethodId === 0 ||
      !dueDate ||
      !grossAmount
    ) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const grossAmountNum = parseFloat(grossAmount);
    if (isNaN(grossAmountNum)) {
      toast.error("O valor bruto deve ser um número válido.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Por favor, insira um email válido.");
      return;
    }

    const parsedDueDate = new Date(dueDate);
    if (isNaN(parsedDueDate.getTime())) {
      toast.error("Por favor, insira uma data de vencimento válida.");
      return;
    }
    const dueDateISO = parsedDueDate.toISOString();

    const clientData = {
      fullName,
      email,
      phone,
      planId,
      paymentMethodId,
      dueDate: dueDateISO,
      grossAmount: grossAmountNum,
      isActive,
    };

    try {
      const response = await axios.post(
        "http://localhost:3001/api/clients",
        clientData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("Resposta da API:", response.data);
      toast.success("Cliente cadastrado com sucesso!", {
        autoClose: 3000,
        position: "top-right",
      });
      router.push("/clients");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || "Erro desconhecido";
        const errorDetails =
          error.response?.data?.error || "Sem detalhes adicionais";
        toast.error(
          `Erro ao cadastrar cliente: ${message}. Detalhes: ${errorDetails}`,
          {
            autoClose: 5000,
            position: "top-right",
          }
        );
        console.error("Erro completo:", error.response?.data);
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          router.push("/");
        }
      } else {
        toast.error(`Erro ao cadastrar cliente: ${String(error)}`, {
          autoClose: 5000,
          position: "top-right",
        });
      }
    }
  };

  const handleBack = () => {
    router.push("/clients");
  };

  const planOptions = [
    { value: "0", label: "Selecione um plano" },
    ...plans.map((plan) => ({
      value: plan.id.toString(),
      label: plan.name,
    })),
  ];

  const paymentMethodOptions = [
    { value: "0", label: "Selecione um método de pagamento" },
    ...paymentMethods.map((method) => ({
      value: method.id.toString(),
      label: method.name,
    })),
  ];

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
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm text-[var(--text-primary)] mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.3)] rounded-lg text-[var(--text-primary)] text-sm transition-all duration-300 focus:outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_2px_rgba(241,145,109,0.3)]"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm text-[var(--text-primary)] mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.3)] rounded-lg text-[var(--text-primary)] text-sm transition-all duration-300 focus:outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_2px_rgba(241,145,109,0.3)]"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm text-[var(--text-primary)] mb-1">
                Telefone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.3)] rounded-lg text-[var(--text-primary)] text-sm transition-all duration-300 focus:outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_2px_rgba(241,145,109,0.3)]"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm text-[var(--text-primary)] mb-1">
                Plano
              </label>
              <Select
                options={planOptions}
                value={planOptions.find(
                  (option) => option.value === planId.toString()
                )}
                onChange={handlePlanChange}
                styles={customStyles}
                placeholder="Selecione um plano"
                isSearchable={false}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm text-[var(--text-primary)] mb-1">
                Método de Pagamento
              </label>
              <Select
                options={paymentMethodOptions}
                value={paymentMethodOptions.find(
                  (option) => option.value === paymentMethodId.toString()
                )}
                onChange={handlePaymentMethodChange}
                styles={customStyles}
                placeholder="Selecione um método de pagamento"
                isSearchable={false}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm text-[var(--text-primary)] mb-1">
                Data de Vencimento
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.3)] rounded-lg text-[var(--text-primary)] text-sm transition-all duration-300 focus:outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_2px_rgba(241,145,109,0.3)]"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm text-[var(--text-primary)] mb-1">
                Valor Bruto
              </label>
              <input
                type="number"
                value={grossAmount}
                readOnly
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.3)] rounded-lg text-[var(--text-primary)] text-sm opacity-70 cursor-not-allowed"
                required
              />
            </div>
            <div className="mb-4 flex items-center">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
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
