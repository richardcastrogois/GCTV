//frontend/src/app/newpage/expired/page.tsx
"use client";

import React from "react";
import {
  Avatar,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";

import { Menu, Loader2 } from "lucide-react";

import { TestSidebar } from "../components/TestSidebar";
import { TestMobileSidebar } from "../components/TestMobileSidebar";
import { UsersFilters } from "../components/UsersFilters";
import ExpiredUsersTable from "../components/ExpiredUsersTable";

import { fetchExpiredClients } from "@/app/expired/api";
import { Client } from "@/types/client";

import { useRouter } from "next/navigation";
import styles from "../testeScroll.module.css";

type ClientWithDueDateString = Client & { dueDateString?: string };

function parsePartialDateQuery(q: string): {
  day?: number;
  month?: number;
  year?: number;
} {
  const trimmed = q.trim();
  if (!trimmed) return {};

  const parts = trimmed
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean);

  const day = parts[0] ? Number(parts[0]) : undefined;
  const month = parts[1] ? Number(parts[1]) : undefined;
  const year = parts[2] ? Number(parts[2]) : undefined;

  return { day, month, year };
}

function getClientDueDateParts(client: Client): {
  day?: number;
  month?: number;
  year?: number;
} {
  const s = (client as ClientWithDueDateString).dueDateString;

  if (s && typeof s === "string") {
    const [dd, mm, yyyy] = s.split("/").map((x) => Number(x));
    const day = dd >= 1 && dd <= 31 ? dd : undefined;
    const month = mm >= 1 && mm <= 12 ? mm : undefined;
    const year = yyyy >= 1 && yyyy <= 9999 ? yyyy : undefined;
    return { day, month, year };
  }

  if (!client.dueDate) return {};
  const d = new Date(client.dueDate);
  if (Number.isNaN(d.getTime())) return {};

  return {
    day: d.getUTCDate(),
    month: d.getUTCMonth() + 1,
    year: d.getUTCFullYear(),
  };
}

// mesmo spinner centralizado da tela de ativos
const CenteredSpinner: React.FC = () => (
  <div className="w-full flex items-center justify-center py-20">
    <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
  </div>
);

const ExpiredUsersPage: React.FC = () => {
  const loggedUserName = "platinum2025";
  const loggedUserHandle = `@${loggedUserName.toLowerCase()}`;

  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const [searchValue, setSearchValue] = React.useState("");
  const [userTypeLabel, setUserTypeLabel] =
    React.useState<string>("Selecione o tipo");
  const [paymentLabel, setPaymentLabel] = React.useState<string>(
    "Selecione o Pagamento"
  );
  const [dateQuery, setDateQuery] = React.useState("");

  const [expiresOrder, setExpiresOrder] = React.useState<"asc" | "desc" | null>(
    null
  );

  const toggleExpiresOrder = React.useCallback(() => {
    setExpiresOrder((prev) => {
      if (prev === "asc") return "desc";
      if (prev === "desc") return "asc";
      return "asc";
    });
  }, []);

  const hasActiveFilters =
    searchValue.trim() !== "" ||
    userTypeLabel !== "Selecione o tipo" ||
    paymentLabel !== "Selecione o Pagamento" ||
    dateQuery.trim() !== "" ||
    expiresOrder !== null;

  const handleClearFilters = () => {
    setSearchValue("");
    setUserTypeLabel("Selecione o tipo");
    setPaymentLabel("Selecione o Pagamento");
    setDateQuery("");
    setExpiresOrder(null);
  };

  const [clients, setClients] = React.useState<Client[]>([]);
  const [loading, setLoading] = React.useState(true);

  const handleClientReactivated = (id: number) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  React.useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchExpiredClients(1, 9999, "", null, "asc");
        setClients(res.data);
      } catch (error) {
        console.error("Erro ao buscar clientes expirados:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const planOptions = React.useMemo(
    () =>
      Array.from(
        new Set(
          clients
            .map((c) => c.plan?.name)
            .filter((name): name is string => Boolean(name))
        )
      ),
    [clients]
  );

  const paymentOptions = React.useMemo(
    () =>
      Array.from(
        new Set(
          clients
            .map((c) => c.paymentMethod?.name)
            .filter((name): name is string => Boolean(name))
        )
      ),
    [clients]
  );

  const normalizedSearch = searchValue.trim().toLowerCase();
  const partial = React.useMemo(
    () => parsePartialDateQuery(dateQuery),
    [dateQuery]
  );

  const filteredClients = React.useMemo(() => {
    return clients.filter((client) => {
      if (normalizedSearch) {
        const matchesSearch =
          client.user?.username?.toLowerCase().includes(normalizedSearch) ||
          client.fullName.toLowerCase().includes(normalizedSearch) ||
          client.email.toLowerCase().includes(normalizedSearch) ||
          (client.phone ?? "").toLowerCase().includes(normalizedSearch) ||
          String(client.grossAmount).includes(normalizedSearch) ||
          String(client.netAmount).includes(normalizedSearch) ||
          (client.observations ?? "").toLowerCase().includes(normalizedSearch);

        if (!matchesSearch) return false;
      }

      if (userTypeLabel !== "Selecione o tipo") {
        if (client.plan?.name !== userTypeLabel) return false;
      }

      if (paymentLabel !== "Selecione o Pagamento") {
        if (client.paymentMethod?.name !== paymentLabel) return false;
      }

      if (dateQuery.trim()) {
        const { day, month, year } = getClientDueDateParts(client);

        if (partial.day && day !== partial.day) return false;
        if (partial.month && month !== partial.month) return false;
        if (partial.year && year !== partial.year) return false;
      }

      return true;
    });
  }, [
    clients,
    normalizedSearch,
    userTypeLabel,
    paymentLabel,
    dateQuery,
    partial.day,
    partial.month,
    partial.year,
  ]);

  const filteredAndSortedClients = React.useMemo(() => {
    const base = filteredClients;
    if (!base.length || !expiresOrder) {
      return base;
    }

    const sorted = [...base].sort((a, b) => {
      const da = new Date(a.dueDate).getTime();
      const db = new Date(b.dueDate).getTime();

      if (Number.isNaN(da) || Number.isNaN(db)) return 0;

      return expiresOrder === "asc" ? da - db : db - da;
    });

    return sorted;
  }, [filteredClients, expiresOrder]);

  // === LOGOUT (igual ao dashboard) ===
  const router = useRouter();
  const handleLogout = React.useCallback(() => {
    localStorage.removeItem("token");
    router.push("/");
  }, [router]);

  return (
    <div className="font-sans h-full w-full flex bg-[#050608] text-foreground overflow-hidden">
      {/* SIDEBAR DESKTOP */}
      <div className="hidden md:block h-full shrink-0 overflow-hidden">
        <TestSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        />
      </div>

      {/* SIDEBAR MOBILE */}
      <TestMobileSidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* MAIN: container que rola (header fica sticky dentro dele) */}
      <main
        className={`flex-1 min-w-0 h-full flex flex-col overflow-y-auto ${styles.customScroll}`}
      >
        {/* HEADER FIXO / SEMI-TRANSPARENTE - igual ao dos ativos */}
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
                showFallback
                fallback="RC"
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
                    classNames={{
                      base: "w-12 h-12 border-primary/60 bg-white text-black",
                      img: "opacity-100 visible object-cover",
                      fallback: "opacity-100 visible",
                    }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">
                      {loggedUserName}
                    </span>
                    <span className="text-xs text-white/60">
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

        {/* CONTEÚDO PRINCIPAL */}
        <div className="flex-1 w-full">
          <section className="w-full px-4 sm:px-6 py-5">
            <div className="w-full max-w-[1600px] mx-auto">
              <div className="px-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-medium text-white mb-4">
                    Clientes expirados
                  </h2>
                </div>

                <div className="bg-[#18181B] rounded-2xl p-4 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                  <div className="pt-2 space-y-6">
                    <UsersFilters
                      searchValue={searchValue}
                      onSearchChange={setSearchValue}
                      userTypeLabel={userTypeLabel}
                      onUserTypeLabelChange={setUserTypeLabel}
                      paymentLabel={paymentLabel}
                      onPaymentLabelChange={setPaymentLabel}
                      planOptions={planOptions}
                      paymentOptions={paymentOptions}
                      dateQuery={dateQuery}
                      onDateQueryChange={setDateQuery}
                      hasActiveFilters={hasActiveFilters}
                      onClearFilters={handleClearFilters}
                      expiresOrder={expiresOrder}
                      onToggleExpiresOrder={toggleExpiresOrder}
                    />

                    {loading ? (
                      <CenteredSpinner />
                    ) : (
                      <ExpiredUsersTable
                        users={filteredAndSortedClients}
                        onReactivated={handleClientReactivated}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default ExpiredUsersPage;
