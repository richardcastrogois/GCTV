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
import {
  useEffect,
  useState,
  useMemo,
  useCallback,
  memo,
  ReactNode,
} from "react";
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

// O dynamic import do gráfico agora pode usar um skeleton como placeholder
const Line = dynamic(() => import("react-chartjs-2").then((mod) => mod.Line), {
  loading: () => (
    <div className="h-full w-full bg-gray-700/50 animate-pulse rounded-lg" />
  ),
  ssr: false,
});

// --- Interfaces (sem alteração) ---
interface FilteredMonthStats {
  grossByPaymentMethod: Record<string, number>;
  dailyNetProfit: { date: string; netAmount: number }[];
}
interface LiveStats {
  totalNetAmount8: number;
  totalNetAmount15: number;
  activeClients: number;
  clientsByPlan: Record<string, number>;
  clientsByPaymentMethod: Record<string, number>;
}
interface DashboardData {
  filteredData: FilteredMonthStats;
  liveData: LiveStats;
}
interface ApiErrorData {
  message?: string;
}

// --- QueryClient e Fetch (sem alteração) ---
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const fetchDashboardData = async (
  month: number,
  year: number
): Promise<DashboardData> => {
  const { data } = await api.get(
    `/api/dashboard/all?month=${month}&year=${year}`,
    {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }
  );
  return data;
};

// --- INÍCIO: NOVOS COMPONENTES SKELETON ---

const GrossBalanceCardsSkeleton = () => (
  <>
    <h2 className="text-xl font-semibold h-7 w-48 bg-gray-700/50 rounded animate-pulse" />
    <div className="card-container grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="card h-36 bg-gray-800/80 p-4 flex flex-col justify-between rounded-lg animate-pulse"
        >
          <div className="flex justify-between items-start">
            <div className="w-6 h-6 rounded bg-gray-700/50" />
          </div>
          <div className="w-3/4 h-8 bg-gray-700/50 rounded" />
          <div className="flex justify-between items-end">
            <div className="w-1/2 h-6 bg-gray-700/50 rounded" />
            <div className="flex gap-1">
              <span className="w-6 h-6 rounded-full bg-gray-700/50"></span>
              <span className="w-6 h-6 rounded-full bg-gray-700/50"></span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </>
);

const DailyProfitChartSkeleton = () => (
  <div className="card w-full chart-card h-[224px] bg-gray-800/80 p-4 rounded-lg animate-pulse">
    <div className="w-1/2 h-7 bg-gray-700/50 rounded mb-4" />
    <div className="h-40 w-full bg-gray-700/50 rounded-lg" />
  </div>
);

// CORREÇÃO: O esqueleto da coluna direita não precisa mais das classes de layout,
// pois a div pai cuidará disso.
const ClientAnalysisCardSkeleton = () => (
  <div className="flex flex-col gap-4 animate-pulse w-full">
    <div className="card w-full h-40 bg-gray-800/80 p-4 rounded-lg">
      <div className="w-3/4 h-7 bg-gray-700/50 rounded mb-4" />
      <div className="w-1/2 h-8 bg-gray-700/50 rounded mb-2" />
      <div className="w-1/2 h-8 bg-gray-700/50 rounded" />
    </div>
    <div className="card w-full min-h-[300px] bg-gray-800/80 p-4 rounded-lg">
      <div className="w-full h-9 bg-gray-700/50 rounded mb-4" />
      <div className="w-1/2 h-8 bg-gray-700/50 rounded mb-4" />
      <div className="w-1/3 h-6 bg-gray-700/50 rounded mb-2" />
      <div className="w-1/3 h-6 bg-gray-700/50 rounded mb-4" />
      <div className="w-3/4 h-7 bg-gray-700/50 rounded mb-4" />
      <div className="w-1/3 h-6 bg-gray-700/50 rounded" />
    </div>
  </div>
);

// --- FIM: NOVOS COMPONENTES SKELETON ---

// --- COMPONENTE PRINCIPAL DO DASHBOARD (COM LAYOUT CORRIGIDO) ---

function Dashboard() {
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const { data, error, isLoading } = useQuery<
    DashboardData,
    AxiosError<ApiErrorData>
  >({
    queryKey: ["dashboardData", filterMonth, filterYear],
    queryFn: () => fetchDashboardData(filterMonth, filterYear),
  });

  useEffect(() => {
    if (error) {
      const message =
        error.response?.data?.message || error.message || "Erro desconhecido";
      toast.error(`Erro ao carregar dados do dashboard: ${message}`);
    }
  }, [error]);

  const handleFilterChange = useCallback((month: number, year: number) => {
    setFilterMonth(month);
    setFilterYear(year);
  }, []);

  // CORREÇÃO ESTRUTURAL: A lógica de isLoading foi movida para DENTRO das divs de coluna.
  // Isso preserva seu layout de duas colunas em todos os momentos.
  if (isLoading) {
    return (
      <div className="dashboard-container">
        <header className="w-full flex justify-between items-center flex-wrap gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <div style={{ maxWidth: "380px", width: "100%" }}>
            <Filter onFilterChange={handleFilterChange} />
          </div>
        </header>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Coluna Esquerda com Skeletons */}
          <div className="w-full lg:w-2/3 flex flex-col gap-6">
            <GrossBalanceCardsSkeleton />
            <DailyProfitChartSkeleton />
          </div>
          {/* Coluna Direita com Skeleton */}
          <div className="w-full lg:w-1/3 flex flex-col gap-4">
            <ClientAnalysisCardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data || !data.filteredData || !data.liveData) {
    return (
      <div className="text-center p-8">
        Não foi possível carregar os dados do dashboard.
      </div>
    );
  }

  // Renderização normal quando os dados estão prontos
  return (
    <div className="dashboard-container">
      <header className="w-full flex justify-between items-center flex-wrap gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <div style={{ maxWidth: "380px", width: "100%" }}>
          <Filter onFilterChange={handleFilterChange} />
        </div>
      </header>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-2/3 flex flex-col gap-6">
          <GrossBalanceCards
            grossByPaymentMethod={data.filteredData.grossByPaymentMethod}
          />
          <DailyProfitChart
            dailyNetProfit={data.filteredData.dailyNetProfit}
            filterMonth={filterMonth}
            filterYear={filterYear}
          />
        </div>
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <ClientAnalysisCard liveStats={data.liveData} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}

// --- INÍCIO: SEUS COMPONENTES ORIGINAIS (SEM ALTERAÇÃO NO CÓDIGO INTERNO) ---

const GrossBalanceCards = memo(
  ({
    grossByPaymentMethod,
  }: {
    grossByPaymentMethod: FilteredMonthStats["grossByPaymentMethod"];
  }) => {
    const getCardClass = (method: string) => {
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
    const entries = Object.entries(grossByPaymentMethod || {});
    if (entries.length === 0)
      return <p>Nenhum dado de faturamento para o período.</p>;
    return (
      <>
        <h2
          className="text-xl font-semibold"
          style={{ color: "var(--card-text-secondary)" }}
        >
          Meu Saldo Bruto
        </h2>
        <div className="card-container grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map(([method, amount]) => (
            <div
              key={method}
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
                R$ {(amount as number).toFixed(2)}
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
          ))}
        </div>
      </>
    );
  }
);
GrossBalanceCards.displayName = "GrossBalanceCards";

const DailyProfitChart = memo(
  ({
    dailyNetProfit,
    filterMonth,
    filterYear,
  }: {
    dailyNetProfit: FilteredMonthStats["dailyNetProfit"];
    filterMonth: number;
    filterYear: number;
  }) => {
    const { chartData, chartOptions } = useMemo(() => {
      const getDaysInMonth = (month: number, year: number) =>
        new Date(year, month, 0).getDate();
      const daysInMonth = getDaysInMonth(filterMonth, filterYear);
      const fullMonthLabels = Array.from({ length: daysInMonth }, (_, i) =>
        (i + 1).toString()
      );
      const dailyDataMap = new Map(
        (dailyNetProfit || []).map((entry) => [
          new Date(entry.date).getUTCDate(),
          entry.netAmount || 0,
        ])
      );
      const data = fullMonthLabels.map(
        (day) => dailyDataMap.get(parseInt(day)) || 0
      );

      const neonColor = "#00f5d4";
      const neonColorTransparent = "rgba(0, 245, 212, 0.5)";
      const neonColorFaded = "rgba(0, 245, 212, 0)";

      const chartData = {
        labels: fullMonthLabels,
        datasets: [
          {
            label: "Lucro Líquido",
            data,
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
            pointRadius: 3,
            pointBorderColor: neonColor,
            pointBorderWidth: 2,
            pointBackgroundColor: "#1e293b",
            pointHoverRadius: 7,
            pointHoverBackgroundColor: neonColor,
            pointHoverBorderColor: "#fff",
          },
        ],
      };
      const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1000, easing: "easeOutCubic" as const },
        interaction: { mode: "index" as const, intersect: false },
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
            ticks: {
              display: true,
              color: "rgba(255, 255, 255, 0.5)",
              font: { size: 10 },
              maxRotation: 0,
              minRotation: 0,
            },
            grid: { display: false },
            border: { display: false },
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
            border: { display: false },
          },
        },
      };
      return { chartData, chartOptions };
    }, [dailyNetProfit, filterMonth, filterYear]);

    return (
      <div className="card w-full chart-card">
        <h2
          className="text-xl font-semibold mb-4"
          style={{ color: "var(--card-text-secondary)" }}
        >
          Lucro Líquido Diário
        </h2>
        <div className="h-40">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    );
  }
);
DailyProfitChart.displayName = "DailyProfitChart";

const ClientAnalysisCard = memo(({ liveStats }: { liveStats: LiveStats }) => {
  const getPlanColor = (plan: string) => {
    switch (plan.toLowerCase()) {
      case "p2p":
        return "#F1916D";
      case "platinum":
        return "#a64dff";
      case "comum":
        return "#4d8cff";
      default:
        return "#F3DADF";
    }
  };
  const getMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case "nubank":
        return "#a64dff";
      case "banco do brasil":
        return "#ffd700";
      case "caixa":
        return "#4d8cff";
      case "picpay":
        return "#00da77";
      case "pagseguro":
        return "#ffa000";
      default:
        return "#F3DADF";
    }
  };
  return (
    <>
      <div className="card w-full current-month-card">
        <h2
          className="text-xl font-semibold mb-4"
          style={{ color: "var(--text-primary-secondary)" }}
        >
          Como está meu mês (livre):
        </h2>
        <div className="flex flex-col gap-2">
          <div
            className="text-2xl font-semibold"
            style={{ color: "var(--card-text)" }}
          >
            -R$8/ativação: R$ {liveStats.totalNetAmount8.toFixed(2)}
          </div>
          <div
            className="text-2xl font-semibold"
            style={{ color: "var(--card-text)" }}
          >
            -R$15/ativação: R$ {liveStats.totalNetAmount15.toFixed(2)}
          </div>
        </div>
      </div>
      <div
        className="card w-full"
        style={{ minHeight: "300px", overflowY: "auto" }}
      >
        <h2
          className="text-3xl font-bold m-4"
          style={{ color: "var(--text-secondary)" }}
        >
          Análise dos Clientes (Meu Mês)
        </h2>
        <div className="flex flex-col gap-3 p-4">
          <p>
            <strong className="text-2xl font-bold">Clientes Ativos:</strong>{" "}
            <span
              className="text-2xl font-bold"
              style={{ color: "var(--accent-blue)" }}
            >
              {liveStats.activeClients}
            </span>
          </p>
          <p className="mt-3">
            <strong className="text-2xl font-bold">Por Plano:</strong>
          </p>
          {Object.entries(liveStats.clientsByPlan || {}).map(
            ([plan, count]) => (
              <p
                key={plan}
                style={{
                  color: getPlanColor(plan),
                  fontWeight: "bold",
                  fontSize: "1.25rem",
                }}
              >
                - {plan}: {count as ReactNode}
              </p>
            )
          )}
          <p className="mt-3">
            <strong className="text-xl font-bold">
              Por Método de Pagamento:
            </strong>
          </p>
          {Object.entries(liveStats.clientsByPaymentMethod || {}).map(
            ([method, count]) => (
              <p
                key={method}
                style={{
                  color: getMethodColor(method),
                  fontWeight: "bold",
                  fontSize: "1.25rem",
                }}
              >
                - {method}: {count as ReactNode}
              </p>
            )
          )}
        </div>
      </div>
    </>
  );
});
ClientAnalysisCard.displayName = "ClientAnalysisCard";

// --- FIM: SEUS COMPONENTES ORIGINAIS ---
