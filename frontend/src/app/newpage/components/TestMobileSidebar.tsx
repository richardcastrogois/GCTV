// frontend/src/app/newpage/components/TestMobileSidebar.tsx
"use client";

import React from "react";
import { Modal, ModalContent, Accordion, AccordionItem } from "@heroui/react";
import {
  PiggyBank,
  Gauge,
  Users,
  FileText,
  ChevronRight,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

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

type TestMobileSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const TestMobileSidebar: React.FC<TestMobileSidebarProps> = ({
  isOpen,
  onClose,
}) => {
  const router = useRouter();

  // mounted: controla se o conteúdo existe no DOM (pra animar saída)
  const [mounted, setMounted] = React.useState(false);
  // active: controla classes de animação
  const [active, setActive] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setMounted(true);
      // ativa no próximo frame -> overlay e painel começam juntos (suave)
      requestAnimationFrame(() => setActive(true));
      return;
    }

    // fechando: anima saída
    setActive(false);
    const t = window.setTimeout(() => {
      setMounted(false);
    }, 220);

    return () => window.clearTimeout(t);
  }, [isOpen]);

  const handleClose = () => {
    setActive(false);
    window.setTimeout(() => {
      onClose();
    }, 220);
  };

  const goTo = (path: string) => {
    router.push(path);
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen || mounted}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      placement="center"
      backdrop="transparent"
      radius="none"
      classNames={{
        base: "md:hidden bg-transparent shadow-none",
        backdrop: "bg-transparent",
      }}
    >
      <ModalContent>
        {() =>
          mounted ? (
            <div className="fixed inset-0 flex">
              {/* overlay */}
              <button
                className={`
                  absolute inset-0
                  bg-black/25
                  backdrop-blur-md
                  transition-opacity duration-200 ease-out
                  ${active ? "opacity-100" : "opacity-0"}
                `}
                onClick={handleClose}
                aria-label="Fechar menu"
              />

              {/* painel */}
              <aside
                className={`
                  relative
                  h-full w-[82vw] max-w-[320px]
                  bg-[#0E1113] border-r border-white/5
                  flex flex-col
                  transform-gpu
                  transition-transform duration-200 ease-out
                  ${active ? "translate-x-0" : "-translate-x-full"}
                `}
              >
                {/* topo */}
                <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-5">
                  <div className="flex items-center gap-3 min-w-0">
                    <PiggyBank className="w-7 h-7 text-violet-400 shrink-0" />
                    <span className="text-lg font-semibold text-white/90 truncate">
                      GCTV
                    </span>
                  </div>

                  <button
                    onClick={handleClose}
                    className="
                      inline-flex items-center justify-center
                      h-9 w-9
                      rounded-full
                      border border-white/10
                      bg-black/30
                      hover:bg-white/5
                      transition-colors
                    "
                    aria-label="Fechar menu"
                  >
                    <X className="w-4 h-4 text-white/70" />
                  </button>
                </div>

                <div className="h-px mx-4 mb-4 bg-white/5" />

                <nav className="flex-1 overflow-y-auto px-2 py-2 text-white/70">
                  {/* DASHBOARD NO MOBILE: AGORA NAVEGA */}
                  <button
                    className="
                      group flex w-full items-center gap-4
                      rounded-md px-5 pl-7 py-2
                      text-xl text-white/60
                      hover:bg-white/5 hover:text-white
                      transition-colors
                    "
                    onClick={() => goTo("/newpage/dashboard")}
                  >
                    <Gauge className="w-7 h-7" />
                    <span className="font-normal text-left">Dashboard</span>
                  </button>

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
                          {/* Ativos (/newpage) */}
                          <button
                            className={subItemClass}
                            onClick={() => goTo("/newpage")}
                          >
                            Gerenciar usuários
                          </button>
                        </li>
                        <li>
                          {/* Expirados (/newpage/expired) */}
                          <button
                            className={subItemClass}
                            onClick={() => goTo("/newpage/expired")}
                          >
                            Clientes expirados
                          </button>
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
                          <button className={subItemClass}>
                            Gerenciar Logs
                          </button>
                        </li>
                      </ul>
                    </AccordionItem>
                  </Accordion>
                </nav>
              </aside>
            </div>
          ) : null
        }
      </ModalContent>
    </Modal>
  );
};
