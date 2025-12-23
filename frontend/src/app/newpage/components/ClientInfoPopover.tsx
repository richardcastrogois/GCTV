//frontend/src/app/newpage/components/ClientInfoPopover.tsx
"use client";

import React from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Divider,
} from "@heroui/react";
import { Info } from "lucide-react";
import { Client } from "@/types/client";

type Props = {
  client: Client;
  iconClassName?: string; // ✅ novo
};

const formatDateBR = (dateStr?: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
};

const moneyBR = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") return "";
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const Row = ({
  label,
  value,
  valueClassName = "",
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) => {
  return (
    <div className="grid grid-cols-[92px_1fr] items-center gap-3">
      <span className="text-[13px] font-semibold text-foreground">{label}</span>
      <div className={`text-[13px] text-foreground ${valueClassName}`}>
        {value}
      </div>
    </div>
  );
};

const ClientInfoPopover: React.FC<Props> = ({ client, iconClassName }) => {
  const [isMobile, setIsMobile] = React.useState(false);

  // ✅ controla abertura do popover (para poder fechar ao clicar em qualquer outro lugar)
  const [isOpen, setIsOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ✅ fecha ao clicar fora (inclusive quando clicar em outros botões/modais da tabela)
  React.useEffect(() => {
    if (!isOpen) return;

    const onPointerDownCapture = (ev: PointerEvent) => {
      const target = ev.target as Node | null;
      if (!target) return;

      const clickedTrigger = triggerRef.current?.contains(target);
      const clickedContent = contentRef.current?.contains(target);

      if (!clickedTrigger && !clickedContent) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDownCapture, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDownCapture, true);
    };
  }, [isOpen]);

  const username = client.user?.username ?? "-";
  const name = client.fullName ?? "-";
  const email = client.email ?? "";
  const phone = client.phone ?? "";
  const plan = client.plan?.name ?? "-";
  const payment = client.paymentMethod?.name ?? "-";
  const due = formatDateBR(client.dueDate);
  const gross = moneyBR(client.grossAmount);
  const net = moneyBR(client.netAmount);

  const obsRaw = (client.observations ?? "").trim();
  const obs = obsRaw.length ? obsRaw : "Nenhuma";

  return (
    <Popover
      placement={isMobile ? "bottom" : "left-start"}
      offset={10}
      showArrow
      isOpen={isOpen}
      onOpenChange={setIsOpen}
    >
      <PopoverTrigger>
        <button
          ref={triggerRef}
          className="
            p-2 rounded-full
            hover:bg-sky-500/10
            text-sky-300
            transition
          "
          aria-label="Ver detalhes do cliente"
          type="button"
          onClick={() => setIsOpen((v) => !v)}
        >
          <Info className={iconClassName ?? "w-5 h-5"} />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="
          w-[min(92vw,360px)]
          rounded-2xl
          bg-[#18181B]
          border border-white/10
          shadow-[0_20px_60px_rgba(0,0,0,0.6)]
          p-4
        "
      >
        {/* ✅ ajuste cirúrgico: o ref NÃO vai no PopoverContent (HeroUI não tipa ref nele),
            ele vai em um elemento interno */}
        <div ref={contentRef} className="flex flex-col gap-3">
          <div>
            <h4 className="text-base font-semibold text-foreground">
              Detalhes do Cliente
            </h4>
            <p className="text-xs text-foreground-500">Informações completas</p>
          </div>

          <Divider className="bg-white/10" />

          <div className="flex flex-col gap-2">
            <Row label="Usuário" value={username} />
            <Row label="Nome" value={name} />
            <Row
              label="Email"
              value={
                email ? (
                  <a
                    href={`mailto:${email}`}
                    className="text-sky-300 hover:underline"
                  >
                    {email}
                  </a>
                ) : (
                  "-"
                )
              }
            />
            <Row
              label="Telefone"
              value={
                phone ? (
                  <a
                    href={`tel:${phone}`}
                    className="text-fuchsia-300 hover:underline"
                  >
                    {phone}
                  </a>
                ) : (
                  "-"
                )
              }
            />
          </div>

          <Divider className="bg-white/10" />

          <div className="flex flex-col gap-2">
            <Row label="Plano" value={plan} valueClassName="text-amber-200" />
            <Row
              label="Pagamento"
              value={payment}
              valueClassName="text-emerald-200"
            />
            <Row
              label="Vencimento"
              value={due || "-"}
              valueClassName="text-rose-300"
            />
          </div>

          <Divider className="bg-white/10" />

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[92px_1fr] items-center gap-3">
              <span className="text-[13px] font-semibold text-foreground">
                $ Bruto
              </span>
              <span className="text-[13px] text-rose-300">{gross || "-"}</span>
            </div>
            <div className="grid grid-cols-[92px_1fr] items-center gap-3">
              <span className="text-[13px] font-semibold text-foreground">
                $ Líquido
              </span>
              <span className="text-[13px] text-fuchsia-300">{net || "-"}</span>
            </div>
          </div>

          <Divider className="bg-white/10" />

          <div className="flex flex-col gap-2">
            <Row
              label="Obs"
              value={
                <div
                  className="
                    text-foreground-500
                    max-h-[120px] sm:max-h-[160px]
                    overflow-y-auto
                    whitespace-pre-wrap
                    [overflow-wrap:anywhere]
                    pr-2
                    [scrollbar-width:thin]
                    [scrollbar-color:rgba(255,255,255,0.25)_transparent]
                    [&::-webkit-scrollbar]:w-2
                    [&::-webkit-scrollbar-track]:bg-transparent
                    [&::-webkit-scrollbar-thumb]:bg-white/20
                    [&::-webkit-scrollbar-thumb]:rounded-full
                    hover:[&::-webkit-scrollbar-thumb]:bg-white/30
                  "
                >
                  {obs}
                </div>
              }
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ClientInfoPopover;
