// src/app/newpage/components/UsersFilters.tsx
"use client";

import React from "react";
import {
  Button,
  Input,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import {
  Search,
  ChevronDown,
  FunnelX as FilterIcon,
  X as XIcon,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

type UsersFiltersProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;

  userTypeLabel: string;
  onUserTypeLabelChange: (label: string) => void;

  paymentLabel: string;
  onPaymentLabelChange: (label: string) => void;

  planOptions: string[];
  paymentOptions: string[];

  dateQuery: string;
  onDateQueryChange: (value: string) => void;

  hasActiveFilters: boolean;
  onClearFilters: () => void;

  /** 🔹 NOVO: ordenação por vencimento (null = desligado) */
  expiresOrder: "asc" | "desc" | null;
  onToggleExpiresOrder: () => void;
};

export const UsersFilters: React.FC<UsersFiltersProps> = ({
  searchValue,
  onSearchChange,
  userTypeLabel,
  onUserTypeLabelChange,
  paymentLabel,
  onPaymentLabelChange,
  planOptions,
  paymentOptions,
  dateQuery,
  onDateQueryChange,
  hasActiveFilters,
  onClearFilters,
  expiresOrder,
  onToggleExpiresOrder,
}) => {
  const planItems = React.useMemo(
    () => ["Todos os planos", ...planOptions],
    [planOptions]
  );
  const paymentItems = React.useMemo(
    () => ["Todos os pagamentos", ...paymentOptions],
    [paymentOptions]
  );

  const sanitizeDateQuery = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  // ✅ largura dinâmica do DropdownMenu (igual ao campo)
  const planWrapRef = React.useRef<HTMLDivElement | null>(null);
  const paymentWrapRef = React.useRef<HTMLDivElement | null>(null);

  const [planMenuWidth, setPlanMenuWidth] = React.useState<number>(0);
  const [paymentMenuWidth, setPaymentMenuWidth] = React.useState<number>(0);

  React.useLayoutEffect(() => {
    const el = planWrapRef.current;
    if (!el) return;

    const update = () => setPlanMenuWidth(el.getBoundingClientRect().width);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  React.useLayoutEffect(() => {
    const el = paymentWrapRef.current;
    if (!el) return;

    const update = () => setPaymentMenuWidth(el.getBoundingClientRect().width);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  // ===== Tipografia LOCAL (sem mexer em global) =====
  const labelCls = "text-[13px] mb-1 text-foreground-500";
  const inputTextCls =
    "text-base text-foreground placeholder:text-foreground-500 h-full outline-none focus:outline-none focus-visible:outline-none";

  const inputWrapperCls = `
    bg-[#27272A]
    rounded-2xl
    h-14
    px-4
    border border-transparent
    data-[hover=true]:bg-[#3F3F46]
    data-[focus-visible=true]:bg-[#27272A]
    data-[focus-visible=true]:border-primary/40
    data-[focus-visible=true]:ring-0
    data-[focus-visible=true]:outline-none
  `;

  const dropdownBtnCls = `
    w-full
    justify-between
    bg-[#27272A]
    rounded-2xl
    h-14
    px-4
    border border-transparent
    text-lg
    font-normal
    text-foreground-500
    data-[hover=true]:bg-[#3F3F46]
    data-[pressed=true]:scale-[0.99]
    data-[focus-visible=true]:bg-[#27272A]
    data-[focus-visible=true]:border-primary/40
    data-[focus-visible=true]:outline-none
    data-[focus-visible=true]:ring-0
  `;

  // =========================
  // MOBILE BEHAVIOR (layout)
  // =========================
  const [isMobile, setIsMobile] = React.useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  React.useEffect(() => {
    if (!isMobile) setMobileFiltersOpen(false);
  }, [isMobile]);

  // animação suave (altura dinâmica)
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const [panelH, setPanelH] = React.useState(0);

  React.useLayoutEffect(() => {
    if (!isMobile) return;

    const el = panelRef.current;
    if (!el) return;

    const update = () => setPanelH(el.scrollHeight);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => ro.disconnect();
  }, [
    isMobile,
    userTypeLabel,
    paymentLabel,
    dateQuery,
    planItems.length,
    paymentItems.length,
  ]);

  // helper pra saber qual ícone mostrar (up ou down)
  const isAsc = expiresOrder !== "desc";

  const renderExpiresButton = (extraClasses = "") => (
    <Button
      size="sm"
      radius="lg"
      variant="flat"
      onPress={onToggleExpiresOrder}
      className={`
        h-11
        rounded-2xl
        px-4
        text-foreground-500
        bg-[#27272A]
        border border-transparent
        data-[hover=true]:bg-[#3F3F46]
        data-[pressed=true]:scale-[0.99]
        ${expiresOrder ? "shadow-[0_0_0_1px_rgba(85,110,230,0.4)]" : ""}
        ${extraClasses}
      `}
      startContent={<ArrowUpDown className="w-4 h-4" />}
      endContent={
        isAsc ? (
          <ArrowUp className="w-4 h-4 text-foreground-500" />
        ) : (
          <ArrowDown className="w-4 h-4 text-foreground-500" />
        )
      }
    >
      Expira em
    </Button>
  );

  return (
    <div className="w-full">
      {/* =========================
          MOBILE (<640px)
         ========================= */}
      {isMobile ? (
        <div className="w-full">
          {/* Linha 1: Buscar usuário (full) + ícone filtro (direita) */}
          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <span className={labelCls}>Buscar usuário</span>

              <Input
                size="sm"
                radius="lg"
                variant="flat"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Usuário | Nome"
                startContent={
                  <Search className="w-5 h-5 mr-3 text-foreground-500" />
                }
                endContent={
                  searchValue ? (
                    <button
                      type="button"
                      onClick={() => onSearchChange("")}
                      className="
                        flex items-center justify-center
                        w-5 h-5
                        rounded-full
                        bg-white/5
                        hover:bg-white/10
                        text-foreground-500
                      "
                      aria-label="Limpar busca"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  ) : null
                }
                classNames={{
                  inputWrapper: inputWrapperCls,
                  input: inputTextCls,
                }}
              />
            </div>

            <div className="flex flex-col gap-1 shrink-0">
              <span className={labelCls}>&nbsp;</span>

              <Button
                size="sm"
                radius="lg"
                variant="flat"
                isIconOnly
                onPress={() => setMobileFiltersOpen((v) => !v)}
                aria-label={
                  mobileFiltersOpen ? "Fechar filtros" : "Abrir filtros"
                }
                className="
                  h-14 w-14 min-w-14
                  rounded-2xl
                  bg-[#27272A]
                  border border-transparent
                  data-[hover=true]:bg-[#3F3F46]
                  data-[pressed=true]:scale-[0.99]
                  data-[focus-visible=true]:bg-[#27272A]
                  data-[focus-visible=true]:border-primary/40
                  data-[focus-visible=true]:outline-none
                  data-[focus-visible=true]:ring-0
                "
              >
                <SlidersHorizontal className="w-6 h-6 text-foreground-500" />
              </Button>
            </div>
          </div>

          {/* Painel de filtros (entre o input e linha Expira/Remover) */}
          <div
            className={`
              mt-3
              overflow-hidden
              transition-[max-height,opacity,transform]
              duration-300
              ease-out
              ${
                mobileFiltersOpen
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 -translate-y-1"
              }
            `}
            style={{ maxHeight: mobileFiltersOpen ? panelH : 0 }}
          >
            <div ref={panelRef} className="pt-1 space-y-3">
              {/* Plano */}
              <div ref={planWrapRef} className="flex flex-col gap-1 w-full">
                <span className={labelCls}>Plano</span>

                <Dropdown placement="bottom-start" offset={4}>
                  <DropdownTrigger>
                    <Button
                      size="sm"
                      radius="lg"
                      variant="flat"
                      className={dropdownBtnCls}
                      endContent={
                        <ChevronDown className="w-4 h-4 text-foreground-500" />
                      }
                    >
                      {userTypeLabel}
                    </Button>
                  </DropdownTrigger>

                  <DropdownMenu
                    aria-label="Filtrar por plano"
                    selectionMode="single"
                    style={
                      planMenuWidth
                        ? { width: `${planMenuWidth}px` }
                        : undefined
                    }
                    className="
                      bg-[#27272A]
                      rounded-2xl
                      mt-1.5
                      py-1 px-2
                      shadow-[0_18px_45px_rgba(0,0,0,0.65)]
                    "
                    itemClasses={{
                      base: `
                        text-sm text-foreground-500
                        px-3 py-2
                        rounded-xl
                        data-[hover=true]:bg-white/5
                        data-[hover=true]:text-white
                        data-[selected=true]:bg-primary/20
                        data-[selected=true]:text-primary
                        cursor-pointer
                      `,
                    }}
                    onSelectionChange={(keys) => {
                      const raw = Array.from(keys)[0];
                      const key = raw?.toString() ?? "";

                      if (key === "Todos os planos") {
                        onUserTypeLabelChange("Selecione o tipo");
                      } else {
                        onUserTypeLabelChange(key);
                      }
                    }}
                  >
                    {planItems.map((item) => (
                      <DropdownItem key={item}>{item}</DropdownItem>
                    ))}
                  </DropdownMenu>
                </Dropdown>
              </div>

              {/* Pagamento */}
              <div ref={paymentWrapRef} className="flex flex-col gap-1 w-full">
                <span className={labelCls}>Pagamento</span>

                <Dropdown placement="bottom-start" offset={4}>
                  <DropdownTrigger>
                    <Button
                      size="sm"
                      radius="lg"
                      variant="flat"
                      className={dropdownBtnCls}
                      endContent={
                        <ChevronDown className="w-4 h-4 text-foreground-500" />
                      }
                    >
                      {paymentLabel}
                    </Button>
                  </DropdownTrigger>

                  <DropdownMenu
                    aria-label="Filtrar por forma de pagamento"
                    selectionMode="single"
                    style={
                      paymentMenuWidth
                        ? { width: `${paymentMenuWidth}px` }
                        : undefined
                    }
                    className="
                      bg-[#27272A]
                      rounded-2xl
                      py-1 px-2
                      mt-1.5
                      shadow-[0_18px_45px_rgba(0,0,0,0.65)]
                    "
                    itemClasses={{
                      base: `
                        text-sm text-foreground-500
                        px-3 py-2
                        rounded-xl
                        data-[hover=true]:bg-white/5
                        data-[hover=true]:text-white
                        data-[selected=true]:bg-primary/20
                        data-[selected=true]:text-primary
                        cursor-pointer
                      `,
                    }}
                    onSelectionChange={(keys) => {
                      const raw = Array.from(keys)[0];
                      const key = raw?.toString() ?? "";

                      if (key === "Todos os pagamentos") {
                        onPaymentLabelChange("Selecione o Pagamento");
                      } else {
                        onPaymentLabelChange(key);
                      }
                    }}
                  >
                    {paymentItems.map((item) => (
                      <DropdownItem key={item}>{item}</DropdownItem>
                    ))}
                  </DropdownMenu>
                </Dropdown>
              </div>

              {/* Por Data */}
              <div className="flex flex-col gap-1 w-full">
                <span className={labelCls}>Por Data</span>

                <Input
                  size="sm"
                  radius="lg"
                  variant="flat"
                  value={dateQuery}
                  onChange={(e) =>
                    onDateQueryChange(sanitizeDateQuery(e.target.value))
                  }
                  placeholder="dd/mm/aaaa"
                  endContent={
                    dateQuery ? (
                      <button
                        type="button"
                        onClick={() => onDateQueryChange("")}
                        className="
                          flex items-center justify-center
                          w-5 h-5
                          rounded-full
                          bg-white/5
                          hover:bg-white/10
                          text-foreground-500
                        "
                        aria-label="Limpar data"
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                    ) : null
                  }
                  classNames={{
                    inputWrapper: inputWrapperCls,
                    input: inputTextCls,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Linha: Expira em (esq) + Remover (dir) */}
          <div className="flex items-center justify-between gap-3 mt-4">
            {renderExpiresButton()}

            {hasActiveFilters ? (
              <Button
                size="sm"
                radius="lg"
                color="danger"
                variant="light"
                onPress={onClearFilters}
                className="
                  h-11
                  rounded-2xl
                  px-4
                  whitespace-nowrap
                  text-[#D01355]
                  data-[hover=true]:bg-[#521729]
                  data-[pressed=true]:scale-[0.98]
                "
                startContent={<FilterIcon className="w-5 h-5" />}
              >
                Remover filtros
              </Button>
            ) : (
              <div className="h-11 w-[170px]" />
            )}
          </div>
        </div>
      ) : (
        /* =========================
            DESKTOP / TABLET (>=640px)
           ========================= */
        <div className="flex flex-wrap items-end gap-3">
          {/* Buscar usuário */}
          <div
            className="
              flex flex-col gap-1
              grow-0 shrink-0
              w-[100px] sm:w-[100px] md:w-[140px] lg:w-[220px]
              max-w-full
            "
          >
            <span className={labelCls}>Buscar usuário</span>

            <Input
              size="sm"
              radius="lg"
              variant="flat"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Usuário | Nome"
              startContent={
                <Search className="w-5 h-5 mr-3 text-foreground-500" />
              }
              endContent={
                searchValue ? (
                  <button
                    type="button"
                    onClick={() => onSearchChange("")}
                    className="
                      flex items-center justify-center
                      w-5 h-5
                      rounded-full
                      bg-white/5
                      hover:bg-white/10
                      text-foreground-500
                    "
                    aria-label="Limpar busca"
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                ) : null
              }
              classNames={{
                inputWrapper: inputWrapperCls,
                input: inputTextCls,
              }}
            />
          </div>

          {/* Plano */}
          <div
            ref={planWrapRef}
            className="
              flex flex-col gap-1
              grow-0 shrink-0
              w-[140px] sm:w-[180px] md:w-[200px]
              max-w-full
            "
          >
            <span className={labelCls}>Plano</span>

            <Dropdown placement="bottom-start" offset={4}>
              <DropdownTrigger>
                <Button
                  size="sm"
                  radius="lg"
                  variant="flat"
                  className={dropdownBtnCls}
                  endContent={
                    <ChevronDown className="w-4 h-4 text-foreground-500" />
                  }
                >
                  {userTypeLabel}
                </Button>
              </DropdownTrigger>

              <DropdownMenu
                aria-label="Filtrar por plano"
                selectionMode="single"
                style={
                  planMenuWidth ? { width: `${planMenuWidth}px` } : undefined
                }
                className="
                  bg-[#27272A]
                  rounded-2xl
                  mt-1.5
                  py-1 px-2
                  shadow-[0_18px_45px_rgba(0,0,0,0.65)]
                "
                itemClasses={{
                  base: `
                    text-sm text-foreground-500
                    px-3 py-2
                    rounded-xl
                    data-[hover=true]:bg-white/5
                    data-[hover=true]:text-white
                    data-[selected=true]:bg-primary/20
                    data-[selected=true]:text-primary
                    cursor-pointer
                  `,
                }}
                onSelectionChange={(keys) => {
                  const raw = Array.from(keys)[0];
                  const key = raw?.toString() ?? "";

                  if (key === "Todos os planos") {
                    onUserTypeLabelChange("Selecione o tipo");
                  } else {
                    onUserTypeLabelChange(key);
                  }
                }}
              >
                {planItems.map((item) => (
                  <DropdownItem key={item}>{item}</DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          </div>

          {/* Pagamento */}
          <div
            ref={paymentWrapRef}
            className="
              flex flex-col gap-1
              grow-0 shrink-0
              w-[140px] sm:w-[180px] md:w-[200px]
              max-w-full
            "
          >
            <span className={labelCls}>Pagamento</span>

            <Dropdown placement="bottom-start" offset={4}>
              <DropdownTrigger>
                <Button
                  size="sm"
                  radius="lg"
                  variant="flat"
                  className={dropdownBtnCls}
                  endContent={
                    <ChevronDown className="w-4 h-4 text-foreground-500" />
                  }
                >
                  {paymentLabel}
                </Button>
              </DropdownTrigger>

              <DropdownMenu
                aria-label="Filtrar por forma de pagamento"
                selectionMode="single"
                style={
                  paymentMenuWidth
                    ? { width: `${paymentMenuWidth}px` }
                    : undefined
                }
                className="
                  bg-[#27272A]
                  rounded-2xl
                  py-1 px-2
                  mt-1.5
                  shadow-[0_18px_45px_rgba(0,0,0,0.65)]
                "
                itemClasses={{
                  base: `
                    text-sm text-foreground-500
                    px-3 py-2
                    rounded-xl
                    data-[hover=true]:bg-white/5
                    data-[hover=true]:text-white
                    data-[selected=true]:bg-primary/20
                    data-[selected=true]:text-primary
                    cursor-pointer
                  `,
                }}
                onSelectionChange={(keys) => {
                  const raw = Array.from(keys)[0];
                  const key = raw?.toString() ?? "";

                  if (key === "Todos os pagamentos") {
                    onPaymentLabelChange("Selecione o Pagamento");
                  } else {
                    onPaymentLabelChange(key);
                  }
                }}
              >
                {paymentItems.map((item) => (
                  <DropdownItem key={item}>{item}</DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          </div>

          {/* Por Data */}
          <div
            className="
              flex flex-col gap-1
              grow-0 shrink-0
              w-[120px] sm:w-[130px] md:w-[150px]
              max-w-full
            "
          >
            <span className={labelCls}>Por Data</span>

            <Input
              size="sm"
              radius="lg"
              variant="flat"
              value={dateQuery}
              onChange={(e) =>
                onDateQueryChange(sanitizeDateQuery(e.target.value))
              }
              placeholder="dd/mm/aaaa"
              endContent={
                dateQuery ? (
                  <button
                    type="button"
                    onClick={() => onDateQueryChange("")}
                    className="
                      flex items-center justify-center
                      w-5 h-5
                      rounded-full
                      bg-white/5
                      hover:bg-white/10
                      text-foreground-500
                    "
                    aria-label="Limpar data"
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                ) : null
              }
              classNames={{
                inputWrapper: inputWrapperCls,
                input: inputTextCls,
              }}
            />
          </div>

          {/* Expira em + Remover filtros (agora junto com os outros filtros, à esquerda) */}
          <div
            className="
              flex flex-col gap-1
              grow-0 shrink-0
              w-auto
              max-w-full
            "
          >
            {/* label vazio só pra alinhar verticalmente com os outros campos */}
            <span className={labelCls}>&nbsp;</span>

            <div className="flex items-center gap-3">
              {renderExpiresButton("w-auto")}

              {hasActiveFilters ? (
                <Button
                  size="sm"
                  radius="lg"
                  color="danger"
                  variant="light"
                  onPress={onClearFilters}
                  className="
                    w-auto
                    whitespace-nowrap
                    px-4 gap-2 h-14 rounded-2xl text-[14px]
                    text-[#D01355]
                    transition-all duration-200 ease-out
                    data-[hover=true]:bg-[#521729]
                    data-[pressed=true]:scale-[0.97]
                  "
                >
                  <FilterIcon className="w-6 h-6" />
                  Remover filtros
                </Button>
              ) : (
                <div className="h-14 w-[140px]" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
