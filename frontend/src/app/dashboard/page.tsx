// frontend/src/app/dashboard/page.tsx

"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/utils/api";
import Filter from "./components/Filter";
import { toast } from "react-toastify";
import { useEffect, useState } from "react";
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
} from "chart.js";
import { AxiosError } from "axios";
import Loading from "@/components/Loading";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Line = dynamic(() => import("react-chartjs-2").then((mod) => mod.Line), {
  loading: () => <Loading>Carregando gráfico...</Loading>,
});

interface DashboardStats {
  gross_amount: number;
  net_amount: number;
  active_clients: number;
  totalNetAmount: number;
  grossByPaymentMethod: Record<string, number>;
  dailyNetProfit: { date: string; netAmount: number }[];
}

interface CurrentMonthStats {
  totalNetAmount8: number;
  totalNetAmount15: number;
  activeClients: number;
}

export default function Dashboard() {
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [useCurrentMonth, setUseCurrentMonth] = useState(true);

  const { data: dashboardData, error: dashboardError } = useQuery<
    DashboardStats,
    unknown
  >({
    queryKey: ["dashboard", filterMonth, filterYear],
    queryFn: async (): Promise<DashboardStats> => {
      try {
        const { data } = await api.get(
          `/api/dashboard?month=${filterMonth}&year=${filterYear}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
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
    unknown
  >({
    queryKey: [
      "current-month",
      useCurrentMonth ? "current" : `${filterMonth}-${filterYear}`,
    ],
    queryFn: async (): Promise<CurrentMonthStats> => {
      try {
        if (useCurrentMonth) {
          const { data } = await api.get("/api/current-month", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
          return data as CurrentMonthStats;
        } else {
          if (dashboardData) {
            return {
              totalNetAmount8: dashboardData.totalNetAmount,
              totalNetAmount15:
                dashboardData.totalNetAmount - dashboardData.active_clients * 7,
              activeClients: dashboardData.active_clients,
            } as CurrentMonthStats;
          }
          const { data } = await api.get(
            `/api/dashboard?month=${filterMonth}&year=${filterYear}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );
          return {
            totalNetAmount8: data.totalNetAmount,
            totalNetAmount15: data.totalNetAmount - data.active_clients * 7,
            activeClients: data.active_clients,
          } as CurrentMonthStats;
        }
      } catch (error) {
        console.error("Erro ao carregar dados do mês atual:", error);
        throw error;
      }
    },
    enabled: useCurrentMonth || !!dashboardData,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const showErrorToast = (error: unknown, context: string) => {
    if (error instanceof AxiosError) {
      toast.error(
        `Erro ao carregar ${context}: ${
          error.response?.data?.message || error.message
        }`
      );
    } else {
      toast.error(`Erro desconhecido ao carregar ${context}`);
    }
  };

  useEffect(() => {
    if (dashboardError) showErrorToast(dashboardError, "dashboard");
    if (currentMonthError)
      showErrorToast(currentMonthError, "dados do mês atual");
  }, [dashboardError, currentMonthError]);

  const defaultStats: DashboardStats = {
    gross_amount: 0,
    net_amount: 0,
    active_clients: 0,
    totalNetAmount: 0,
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

  useEffect(() => {
    console.log("Dados recebidos para o dashboard:", stats);
  }, [stats]);

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

  const chartData = {
    labels: fullMonthData.map((day) => day.toString()),
    datasets: [
      {
        label: "Lucro Líquido",
        data: fullMonthData.map((day) => dailyDataMap.get(day) || 0),
        borderColor: "var(--accent-blue)",
        backgroundColor: (context: {
          chart: { ctx: CanvasRenderingContext2D };
        }) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 200);
          gradient.addColorStop(0, "rgba(241, 145, 109, 0.5)");
          gradient.addColorStop(1, "rgba(241, 145, 109, 0.1)");
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "var(--accent-blue)",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1000, easing: "easeOutCubic" as const },
    plugins: {
      legend: { display: false },
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
        title: {
          display: true,
          text: "Dia do Mês",
          color: "var(--text-primary)",
          font: { size: 10 },
        },
        grid: { display: false },
        ticks: { color: "var(--text-primary)", font: { size: 10 } },
      },
      y: {
        title: {
          display: true,
          text: "Valor Líquido (R$)",
          color: "var(--text-primary)",
          font: { size: 14, weight: "bold" as const },
        },
        grid: { color: "var(--accent-gray)", lineWidth: 1 },
        ticks: {
          color: "var(--text-primary)",
          font: { size: 12 },
          callback: (tickValue: string | number) =>
            `R$ ${parseFloat(tickValue as string).toFixed(2)}`,
        },
        beginAtZero: true,
      },
    },
  };

  const handleFilterChange = (month: number, year: number) => {
    setFilterMonth(month);
    setFilterYear(year);
  };

  const getCurrentMonthTitle = () => {
    if (useCurrentMonth) return "Como está meu mês:";
    const monthName = new Date(filterYear, filterMonth - 1).toLocaleString(
      "pt-BR",
      { month: "long" }
    );
    return `Meu mês em ${monthName}/${filterYear}:`;
  };

  return (
    <div className="dashboard-container">
      <div className="flex flex-col sm:flex-row items-center justify-start mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-left">Dashboard</h1>
        <div className="flex-grow"></div>
        <div
          className="sm:mx-auto"
          style={{ maxWidth: "350px", width: "100%" }}
        >
          <Filter onFilterChange={handleFilterChange} />
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-2/3">
          <h2
            className="text-xl font-semibold mb-4 text-center sm:text-left"
            style={{ color: "var(--card-text-secondary)" }}
          >
            Meu Saldo Bruto
          </h2>
          <div className="card-container grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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
          <div className="card w-full chart-card mb-6">
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
                style={{ color: "var(--card-text)" }}
              >
                {getCurrentMonthTitle()}
              </h2>
              <button
                onClick={() => setUseCurrentMonth(!useCurrentMonth)}
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
                -R$8/ativação: R$ {currentMonthStats.totalNetAmount8.toFixed(2)}
              </div>
              <div
                className="text-2xl font-semibold"
                style={{ color: "var(--card-text)" }}
              >
                -R$15/ativação: R${" "}
                {currentMonthStats.totalNetAmount15.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="card w-full future-chart-card h-32 bg-gray-200 flex items-center justify-center text-gray-500">
            Espaço reservado para futuro gráfico
          </div>
        </div>
      </div>
    </div>
  );
}