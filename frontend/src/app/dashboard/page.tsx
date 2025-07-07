// frontend/src/app/dashboard/page.tsx

"use client";

import {
  useQuery,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import api from "@/utils/api";
import Filter from "./components/Filter";
import { toast } from "react-toastify";
import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TooltipItem,
  BarElement,
} from "chart.js";
import { AxiosError } from "axios";
import LoadingSimple from "@/components/LoadingSimple";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  BarElement
);

const Line = dynamic(() => import("react-chartjs-2").then((mod) => mod.Line), {
  loading: () => <LoadingSimple>Carregando gráfico...</LoadingSimple>,
});

interface DashboardStats {
  gross_amount: number;
  net_amount: number;
  active_clients: number;
  totalNetAmount8: number;
  totalNetAmount15: number;
  grossByPaymentMethod: Record<string, number>;
  dailyNetProfit: { date: string; netAmount: number }[];
}

interface CurrentMonthStats {
  totalNetAmount8: number;
  totalNetAmount15: number;
  activeClients: number;
}

interface Client {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  plan: { id: number; name: string };
  paymentMethod: { id: number; name: string };
  dueDate: string;
  grossAmount: number;
  netAmount: number;
  isActive: boolean;
  observations?: string;
  user: { id: number; username: string };
}

const queryClient = new QueryClient();

export default function Dashboard() {
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [useCurrentMonth, setUseCurrentMonth] = useState(true);

  const { data: dashboardData, error: dashboardError } = useQuery<
    DashboardStats,
    Error
  >({
    queryKey: ["dashboard", filterMonth, filterYear],
    queryFn: async (): Promise<DashboardStats> => {
      const controller = new AbortController();
      try {
        const { data } = await api.get(
          `/api/dashboard?month=${filterMonth}&year=${filterYear}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            signal: controller.signal,
          }
        );
        return data as DashboardStats;
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
        throw error;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: currentMonthData, error: currentMonthError } = useQuery<
    CurrentMonthStats,
    Error
  >({
    queryKey: [
      "current-month",
      useCurrentMonth ? "current" : `${filterMonth}-${filterYear}`,
    ],
    queryFn: async (): Promise<CurrentMonthStats> => {
      const controller = new AbortController();
      try {
        if (useCurrentMonth) {
          const { data } = await api.get("/api/current-month", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            signal: controller.signal,
          });
          return data as CurrentMonthStats;
        } else {
          const { data } = await api.get(
            `/api/dashboard?month=${filterMonth}&year=${filterYear}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              signal: controller.signal,
            }
          );
          return {
            totalNetAmount8: data.totalNetAmount8 || 0,
            totalNetAmount15: data.totalNetAmount15 || 0,
            activeClients: data.active_clients || 0,
          } as CurrentMonthStats;
        }
      } catch (error) {
        console.error("Erro ao carregar dados do mês atual:", error);
        throw error;
      }
    },
    enabled: true,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: clientsData, error: clientsError } = useQuery<
    { data: Client[]; total: number },
    Error
  >({
    queryKey: ["clients"],
    queryFn: async (): Promise<{ data: Client[]; total: number }> => {
      const controller = new AbortController();
      try {
        const { data } = await api.get("/api/clients", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          params: {
            page: 1,
            limit: 1000,
          },
          signal: controller.signal,
        });
        return data as { data: Client[]; total: number };
      } catch (error) {
        console.error("Erro ao carregar clientes:", error);
        throw error;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const showErrorToast = (error: unknown, context: string) => {
    if (error instanceof AxiosError) {
      const axiosError = error as AxiosError;
      const responseData = axiosError.response?.data;
      const message =
        responseData &&
        typeof responseData === "object" &&
        "message" in responseData &&
        typeof (responseData as { message?: unknown }).message === "string"
          ? (responseData as { message: string }).message
          : typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof (error as { message: unknown }).message === "string"
          ? (error as { message: string }).message
          : "Erro desconhecido";
      toast.error(`Erro ao carregar ${context}: ${message}`);
    } else if (error instanceof Error) {
      toast.error(`Erro ao carregar ${context}: ${error.message}`);
    } else {
      toast.error(`Erro desconhecido ao carregar ${context}`);
    }
  };

  useEffect(() => {
    if (dashboardError) showErrorToast(dashboardError, "dashboard");
    if (currentMonthError)
      showErrorToast(currentMonthError, "dados do mês atual");
    if (clientsError) showErrorToast(clientsError, "clientes");
  }, [dashboardError, currentMonthError, clientsError]);

  const defaultStats: DashboardStats = {
    gross_amount: 0,
    net_amount: 0,
    active_clients: 0,
    totalNetAmount8: 0,
    totalNetAmount15: 0,
    grossByPaymentMethod: {
      Nubank: 0,
      PagSeguro: 0,
      Caixa: 0,
      PicPay: 0,
      banco_do_brasil: 0,
    },
    dailyNetProfit: [],
  };

  const defaultCurrentMonthStats: CurrentMonthStats = {
    totalNetAmount8: 0,
    totalNetAmount15: 0,
    activeClients: 0,
  };

  const stats: DashboardStats = dashboardData ?? defaultStats;
  const currentMonthStats: CurrentMonthStats =
    currentMonthData ?? defaultCurrentMonthStats;

  const clients = useMemo(() => clientsData?.data ?? [], [clientsData]);

  const activeClientsCount = clients.filter((c) => c.isActive).length;
  const clientsByPlan = clients.reduce((acc, client) => {
    if (client.isActive) {
      acc[client.plan.name] = (acc[client.plan.name] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  const clientsByPaymentMethod = clients.reduce((acc, client) => {
    if (client.isActive) {
      acc[client.paymentMethod.name] =
        (acc[client.paymentMethod.name] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const getCardClass = (method: string): string => {
    switch (method.toLowerCase()) {
      case "nubank":
        return "card-nubank";
      case "pagseguro":
        return "card-pagseguro";
      case "caixa":
        return "card-caixa";
      case "picpay":
        return "card-picpay";
      case "banco_do_brasil":
        return "card-banco-do-brasil";
      default:
        return "card-default";
    }
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(filterMonth, filterYear);
  const fullMonthData = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const dailyDataMap = new Map(
    stats.dailyNetProfit.map((entry) => [
      new Date(entry.date).getUTCDate(),
      entry.netAmount || 0,
    ])
  );

  const neonColor = "#00f5d4";
  const neonColorTransparent = "rgba(0, 245, 212, 0.5)";
  const neonColorFaded = "rgba(0, 245, 212, 0)";

  const chartData = {
    labels: fullMonthData.map((day) => day.toString()),
    datasets: [
      {
        label: "Lucro Líquido",
        data: fullMonthData.map((day) => dailyDataMap.get(day) || 0),
        fill: true,
        borderColor: neonColor,
        borderWidth: 4,
        tension: 0.4,
        backgroundColor: (context: {
          chart: { ctx: CanvasRenderingContext2D };
        }) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 200);
          gradient.addColorStop(0, neonColorTransparent);
          gradient.addColorStop(1, neonColorFaded);
          return gradient;
        },

        // --- AJUSTE DOS PONTOS PARA MELHOR USABILIDADE ---
        pointRadius: 3, // Raio do ponto em estado normal (visível, mas pequeno)
        pointBorderColor: neonColor, // Cor da borda do ponto
        pointBorderWidth: 2, // Espessura da borda para criar o efeito "vazado"
        pointBackgroundColor: "#1e293b", // Cor do fundo do card para o preenchimento do ponto
        pointHoverRadius: 7, // Raio do ponto ao passar o mouse
        pointHoverBackgroundColor: neonColor, // Cor de preenchimento no hover
        pointHoverBorderColor: "#fff", // Cor da borda no hover
        // --- FIM DO AJUSTE DOS PONTOS ---
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1000, easing: "easeOutCubic" as const },
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(3, 18, 47, 0.8)",
        titleFont: { size: 14, weight: "bold" as const },
        bodyFont: { size: 12, weight: "normal" as const },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context: TooltipItem<"line">) =>
            `R$ ${context.parsed.y.toFixed(2)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          display: true,
          color: "rgba(255, 255, 255, 0.5)",
          font: { size: 10 },
          maxRotation: 0,
          minRotation: 0,
        },
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
      },
      y: {
        ticks: {
          display: true,
          color: "rgba(255, 255, 255, 0.7)",
          font: { size: 10 },
          padding: 10,
          callback: (value: string | number) =>
            `R$ ${Number(value).toFixed(0)}`,
        },
        grid: {
          display: true,
          color: "rgba(255, 255, 255, 0.1)",
          borderDash: [5, 5],
          drawBorder: false,
        },
        border: {
          display: false,
        },
      },
    },
  };

  const handleFilterChange = (month: number, year: number) => {
    setFilterMonth(month);
    setFilterYear(year);
    if (!useCurrentMonth) {
      queryClient.refetchQueries({
        queryKey: ["current-month", `${month}-${year}`],
      });
    }
  };

  const getCurrentMonthTitle = () => {
    if (useCurrentMonth) return "Como está meu mês (livre):";
    const monthName = new Date(filterYear, filterMonth - 1).toLocaleString(
      "pt-BR",
      { month: "long" }
    );
    return `Meu mês (livre) em ${monthName}/${filterYear}:`;
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="dashboard-container">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-2/3 flex flex-col gap-6">
            <div className="w-full flex justify-between items-center">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-left flex-shrink-0">
                  Dashboard
                </h1>
              </div>
              <div style={{ maxWidth: "350px", width: "100%" }}>
                <Filter onFilterChange={handleFilterChange} />
              </div>
            </div>

            <h2
              className="text-xl font-semibold text-center sm:text-left"
              style={{ color: "var(--card-text-secondary)" }}
            >
              Meu Saldo Bruto
            </h2>
            <div className="card-container grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(stats.grossByPaymentMethod).map(
                ([method, amount]) => (
                  <div
                    key={`${method}-${filterMonth}-${filterYear}`}
                    className={`card bank-card ${getCardClass(
                      method
                    )} p-4 flex flex-col justify-between`}
                  >
                    <div className="flex justify-between items-start">
                      <img
                        src="/icons/contactless.png"
                        alt="Contactless"
                        className="w-6 h-6"
                      />
                    </div>
                    <div className="text-2xl font-bold card-amount">
                      R$ {amount.toFixed(2)}
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="text-lg font-semibold card-method">
                        {method}
                      </div>
                      <div className="flex gap-1">
                        <span className="w-6 h-6 bg-orange-500 rounded-full"></span>
                        <span className="w-6 h-6 bg-red-500 rounded-full"></span>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
            <div className="card w-full chart-card">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
                <h2
                  className="text-xl font-semibold text-center sm:text-left"
                  style={{ color: "var(--card-text-secondary)" }}
                >
                  Lucro Líquido Diário
                </h2>
              </div>
              <div className="h-40">
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>
          </div>

          <div className="w-full lg:w-1/3 flex flex-col gap-4">
            <div className="card w-full current-month-card">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
                <h2
                  className="text-xl font-semibold text-center sm:text-left"
                  style={{ color: "var(--text-primary-secondary)" }}
                >
                  {getCurrentMonthTitle()}
                </h2>
                <button
                  onClick={() => {
                    setUseCurrentMonth(!useCurrentMonth);
                    queryClient.refetchQueries({
                      queryKey: [
                        "current-month",
                        !useCurrentMonth
                          ? "current"
                          : `${filterMonth}-${filterYear}`,
                      ],
                    });
                  }}
                  className={`toggle-button ${
                    useCurrentMonth ? "active" : "inactive"
                  }`}
                >
                  {useCurrentMonth ? "Usar Mês Atual" : "Usar Filtro Geral"}
                </button>
              </div>
              <div className="flex flex-col gap-2 text-center sm:text-left">
                <div
                  className="text-2xl font-semibold"
                  style={{ color: "var(--card-text)" }}
                >
                  -R$8/ativação: R${" "}
                  {currentMonthStats.totalNetAmount8 !== undefined
                    ? currentMonthStats.totalNetAmount8.toFixed(2)
                    : "0.00"}
                </div>
                <div
                  className="text-2xl font-semibold"
                  style={{ color: "var(--card-text)" }}
                >
                  -R$15/ativação: R${" "}
                  {currentMonthStats.totalNetAmount15 !== undefined
                    ? currentMonthStats.totalNetAmount15.toFixed(2)
                    : "0.00"}
                </div>
              </div>
            </div>
            <div
              className="card w-full future-chart-card"
              style={{ minHeight: "300px", overflowY: "auto" }}
            >
              <h2
                className="text-3xl font-bold m-4 text-center sm:text-left"
                style={{ color: "var(--text-secondary)" }}
              >
                Análise dos Clientes (Meu Mês)
              </h2>
              <div className="flex flex-col gap-3">
                <p className="mb-3">
                  <strong
                    className="text-2xl font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Clientes Ativos:
                  </strong>{" "}
                  <span
                    className="text-2xl font-bold"
                    style={{ color: "var(--accent-blue)" }}
                  >
                    {activeClientsCount}
                  </span>
                </p>
                <p className="m-3">
                  <strong
                    className="text-2xl font-bold"
                    style={{ color: "var(--text-primary-secondary)" }}
                  >
                    Por Plano:
                  </strong>
                </p>
                {Object.entries(clientsByPlan).map(([plan, count]) => (
                  <p
                    key={plan}
                    style={{
                      color:
                        plan.toLowerCase() === "p2p"
                          ? "#F1916D"
                          : plan.toLowerCase() === "platinum"
                          ? "#a64dff"
                          : plan.toLowerCase() === "comum"
                          ? "#4d8cff"
                          : "#F3DADF",
                      fontWeight: "bold",
                      fontSize: "1.25rem",
                    }}
                  >
                    - {plan}: {count}
                  </p>
                ))}
                <p className="m-3">
                  <strong
                    className="text-xl font-bold"
                    style={{ color: "var(--text-primary-secondary)" }}
                  >
                    Por Método de Pagamento:
                  </strong>
                </p>
                {Object.entries(clientsByPaymentMethod).map(
                  ([method, count]) => (
                    <p
                      key={method}
                      style={{
                        color:
                          method.toLowerCase() === "nubank"
                            ? "#a64dff"
                            : method.toLowerCase() === "banco do brasil"
                            ? "#ffd700"
                            : method.toLowerCase() === "caixa"
                            ? "#4d8cff"
                            : method.toLowerCase() === "picpay"
                            ? "#00da77"
                            : method.toLowerCase() === "pagseguro"
                            ? "#ffa000"
                            : "#F3DADF",
                        fontWeight: "bold",
                        fontSize: "1.25rem",
                      }}
                    >
                      - {method}: {count}
                    </p>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}
