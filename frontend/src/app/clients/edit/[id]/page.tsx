// frontend/src/app/clients/edit/[id]/page.tsx

"use client";

import { useState, useEffect } from "react"; // CORREÇÃO: Removido 'useCallback' não utilizado
import { useRouter, useParams, useSearchParams } from "next/navigation";
import api from "@/utils/api";
import Navbar from "@/components/Navbar";
import { Client, Plan, PaymentMethod } from "@/types/client";
import Link from "next/link";
import { toast } from "react-toastify";
import { useAuth } from "@/hooks/useAuth";
import { AxiosError } from "axios";

interface FormData {
  fullName: string;
  email: string;
  username: string;
  planId: number;
  paymentMethodId: number;
  dueDate: string;
  grossAmount: string;
  observations: string;
  isActive: boolean;
}

export default function EditClient() {
  const [formData, setFormData] = useState<FormData | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  const { id } = useParams();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/clients";
  const { handleUnauthorized } = useAuth();

  useEffect(() => {
    const fetchClientAndOptions = async () => {
      setIsLoading(true);
      const clientId = Array.isArray(id) ? id[0] : id;

      try {
        const [clientResponse, plansResponse, paymentMethodsResponse] =
          await Promise.all([
            api.get(`/api/clients/${clientId}`),
            api.get("/api/clients/plans"),
            api.get("/api/clients/payment-methods"),
          ]);

        const clientData: Client = clientResponse.data;

        // CORREÇÃO: Acessando as propriedades aninhadas 'plan.id' e 'paymentMethod.id'
        setFormData({
          fullName: clientData.fullName,
          email: clientData.email,
          username: clientData.user?.username || "",
          planId: clientData.plan.id,
          paymentMethodId: clientData.paymentMethod.id,
          dueDate: clientData.dueDate.split("T")[0],
          grossAmount: clientData.grossAmount.toString(),
          observations: clientData.observations || "",
          isActive: clientData.isActive,
        });
        setPlans(plansResponse.data);
        setPaymentMethods(paymentMethodsResponse.data);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        if (error instanceof AxiosError && error.response?.status === 401) {
          handleUnauthorized();
        } else {
          toast.error("Erro ao carregar dados do cliente.");
          router.push(returnTo);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchClientAndOptions();
    }
  }, [id, router, returnTo, handleUnauthorized]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;

    let processedValue: string | number | boolean = value;
    if (type === "number") {
      processedValue = parseFloat(value);
    } else if (name === "planId" || name === "paymentMethodId") {
      processedValue = parseInt(value, 10);
    }

    setFormData((prev) => (prev ? { ...prev, [name]: processedValue } : null));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    // ... validações ...
    const grossAmountNum = parseFloat(formData.grossAmount);
    if (isNaN(grossAmountNum) || grossAmountNum <= 0) {
      toast.error("O valor bruto deve ser um número válido e maior que zero.");
      return;
    }

    try {
      await api.put(`/api/clients/${id}`, {
        ...formData,
        dueDate: new Date(formData.dueDate).toISOString(),
        grossAmount: grossAmountNum,
      });
      toast.success("Cliente atualizado com sucesso!");
      router.push(returnTo);
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      if (error instanceof AxiosError && error.response?.status === 401) {
        handleUnauthorized();
      } else {
        // CORREÇÃO: Utilizando a variável 'error' para dar um feedback mais detalhado.
        const errorMessage =
          error instanceof AxiosError
            ? error.response?.data?.message || error.message
            : String(error);
        toast.error(`Erro ao atualizar cliente: ${errorMessage}`);
      }
    }
  };

  if (isLoading || !formData) return <div>Carregando...</div>;

  return (
    <div>
      <Navbar />
      <div className="p-6">
        <div className="mb-4">
          <Link href={returnTo}>
            <button className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600">
              Voltar
            </button>
          </Link>
        </div>
        <h1 className="text-3xl mb-4">Editar Cliente</h1>
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded shadow-md max-w-lg"
        >
          <div className="mb-4">
            <label className="block mb-1">Nome Completo</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              className="p-2 border w-full rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Usuário (Username)</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="p-2 border w-full rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="p-2 border w-full rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Plano</label>
            <select
              name="planId"
              value={formData.planId}
              onChange={handleInputChange}
              className="p-2 border w-full rounded"
              required
            >
              <option value={0}>Selecione um plano</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block mb-1">Método de Pagamento</label>
            <select
              name="paymentMethodId"
              value={formData.paymentMethodId}
              onChange={handleInputChange}
              className="p-2 border w-full rounded"
              required
            >
              <option value={0}>Selecione um método</option>
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block mb-1">Data de Vencimento</label>
            <input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleInputChange}
              className="p-2 border w-full rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Valor Bruto</label>
            <input
              type="number"
              step="0.01"
              name="grossAmount"
              value={formData.grossAmount}
              onChange={handleInputChange}
              className="p-2 border w-full rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Observações</label>
            <textarea
              name="observations"
              value={formData.observations}
              onChange={handleInputChange}
              className="p-2 border w-full rounded"
              placeholder="Sem observações"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-500 text-white p-2 w-full rounded hover:bg-blue-600"
          >
            Atualizar
          </button>
        </form>
      </div>
    </div>
  );
}
