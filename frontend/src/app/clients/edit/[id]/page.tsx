//front/src/app/clients/edit/[id]/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import api from "@/utils/api";
import Navbar from "@/components/Navbar";
import { Client } from "@/types/client";
import Link from "next/link";
import { toast } from "react-toastify";
import { useAuth } from "@/hooks/useAuth";
import { AxiosError } from "axios";

export default function EditClient() {
  const [client, setClient] = useState<Client | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [planId, setPlanId] = useState<number>(0);
  const [paymentMethodId, setPaymentMethodId] = useState<number>(0);
  const [dueDate, setDueDate] = useState("");
  const [grossAmount, setGrossAmount] = useState("");
  const [observations, setObservations] = useState("");
  const [plans, setPlans] = useState<{ id: number; name: string }[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<
    { id: number; name: string }[]
  >([]);
  const router = useRouter();
  const { id } = useParams();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/clients";
  const { handleUnauthorized } = useAuth();

  useEffect(() => {
    const fetchClientAndOptions = async () => {
      const parsedId = typeof id === "string" ? parseInt(id) : NaN;
      if (isNaN(parsedId)) {
        console.error("ID inválido detectado:", id);
        toast.error("ID do cliente inválido.");
        router.push(returnTo);
        return;
      }

      const storedToken =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!storedToken) {
        handleUnauthorized();
        return;
      }

      try {
        console.log("ID do cliente:", parsedId);
        const { data: clientData } = await api.get(`/api/clients/${parsedId}`);
        setClient(clientData);
        setFullName(clientData.fullName);
        setEmail(clientData.email);
        setUsername(clientData.user?.username || "");
        setPlanId(clientData.plan.id);
        setPaymentMethodId(clientData.paymentMethod.id);
        setDueDate(clientData.dueDate.split("T")[0]);
        setGrossAmount(clientData.grossAmount.toString());
        setObservations(clientData.observations || "");

        const [plansResponse, paymentMethodsResponse] = await Promise.all([
          api.get("/api/clients/plans"),
          api.get("/api/clients/payment-methods"),
        ]);
        setPlans(plansResponse.data);
        setPaymentMethods(paymentMethodsResponse.data);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        if (error instanceof AxiosError && error.response?.status === 401) {
          handleUnauthorized();
        } else {
          toast.error(
            `Erro ao carregar dados: ${
              error instanceof AxiosError
                ? error.response?.data?.message || error.message
                : String(error)
            }`
          );
          router.push(returnTo);
        }
      }
    };

    fetchClientAndOptions();
  }, [id, router, returnTo, handleUnauthorized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const storedToken =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!storedToken) {
      handleUnauthorized();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Por favor, insira um email válido.");
      return;
    }

    const grossAmountNum = parseFloat(grossAmount);
    if (isNaN(grossAmountNum) || grossAmountNum <= 0) {
      toast.error("O valor bruto deve ser um número válido e maior que zero.");
      return;
    }

    if (planId === 0) {
      toast.error("Por favor, selecione um plano.");
      return;
    }

    if (paymentMethodId === 0) {
      toast.error("Por favor, selecione um método de pagamento.");
      return;
    }

    const parsedDueDate = new Date(dueDate);
    if (isNaN(parsedDueDate.getTime())) {
      toast.error("Por favor, insira uma data de vencimento válida.");
      return;
    }

    try {
      await api.put(`/api/clients/${id}`, {
        fullName,
        email,
        username,
        planId,
        paymentMethodId,
        dueDate: parsedDueDate.toISOString(),
        grossAmount: grossAmountNum,
        isActive: client?.isActive,
        observations,
      });
      toast.success("Cliente atualizado com sucesso!");
      router.push(returnTo);
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      if (error instanceof AxiosError && error.response?.status === 401) {
        handleUnauthorized();
      } else {
        toast.error(
          `Erro ao atualizar cliente: ${
            error instanceof AxiosError
              ? error.response?.data?.message || error.message
              : String(error)
          }`
        );
      }
    }
  };

  if (!client) return <div>Carregando...</div>;

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
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="p-2 border w-full rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Usuário (Username)</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="p-2 border w-full rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="p-2 border w-full rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Plano</label>
            <select
              value={planId}
              onChange={(e) => setPlanId(parseInt(e.target.value))}
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
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(parseInt(e.target.value))}
              className="p-2 border w-full rounded"
              required
            >
              <option value={0}>Selecione um métodoологи de pagamento</option>
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
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="p-2 border w-full rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Valor Bruto</label>
            <input
              type="number"
              step="0.01"
              value={grossAmount}
              onChange={(e) => setGrossAmount(e.target.value)}
              className="p-2 border w-full rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Observações</label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
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