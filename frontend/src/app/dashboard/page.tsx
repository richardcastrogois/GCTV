"use client";

import { useQuery } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import Navbar from "@/components/Navbar";
import Filter from "./components/Filter";
import { toast } from "react-toastify";
import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem,
  ChartOptions,
  Filler,
} from "chart.js";

// Registrar os componentes do Chart.js
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
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1); // Mês atual
  const [filterYear, setFilterYear] = useState(new Date().getFullYear()); // Ano atual
  const [useCurrentMonth, setUseCurrentMonth] = useState(true); // Estado do toggle

  // Query para os dados filtrados (cartões e gráfico da direita)
  const { data: dashboardData, error: dashboardError } = useQuery({
    queryKey: ["dashboard", filterMonth, filterYear],
    queryFn: async (): Promise<DashboardStats> => {
      const { data } = await axios.get(
        `http://localhost:3001/api/dashboard?month=${filterMonth}&year=${filterYear}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      console.log("Resposta da API /api/dashboard:", data);
      return data as DashboardStats;
    },
  });

  // Query para o total do mês atual ou com base no filtro geral
  const { data: currentMonthData, error: currentMonthError } = useQuery({
    queryKey: ["current-month", useCurrentMonth, filterMonth, filterYear],
    queryFn: async (): Promise<CurrentMonthStats> => {
      if (useCurrentMonth) {
        // Puxar dados do mês atual
        const { data } = await axios.get(
          "http://localhost:3001/api/current-month",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        console.log("Resposta da API /api/current-month:", data);
        return data as CurrentMonthStats;
      } else {
        // Puxar dados com base no filtro geral (usando o mesmo endpoint do dashboard)
        const { data } = await axios.get(
          `http://localhost:3001/api/dashboard?month=${filterMonth}&year=${filterYear}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        console.log(
          "Resposta da API /api/dashboard (para current-month):",
          data
        );
        return {
          totalNetAmount8: data.totalNetAmount,
          totalNetAmount15: data.totalNetAmount - data.active_clients * 7, // Ajuste para R$ 15,00 (diferença de 7 entre 8 e 15)
          activeClients: data.active_clients,
        } as CurrentMonthStats;
      }
    },
  });

  // Função auxiliar para exibir erros
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
    if (dashboardError) {
      showErrorToast(dashboardError, "dashboard");
    }
    if (currentMonthError) {
      showErrorToast(currentMonthError, "dados do mês atual");
    }
  }, [dashboardError, currentMonthError]);

  const defaultStats: DashboardStats = {
    gross_amount: 0,
    net_amount: 0,
    active_clients: 0,
    totalNetAmount: 0,
    grossByPaymentMethod: {
      Nubank: 70,
      PagSeguro: 65,
      Caixa: 35,
      PicPay: 50,
      banco_do_brasil: 80, // Padronizado para snake_case
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
      case "banco_do_brasil": // Padronizado para snake_case
        return "card-banco-do-brasil";
      default:
        return "card-default";
    }
  };

  const chartData = {
    labels: stats.dailyNetProfit.map((entry) => {
      const date = new Date(entry.date);
      return date.getDate().toString().padStart(2, "0");
    }),
    datasets: [
      {
        label: "Lucro Líquido",
        data: stats.dailyNetProfit.map((entry) => entry.netAmount),
        borderColor: "var(--accent-blue)", // Usando o novo tom laranja
        backgroundColor: (context: {
          chart: { ctx: CanvasRenderingContext2D };
        }) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 200);
          gradient.addColorStop(0, "rgba(241, 145, 109, 0.5)"); // #F1916D com opacidade
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

  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: "easeOutCubic",
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(3, 18, 47, 0.8)", // Fundo escuro baseado em #03122F
        titleFont: { size: 14, weight: "bold" },
        bodyFont: { size: 12 },
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
          font: { size: 14, weight: "bold" },
        },
        grid: { display: false },
        ticks: {
          color: "var(--text-primary)",
          font: { size: 12 },
        },
      },
      y: {
        title: {
          display: true,
          text: "Valor Líquido (R$)",
          color: "var(--text-primary)",
          font: { size: 14, weight: "bold" },
        },
        grid: {
          color: "var(--accent-gray)",
          lineWidth: 1,
        },
        ticks: {
          color: "var(--text-primary)",
          font: { size: 12 },
          callback: (tickValue: string | number): string => {
            const value =
              typeof tickValue === "string" ? parseFloat(tickValue) : tickValue;
            return `R$ ${value.toFixed(2)}`;
          },
        },
      },
    },
  };

  const handleFilterChange = (month: number, year: number) => {
    setFilterMonth(month);
    setFilterYear(year);
  };

  const getCurrentMonthTitle = () => {
    if (useCurrentMonth) {
      return "Como está meu mês:";
    } else {
      const monthName = new Date(filterYear, filterMonth - 1).toLocaleString(
        "pt-BR",
        { month: "long" }
      );
      return `Meu mês em ${monthName}/${filterYear}:`;
    }
  };

  return (
    <div style={{ background: "var(--background-primary)" }}>
      <Navbar />
      <div className="dashboard-container">
        <h1
          className="text-3xl mb-4 font-bold text-center sm:text-left"
          style={{ color: "var(--text-secondary)" }}
        >
          Dashboard
        </h1>

        {/* Filtro Geral no Topo */}
        <Filter onFilterChange={handleFilterChange} />

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Lado Esquerdo: Cartões de Pagamento */}
          <div className="w-full lg:w-2/3 min-w-0">
            <h2
              className="text-xl font-semibold mb-4 text-center sm:text-left"
              style={{ color: "var(--card-text-secondary)" }}
            >
              Meu Saldo
            </h2>
            <div className="card-container grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 justify-items-center">
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
          </div>

          {/* Lado Direito: Gráfico e Card "Crédito" */}
          <div className="w-full lg:w-1/3 min-w-0 flex flex-col gap-4">
            {/* Gráfico de Lucro Líquido Diário */}
            <div className="card w-full chart-card">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
                <h2
                  className="text-xl font-semibold text-center sm:text-left"
                  style={{ color: "var(--card-text-secondary)" }}
                >
                  Lucro Líquido Diário
                </h2>
              </div>
              <div className="h-48">
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>

            {/* Card Unificado "Crédito" */}
            <div className="card w-full current-month-card">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
                <h2
                  className="text-xl font-semibold text-center sm:text-left"
                  style={{ color: "var(--card-text)" }} // Usando cor mais clara para o título
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
                  style={{ color: "var(--card-text)" }} // Cor mais clara para maior contraste
                >
                  -R$8/ativação: R${" "}
                  {currentMonthStats.totalNetAmount8.toFixed(2)}
                </div>
                <div
                  className="text-2xl font-semibold"
                  style={{ color: "var(--card-text)" }} // Cor mais clara para maior contraste
                >
                  -R$15/ativação: R${" "}
                  {currentMonthStats.totalNetAmount15.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
