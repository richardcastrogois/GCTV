// frontend/src/app/newpage/components/TestSidebar.tsx
"use client";

import React from "react";
import { Accordion, AccordionItem, Tooltip } from "@heroui/react";
import {
  PiggyBank,
  Gauge,
  Users,
  FileText,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import Link from "next/link";

const accordionItemClasses = {
  base: "group py-0 w-full",
  heading: "flex-1 text-[11px] tracking-[0.16em] text-white/40 uppercase",
  trigger:
    "flex w-full items-center justify-start gap-4 rounded-md px-5 py-2 text-lg text-white/40 hover:bg-white/5 hover:text-white transition-colors",
  indicator:
    "ml-auto text-white/40 transition-transform duration-200 data-[open=true]:rotate-90",
  content: "pl-7 pb-2 pt-1",
  title: "text-normal text-left",
};

const subItemClass =
  "group flex w-full items-center rounded-md px-3 py-1.5 text-lg font-normal text-white/40 hover:bg-white/5 hover:text-white transition-colors text-left";

type TestSidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export const TestSidebar: React.FC<TestSidebarProps> = ({
  collapsed,
  onToggleCollapsed,
}) => {
  return (
    <aside
      className={`
        font-sans hidden md:flex
        sticky top-0 h-screen
        flex-col
        bg-[#0E1113]
        border-r border-white/5
        ${collapsed ? "w-[84px]" : "w-[230px]"}
        transition-[width] duration-200 ease-out
      `}
    >
      {/* wrapper relativo (evita conflito sticky+relative no mesmo elemento) */}
      <div className="relative h-full flex flex-col">
        {/* botão de expandir/recolher */}
        <Tooltip content={collapsed ? "Expandir menu" : "Recolher menu"}>
          <button
            onClick={onToggleCollapsed}
            className="
              absolute
              right-3
              top-10
              z-50
              inline-flex items-center justify-center
              h-9 w-9
              rounded-full
              border border-white/10
              bg-black/40
              hover:bg-white/5
              transition-colors
            "
            aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-white/70" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-white/70" />
            )}
          </button>
        </Tooltip>

        {/* topo */}
        <div className="flex items-center gap-3 px-6 pt-8 pb-7">
          <PiggyBank className="w-7 h-7 text-violet-400 shrink-0" />
          {!collapsed ? (
            <span className="text-xl font-semibold text-white/90 truncate">
              GCTV
            </span>
          ) : null}
        </div>

        <div className="h-px mx-4 mb-6 bg-white/5" />

        {/* navegação */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 text-white/70">
          {collapsed ? (
            <div className="flex flex-col gap-2 items-center">
              {/* DASHBOARD (COLAPSADO) */}
              <Tooltip content="Dashboard" placement="right">
                <Link
                  href="/newpage/dashboard"
                  className="
                    inline-flex items-center justify-center
                    h-11 w-11
                    rounded-xl
                    hover:bg-white/5
                    transition-colors
                    text-white/70
                  "
                  aria-label="Dashboard"
                >
                  <Gauge className="w-6 h-6" />
                </Link>
              </Tooltip>

              {/* USUÁRIOS (COLAPSADO) */}
              <Tooltip content="Usuários" placement="right">
                <Link
                  href="/newpage"
                  className="
                    inline-flex items-center justify-center
                    h-11 w-11
                    rounded-xl
                    hover:bg-white/5
                    transition-colors
                    text-white/70
                  "
                  aria-label="Usuários"
                >
                  <Users className="w-6 h-6" />
                </Link>
              </Tooltip>

              {/* LOGS (sem rota definida ainda) */}
              <Tooltip content="Logs" placement="right">
                <button
                  className="
                    inline-flex items-center justify-center
                    h-11 w-11
                    rounded-xl
                    hover:bg-white/5
                    transition-colors
                    text-white/70
                  "
                  aria-label="Logs"
                >
                  <FileText className="w-6 h-6" />
                </button>
              </Tooltip>
            </div>
          ) : (
            <>
              {/* DASHBOARD (ABERTO) */}
              <Link
                href="/newpage/dashboard"
                className="
                  group flex w-full items-center gap-4
                  rounded-md px-5 pl-7 py-2
                  text-xl text-white/60
                  hover:bg-white/5 hover:text-white
                  transition-colors
                "
              >
                <Gauge className="w-7 h-7" />
                <span className="font-normal text-left">Dashboard</span>
              </Link>

              <Accordion
                selectionMode="multiple"
                showDivider={false}
                itemClasses={accordionItemClasses}
                className="mt-2 space-y-1"
              >
                <AccordionItem
                  key="usuarios"
                  aria-label="Usuários"
                  startContent={<Users className="w-7 h-7" />}
                  indicator={<ChevronRight className="w-3 h-3" />}
                  title="Usuários"
                >
                  <ul className="mt-2 space-y-1">
                    <li>
                      {/* 🔹 Ativos (tela /newpage) */}
                      <Link href="/newpage" className={subItemClass}>
                        Gerenciar usuários
                      </Link>
                    </li>
                    <li>
                      {/* 🔹 Expirados (tela /newpage/expired) */}
                      <Link href="/newpage/expired" className={subItemClass}>
                        Clientes expirados
                      </Link>
                    </li>
                  </ul>
                </AccordionItem>

                <AccordionItem
                  key="logs"
                  aria-label="Logs"
                  startContent={<FileText className="w-7 h-7" />}
                  indicator={<ChevronRight className="w-3 h-3" />}
                  title="Logs"
                >
                  <ul className="mt-2 space-y-1">
                    <li>
                      <button className={subItemClass}>Gerenciar Logs</button>
                    </li>
                  </ul>
                </AccordionItem>
              </Accordion>
            </>
          )}
        </nav>
      </div>
    </aside>
  );
};
