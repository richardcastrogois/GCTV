// frontend/src/app/newpage/dashboard/page.tsx
"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  memo,
  ReactNode,
} from "react";
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { AxiosError } from "axios";
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

import { toast } from "react-toastify";
import { Menu } from "lucide-react";

import {
  Avatar,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import { useRouter } from "next/navigation";

import api from "@/utils/api";
import Filter from "@/app/dashboard/components/Filter";

import { TestSidebar } from "../components/TestSidebar";
import { TestMobileSidebar } from "../components/TestMobileSidebar";
import styles from "../testeScroll.module.css";

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
  loading: () => (
    <div className="h-full w-full rounded-2xl bg-[#27272a] animate-pulse" />
  ),
  ssr: false,
});

// ===================== TIPOS ======================

interface FilteredMonthStats {
  grossByPaymentMethod: Record<string, number>;
  dailyNetProfit: { date: string; netAmount: number }[];
  totalNetAmount8: number;
  totalNetAmount15: number;
  thyPayment: number;
}

interface LiveStats {
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

// ===================== QUERY CLIENT ==========================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// ===================== FETCH ================================

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

// ===================== SKELETONS =======================

const GrossBalanceCardsSkeleton = () => (
  <div className="space-y-3">
    <div className="h-6 w-40 rounded-full bg-white/10 animate-pulse" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl bg-[#27272a] p-4 flex flex-col justify-between gap-3 animate-pulse"
        >
          <div className="flex justify-between items-start">
            <div className="h-6 w-10 rounded-full bg-white/15" />
            <div className="h-6 w-6 rounded-full bg-white/15" />
          </div>
          <div className="h-7 w-2/3 rounded-full bg-white/15" />
          <div className="flex justify-between items-end">
            <div className="h-5 w-1/3 rounded-full bg-white/15" />
            <div className="flex gap-2">
              <span className="h-4 w-4 rounded-full bg-white/15" />
              <span className="h-4 w-4 rounded-full bg-white/15" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const DailyProfitChartSkeleton = () => (
  <div className="rounded-2xl bg-[#27272a] p-4 h-[240px] flex flex-col gap-4 animate-pulse">
    <div className="h-6 w-56 rounded-full bg-white/15" />
    <div className="flex-1 rounded-xl bg-white/10" />
  </div>
);

const ClientAnalysisCardSkeleton = () => (
  <div className="flex flex-col gap-4 animate-pulse">
    <div className="rounded-2xl bg-[#27272a] p-4 h-[140px] flex flex-col gap-3">
      <div className="h-6 w-48 rounded-full bg-white/15" />
      <div className="h-5 w-3/4 rounded-full bg-white/15" />
      <div className="h-5 w-1/2 rounded-full bg-white/15" />
      <div className="h-5 w-2/3 rounded-full bg-white/15" />
    </div>
    <div className="rounded-2xl bg-[#27272a] p-4 min-h-[260px] flex flex-col gap-3">
      <div className="h-7 w-64 rounded-full bg-white/15" />
      <div className="h-5 w-40 rounded-full bg-white/15" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-4 w-3/4 rounded-full bg-white/15" />
      ))}
    </div>
  </div>
);

// ===================== COMPONENTE PRINCIPAL =========================

function Dashboard() {
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const router = useRouter();

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

  const hasData = !!data && !!data.filteredData && !!data.liveData;

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    router.push("/");
  }, [router]);

  // mesmos dados do header da tela de usuários
  const loggedUserName = "platinum2025";
  const loggedUserHandle = `@${loggedUserName.toLowerCase()}`;

  return (
    <div className="flex h-screen bg-[#050509] text-foreground">
      {/* SIDEBAR DESKTOP */}
      <div className="hidden md:flex">
        <TestSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
        />
      </div>

      {/* SIDEBAR MOBILE */}
      <TestMobileSidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        <main
          className={`flex-1 min-w-0 h-full flex flex-col overflow-y-auto ${styles.customScroll}`}
        >
          {/* HEADER FIXO – IGUAL AO DA TELA DE USUÁRIOS */}
          <header
            className="
              shrink-0 sticky top-0 z-20
              flex items-center justify-end gap-4
              px-4 sm:px-8 h-[72px]
              border-b border-white/5
              bg-black/40
              backdrop-blur-xl
            "
          >
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="
                md:hidden
                absolute left-4
                inline-flex items-center justify-center
                h-10 w-10
                rounded-xl
                border border-white/10
                bg-black/30
                hover:bg-white/5
                transition-colors
              "
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5 text-white/80" />
            </button>

            {/* Dropdown usuário igual ao da UsersPage, mas com logout real */}
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Avatar
                  as="button"
                  isBordered
                  radius="full"
                  size="lg"
                  src="/teste0001.png"
                  classNames={{
                    base: "transition-transform border-primary/60 hover:scale-[1.03] bg-white text-black",
                    img: "opacity-100 visible object-cover",
                    fallback: "opacity-100 visible",
                  }}
                />
              </DropdownTrigger>

              <DropdownMenu
                variant="flat"
                className="
                  min-w-[260px]
                  bg-[#27272A]/95
                  rounded-2xl
                  border-0
                  shadow-[0_18px_45px_rgba(0,0,0,0.75)]
                  p-1
                "
              >
                <DropdownItem
                  key="profile"
                  isReadOnly
                  className="
                    cursor-default
                    rounded-2xl
                    px-3
                    py-2
                  "
                >
                  <div className="flex items-center gap-3 py-1">
                    <Avatar
                      src="/teste0001.png"
                      isBordered
                      radius="full"
                      showFallback
                      fallback="RC"
                      classNames={{
                        base: "w-12 h-12 border-primary/60 bg-white text-black",
                        img: "opacity-100 visible object-cover",
                        fallback: "opacity-100 visible",
                      }}
                    />
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm font-medium text-foreground">
                        {loggedUserName}
                      </span>
                      <span className="text-xs text-foreground-500">
                        {loggedUserHandle}
                      </span>
                    </div>
                  </div>
                </DropdownItem>

                <DropdownItem
                  key="logout"
                  className="
                    text-xs
                    text-red-400
                    font-medium
                    rounded-xl
                    px-3
                    py-2
                    data-[hover=true]:bg-red-500/10
                  "
                  onPress={handleLogout}
                >
                  Sair
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </header>

          {/* CONTEÚDO SCROLLÁVEL */}
          <section className="px-4 sm:px-8 pt-6 pb-8 flex flex-col gap-6">
            {/* TOPO DA MAIN: TÍTULO + FILTROS */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-col">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                  Dashboard
                </h1>
              </div>

              <div className="w-full max-w-[380px]">
                <Filter onFilterChange={handleFilterChange} />
              </div>
            </div>

            {/* CASOS DE ERRO */}
            {!isLoading && (!hasData || error) && (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-500/5 px-4 py-3 text-sm text-rose-100">
                Não foi possível carregar os dados do dashboard.
              </div>
            )}

            {/* GRID PRINCIPAL */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)] gap-6">
              {/* COLUNA ESQUERDA: SALDOS + GRÁFICO */}
              <div className="flex flex-col gap-6">
                {isLoading ? (
                  <>
                    <GrossBalanceCardsSkeleton />
                    <DailyProfitChartSkeleton />
                  </>
                ) : hasData ? (
                  <>
                    <GrossBalanceCards
                      grossByPaymentMethod={
                        data!.filteredData.grossByPaymentMethod
                      }
                    />
                    <DailyProfitChart
                      dailyNetProfit={data!.filteredData.dailyNetProfit}
                      filterMonth={filterMonth}
                      filterYear={filterYear}
                    />
                  </>
                ) : null}
              </div>

              {/* COLUNA DIREITA: COMO ESTÁ MEU MÊS + ANÁLISE */}
              <div className="flex flex-col gap-4">
                {isLoading ? (
                  <ClientAnalysisCardSkeleton />
                ) : hasData ? (
                  <ClientAnalysisCard
                    filteredStats={data!.filteredData}
                    liveStats={data!.liveData}
                  />
                ) : null}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

// ===================== EXPORT COM QUERY CLIENT ======================

export default function DashboardPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}

// ===================== SUBCOMPONENTES =========================

const GrossBalanceCards = memo(
  ({
    grossByPaymentMethod,
  }: {
    grossByPaymentMethod: Record<string, number>;
  }) => {
    const getGradient = (method: string) => {
      switch (method.toLowerCase()) {
        case "nubank":
          return "from-[#1f1033] via-[#4b1f80] via-[#7c3aed] to-[#a855f7]";
        case "pagseguro":
          return "from-[#3b2305] via-[#f59e0b] via-[#fb923c] to-[#f97316]";
        case "caixa":
          return "from-[#03152f] via-[#1d4ed8] via-[#0ea5e9] to-[#22d3ee]";
        case "picpay":
          return "from-[#022c22] via-[#059669] via-[#10b981] to-[#22c55e]";
        case "banco_do_brasil":
        case "banco do brasil":
          return "from-[#231f02] via-[#facc15] via-[#fbbf24] to-[#f97316]";
        default:
          return "from-[#111827] via-[#1f2937] via-[#374151] to-[#4b5563]";
      }
    };

    const normalizeLabel = (method: string) => {
      if (method.toLowerCase() === "banco_do_brasil") return "Banco do Brasil";
      return method;
    };

    const entries = Object.entries(grossByPaymentMethod || {});
    if (entries.length === 0) {
      return (
        <p className="text-sm text-zinc-300">
          Nenhum dado de faturamento para o período.
        </p>
      );
    }

    return (
      <div className="space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-zinc-100">
          Meu saldo bruto
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map(([method, amount]) => (
            <div
              key={method}
              className={`
                relative overflow-hidden
                rounded-2xl
                bg-gradient-to-br ${getGradient(method)}
                p-4 flex flex-col justify-between gap-4
                shadow-[0_18px_45px_rgba(0,0,0,0.55)]
                text-white
              `}
            >
              {/* brilho suave */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_55%)]" />

              {/* topo do cartão */}
              <div className="relative flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <div className="inline-flex items-center gap-5 rounded-xl bg-black/35 px-5 py-3 text-[15px] font-medium text-white">
                    <span className="truncate max-w-[150px]">
                      {normalizeLabel(method)}
                    </span>
                  </div>
                </div>

                {/* chip + crédito */}
                <div className="flex flex-col items-end gap-1">
                  <div className="w-9 h-6 rounded-md bg-gradient-to-br from-yellow-50 via-amber-300 to-amber-500 border border-white/60 shadow-[0_0_14px_rgba(250,204,21,0.95)]" />
                  <span className="text-[8px] tracking-[0.22em] text-white/80 uppercase">
                    Crédito
                  </span>
                </div>
              </div>

              {/* label saldo disponível */}
              <div className="relative">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/50 mb-1">
                  Saldo disponível
                </p>
              </div>

              {/* rodapé - titular + saldo grande */}
              <div className="relative flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-md sm:text-lg font-medium text-white">
                    Crislaine Silva
                  </span>
                </div>

                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-[10px] text-white/50 uppercase tracking-[0.18em]">
                    Saldo
                  </span>
                  <span className="text-2xl sm:text-3xl font-semibold drop-shadow">
                    R$ {(amount as number).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
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
    dailyNetProfit: { date: string; netAmount: number }[];
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

      const neonColor = "#22d3ee";
      const neonColorTransparent = "rgba(34, 211, 238, 0.55)";
      const neonColorFaded = "rgba(34, 211, 238, 0)";

      const chartData = {
        labels: fullMonthLabels,
        datasets: [
          {
            label: "Lucro Líquido",
            data,
            fill: true,
            borderColor: neonColor,
            borderWidth: 3,
            tension: 0.38,
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
            pointBackgroundColor: "#020617",
            pointHoverRadius: 7,
            pointHoverBackgroundColor: neonColor,
            pointHoverBorderColor: "#ffffff",
          },
        ],
      };

      const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 900, easing: "easeOutCubic" as const },
        interaction: { mode: "index" as const, intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(15,23,42,0.95)",
            borderColor: "rgba(148,163,184,0.6)",
            borderWidth: 1,
            titleFont: { size: 13, weight: "bold" as const },
            bodyFont: { size: 12, weight: "normal" as const },
            padding: 10,
            cornerRadius: 10,
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
              color: "rgba(229,231,235,0.9)",
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
              color: "rgba(229,231,235,0.9)",
              font: { size: 10 },
              padding: 8,
              callback: (value: string | number) =>
                `R$ ${Number(value).toFixed(0)}`,
            },
            grid: {
              display: true,
              color: "rgba(75,85,99,0.6)",
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
      <div className="rounded-2xl bg-[#27272a] px-4 py-4 sm:px-5 sm:py-5 shadow-[0_18px_45px_rgba(0,0,0,0.6)]">
        <h2 className="text-base sm:text-lg font-semibold mb-3 text-zinc-100">
          Lucro líquido diário
        </h2>
        <div className="h-[200px] sm:h-[230px]">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    );
  }
);
DailyProfitChart.displayName = "DailyProfitChart";

const ClientAnalysisCard = memo(
  ({
    filteredStats,
    liveStats,
  }: {
    filteredStats: FilteredMonthStats;
    liveStats: LiveStats;
  }) => {
    const getPlanColor = (plan: string) => {
      switch (plan.toLowerCase()) {
        case "p2p":
          return "#F97316";
        case "platinum":
          return "#a855f7";
        case "comum":
          return "#38bdf8";
        case "hibrid":
        case "híbrido":
          return "#22c55e";
        default:
          return "#e5e7eb";
      }
    };

    const getMethodColor = (method: string) => {
      switch (method.toLowerCase()) {
        case "nubank":
          return "#a855f7";
        case "banco do brasil":
          return "#facc15";
        case "caixa":
          return "#3b82f6";
        case "picpay":
          return "#22c55e";
        case "pagseguro":
          return "#f97316";
        default:
          return "#e5e7eb";
      }
    };

    return (
      <>
        {/* Como está meu mês */}
        <div className="rounded-2xl bg-[#27272a] px-4 py-4 sm:px-5 sm:py-5 shadow-[0_18px_45px_rgba(0,0,0,0.6)] text-zinc-200">
          <h2 className="text-lg sm:text-xl font-bold mb-3 text-zinc-100">
            Como está meu mês:
          </h2>
          <div className="flex flex-col gap-2 text-sm sm:text-base">
            <div className="flex flex-col">
              <span className="text-sm uppercase tracking-wide text-zinc-300">
                - R$8 / ativação
              </span>
              <span className="text-2xl font-semibold mb-2 text-sky-300">
                R$ {filteredStats.totalNetAmount8.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm uppercase tracking-wide text-zinc-300">
                - R$15 / ativação
              </span>
              <span className="text-2xl font-semibold mb-2 text-violet-300">
                R$ {filteredStats.totalNetAmount15.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm uppercase tracking-wide text-zinc-300">
                - Pagamento Thy
              </span>
              <span className="text-2xl font-semibold mb-2 text-emerald-300">
                R$ {filteredStats.thyPayment.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Análise dos clientes */}
        <div className="rounded-2xl bg-[#27272a] px-4 py-4 sm:px-5 sm:py-5 shadow-[0_18px_45px_rgba(0,0,0,0.6)] min-h-[260px] text-zinc-200">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-zinc-100">
            Análise dos clientes (Hoje)
          </h2>

          <div className="flex flex-col gap-3 text-sm sm:text-base">
            <p>
              <span className="text-xl font-semibold text-zinc-100">
                Clientes ativos:&nbsp;
              </span>
              <span className="text-2xl font-bold text-sky-400">
                {liveStats.activeClients}
              </span>
            </p>

            <div className="mt-2">
              <p className="font-semibold text-zinc-100 mb-1">Por plano:</p>
              <div className="space-y-1.5">
                {Object.entries(liveStats.clientsByPlan || {}).map(
                  ([plan, count]) => (
                    <p
                      key={plan}
                      style={{
                        color: getPlanColor(plan),
                        fontWeight: 600,
                        fontSize: "1.2rem",
                      }}
                    >
                      - {plan}: {count as ReactNode}
                    </p>
                  )
                )}
              </div>
            </div>

            <div className="mt-3">
              <p className="font-semibold text-zinc-100 mb-1">
                Por método de pagamento:
              </p>
              <div className="space-y-1.5">
                {Object.entries(liveStats.clientsByPaymentMethod || {}).map(
                  ([method, count]) => (
                    <p
                      key={method}
                      style={{
                        color: getMethodColor(method),
                        fontWeight: 600,
                        fontSize: "1.2rem",
                      }}
                    >
                      - {method}: {count as ReactNode}
                    </p>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
);
ClientAnalysisCard.displayName = "ClientAnalysisCard";
