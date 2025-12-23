// frontend/src/app/newpage/components/UsersTable.tsx
"use client";

import React from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  Pagination,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
} from "@heroui/react";

import { Client } from "@/types/client";
import ClientInfoPopover from "./ClientInfoPopover";
import RenewClientModal from "./RenewClientModal";
import EditClientModal from "./EditClientModal";
import ManagePaymentsModal from "./ManagePaymentsModal";
import DeleteClientModal from "./DeleteClientModal";

import styles from "../testeScroll.module.css";

import { updateClientVisualPaymentStatus } from "@/app/clients/api";

type UsersTableProps = {
  users: Client[];
  onUpdated?: (updated: Client) => void;
  onDeleted?: (deletedId: number) => void;
};

const tipClass = {
  content: "text-sm font-semibold px-3 py-2",
};

function isClientLike(value: unknown): value is Client {
  if (!value || typeof value !== "object") return false;
  return "id" in value;
}

const PILL_RADIUS = "rounded-lg";
const PILL_BASE = `inline-flex items-center justify-center px-3.5 py-1.5 text-[13px] font-semibold ${PILL_RADIUS}`;
const PILL_BORDER = "";
const PILL_RING = "";

function startOfDayUTC(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function getDueInfo(dueDateInput: string | Date) {
  const now = new Date();
  const due = new Date(dueDateInput);

  const todayUTC = startOfDayUTC(now).getTime();
  const dueUTC = startOfDayUTC(due).getTime();

  const diffMs = dueUTC - todayUTC;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const tooltip =
    diffDays < 0
      ? "Expirado"
      : diffDays === 0
      ? "Expira hoje"
      : `Expira em ${diffDays} dia${diffDays === 1 ? "" : "s"}`;

  let className = `${PILL_BASE} ${PILL_BORDER} ${PILL_RING}`;

  if (diffDays < 0) {
    className += " bg-rose-900/30 text-rose-300";
  } else if (diffDays === 0) {
    className += " bg-fuchsia-500/30 text-fuchsia-200";
  } else if (diffDays >= 1 && diffDays <= 3) {
    className += " bg-amber-900/30 text-amber-200";
  } else if (diffDays >= 4 && diffDays <= 7) {
    className += " bg-sky-900/30 text-sky-200";
  } else {
    className += " bg-emerald-900/30 text-emerald-200";
  }

  return { diffDays, tooltip, className };
}

function getPlanPillClass(planName?: string | null) {
  const name = (planName ?? "").toLowerCase();
  const base = `${PILL_BASE} ${PILL_BORDER} ${PILL_RING}`;

  if (name.includes("p2p"))
    return `${base} border-emerald-500/60 text-emerald-300 bg-emerald-900/20`;
  if (name.includes("platinum"))
    return `${base} border-violet-500/60 text-violet-300 bg-violet-900/20`;
  if (name.includes("comum"))
    return `${base} border-sky-500/60 text-sky-300 bg-sky-900/20`;

  if (name.includes("iptv"))
    return `${base} border-blue-500/60 text-blue-300 bg-blue-900/20`;
  if (name.includes("hybrid") || name.includes("hibrid"))
    return `${base} border-amber-500/60 text-amber-200 bg-amber-900/20`;

  return `${base} text-foreground-200 bg-white/5`;
}

function getPaymentPillClass(methodName?: string | null) {
  const name = (methodName ?? "").toLowerCase();
  const base = `${PILL_BASE} ${PILL_BORDER} ${PILL_RING}`;

  if (name.includes("nubank"))
    return `${base} border-violet-500/60 text-violet-300 bg-violet-900/20`;
  if (name.includes("banco do brasil"))
    return `${base} border-yellow-500/60 text-yellow-200 bg-yellow-400/20`;
  if (name.includes("caixa"))
    return `${base} border-blue-500/60 text-blue-300 bg-blue-900/20`;
  if (name.includes("picpay"))
    return `${base} border-emerald-500/60 text-emerald-300 bg-emerald-900/20`;
  if (name.includes("pagseguro"))
    return `${base} border-amber-500/60 text-amber-200 bg-amber-900/20`;

  return `${base} text-foreground-200 bg-white/5`;
}

const UsersTable: React.FC<UsersTableProps> = ({
  users,
  onUpdated,
  onDeleted,
}) => {
  const [rows, setRows] = React.useState<Client[]>(users);

  // 🔹 paginação (compartilhada desktop/mobile)
  const [page, setPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  React.useEffect(() => {
    setRows(users);
    setPage(1);
  }, [users]);

  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));

  React.useEffect(() => {
    setPage((prev) => {
      const maxPage = Math.max(1, totalPages);
      return prev > maxPage ? maxPage : prev;
    });
  }, [totalPages]);

  const paginatedRows = React.useMemo(() => {
    if (!totalItems) return [];
    const start = (page - 1) * rowsPerPage;
    return rows.slice(start, start + rowsPerPage);
  }, [rows, page, rowsPerPage, totalItems]);

  const pageStart = totalItems === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const pageEnd =
    totalItems === 0 ? 0 : Math.min(page * rowsPerPage, totalItems);

  const handleRowUpdated = (updated: Client) => {
    setRows((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    onUpdated?.(updated);
  };

  const handleRowDeleted = (id: number) => {
    setRows((prev) => prev.filter((c) => c.id !== id));
    onDeleted?.(id);
  };

  const handleUpdatePaymentStatus = async (
    clientId: number,
    verified: boolean
  ): Promise<void> => {
    const result = await updateClientVisualPaymentStatus(clientId, verified);

    if (isClientLike(result) && typeof result.id === "number") {
      handleRowUpdated(result);
      return;
    }

    setRows((prev) =>
      prev.map((c) =>
        c.id === clientId ? { ...c, visualPaymentConfirmed: verified } : c
      )
    );
  };

  // =========================
  // MOBILE (cards + expand)
  // =========================
  const [isMobile, setIsMobile] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<number | null>(null);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const col = {
    nome: "col-nome",
    pagamento: "col-pagamento",
    telefone: "col-telefone",
    valores: "col-valores",
    email: "col-email",
  } as const;

  const w = {
    gestao: "w-[56px] sm:w-[64px]",
    usuario: "w-[92px] sm:w-[110px]",
    vencimento: "w-[104px] sm:w-[116px]",
    plano: "w-[86px] sm:w-[106px]",
    acoes: "w-[116px] sm:w-[136px]",
  } as const;

  const truncateText = "truncate max-w-[180px] sm:max-w-[260px]";
  const truncateName = "truncate max-w-[220px] sm:max-w-[340px]";
  const truncateEmail = "truncate max-w-[220px] sm:max-w-[360px]";

  // ---------- MOBILE ----------
  if (isMobile) {
    return (
      <div className={`w-full ${styles.customScroll}`}>
        <div className="space-y-3">
          {paginatedRows.map((u, idx) => {
            const due = getDueInfo(u.dueDate);
            const isExpanded = expandedId === u.id;

            const cardBg = idx % 2 === 0 ? "bg-[#27272A]" : "bg-[#18181B]";

            return (
              <div
                key={u.id}
                className={`
                  ${cardBg}
                  rounded-2xl
                  border border-white/5
                  px-4 py-4
                  cursor-pointer
                  transition-[transform,box-shadow,background-color]
                  duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
                  ${
                    isExpanded
                      ? "shadow-[0_0_26px_rgba(0,0,0,0.28)]"
                      : "shadow-[0_0_18px_rgba(0,0,0,0.18)]"
                  }
                `}
                onClick={() =>
                  setExpandedId((prev) => (prev === u.id ? null : u.id))
                }
                role="button"
                tabIndex={0}
              >
                {/* Linha 1: usuário + gestão */}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[16px] font-semibold text-foreground truncate">
                      {u.user?.username ?? "-"}
                    </div>
                  </div>

                  <div
                    className="shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ManagePaymentsModal
                      client={u}
                      onUpdated={handleRowUpdated}
                      onUpdatePaymentStatus={handleUpdatePaymentStatus}
                    />
                  </div>
                </div>

                {/* Linha 2: nome + vencimento */}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[15px] text-foreground truncate">
                      {u.fullName ?? "-"}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <Tooltip
                      content={due.tooltip}
                      classNames={tipClass}
                      placement="top"
                    >
                      <span className={due.className}>
                        {new Date(u.dueDate).toLocaleDateString("pt-BR", {
                          timeZone: "UTC",
                        })}
                      </span>
                    </Tooltip>
                  </div>
                </div>

                {/* Linha 3: plano + pagamento */}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className={getPlanPillClass(u.plan?.name)}>
                      {u.plan?.name ?? "-"}
                    </span>
                  </div>

                  <div className="min-w-0 text-right">
                    <span
                      className={getPaymentPillClass(u.paymentMethod?.name)}
                    >
                      {u.paymentMethod?.name ?? "-"}
                    </span>
                  </div>
                </div>

                {/* Expandido: telefone / valores / email */}
                <div
                  className={`
                    overflow-hidden
                    will-change-[max-height,opacity]
                    transition-[max-height,opacity,margin-top]
                    duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
                    ${
                      isExpanded
                        ? "max-h-[280px] opacity-100 mt-3"
                        : "max-h-0 opacity-0 mt-0"
                    }
                  `}
                >
                  <div className="pt-1 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 text-[14px] text-foreground truncate">
                        {u.phone ?? ""}
                      </div>
                      <div className="shrink-0 text-[14px] text-foreground whitespace-nowrap">
                        {`R$ ${u.grossAmount} / R$ ${u.netAmount}`}
                      </div>
                    </div>

                    <div className="text-[14px] text-foreground truncate">
                      {u.email ?? ""}
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div
                  className="mt-4 flex items-center gap-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[14px] font-semibold text-foreground">
                    Ações
                  </span>

                  <div className="flex items-center gap-2 overflow-visible">
                    <Tooltip
                      content="Detalhes"
                      classNames={tipClass}
                      placement="top"
                    >
                      <span className="inline-flex text-sky-700">
                        <ClientInfoPopover client={u} iconClassName="w-5 h-5" />
                      </span>
                    </Tooltip>

                    <Tooltip
                      content="Renovar"
                      classNames={tipClass}
                      placement="top"
                    >
                      <span className="inline-flex text-amber-400">
                        <RenewClientModal
                          client={u}
                          onUpdated={handleRowUpdated}
                          iconClassName="w-5 h-5"
                        />
                      </span>
                    </Tooltip>

                    <Tooltip
                      content="Editar"
                      classNames={tipClass}
                      placement="top"
                    >
                      <span className="inline-flex text-emerald-400">
                        <EditClientModal
                          client={u}
                          onUpdated={handleRowUpdated}
                          iconClassName="w-5 h-5"
                        />
                      </span>
                    </Tooltip>

                    <Tooltip
                      content="Excluir"
                      classNames={tipClass}
                      placement="top"
                    >
                      <span className="inline-flex">
                        <DeleteClientModal
                          client={u}
                          onDeleted={handleRowDeleted}
                        />
                      </span>
                    </Tooltip>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Paginação MOBILE (layout igual referência) */}
        <div className="mt-6 space-y-2">
          {/* 1) paginação centralizada */}
          <div className="flex justify-end">
            <Pagination
              isCompact
              showControls
              total={totalPages}
              page={page}
              onChange={setPage}
              classNames={{
                base: "gap-2",
                item: `
                  w-9 h-9
                  text-[13px]
                  rounded-xl
                  [&>button]:rounded-xl
                  data-[active=true]:bg-[#556EE6]
                  data-[active=true]:text-black
                  data-[active=true]:shadow-lg
                  data-[active=true]:hover:bg-[#4064b2]
                  data-[active=true]:focus:bg-[#4064b2]
                `,
                prev: "w-8 h-8 [&>svg]:rotate-0",
                next: "w-8 h-8 [&>svg]:rotate-180",
              }}
            />
          </div>

          {/* 2) Itens por página: alinhado à direita */}
          <div className="flex justify-end px-1">
            <div className="flex items-center gap-2 text-[11px] text-foreground-500">
              <span>Itens por página:</span>

              <Dropdown placement="bottom-start" offset={6}>
                <DropdownTrigger>
                  <Button
                    variant="flat"
                    radius="lg"
                    className="
                      bg-[#27272A]
                      rounded-xl
                      py-1
                      min-w-[64px] h-7
                      text-[11px]
                      text-foreground
                      border border-white/10
                      flex items-center justify-between
                    "
                  >
                    {rowsPerPage}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-3 h-3 ml-1 text-foreground-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </Button>
                </DropdownTrigger>

                <DropdownMenu
                  aria-label="Itens por página"
                  className="
                    bg-[#18181B]
                    border border-white/10
                    rounded-xl
                    shadow-[0_18px_45px_rgba(0,0,0,0.65)]
                    p-1
                    w-[60px]
                  "
                  itemClasses={{
                    base: `
                      text-foreground text-xs
                      px-3 py-1.5
                      rounded-lg
                      data-[hover=true]:bg-white/10
                      cursor-pointer
                    `,
                  }}
                  onAction={(key) => {
                    const value = Number(key);
                    setRowsPerPage(value || 10);
                    setPage(1);
                  }}
                >
                  <DropdownItem key={10}>10</DropdownItem>
                  <DropdownItem key={25}>25</DropdownItem>
                  <DropdownItem key={50}>50</DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          </div>

          {/* 3) Texto da página: centralizado */}
          <div className="flex justify-center">
            <span className="text-[11px] text-foreground-500">
              {totalItems === 0
                ? "Nenhum registro"
                : `Página ${pageStart} a ${pageEnd} - Total de ${totalItems} registros`}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // =========================
  // DESKTOP/TABLET
  // =========================
  return (
    <div className="rounded-2xl overflow-hidden">
      <style jsx global>{`
        .usersTableContainer {
          container-type: inline-size;
        }

        .usersTableContainer .col-nome,
        .usersTableContainer .col-pagamento,
        .usersTableContainer .col-telefone,
        .usersTableContainer .col-valores,
        .usersTableContainer .col-email {
          display: table-cell;
        }

        @container (max-width: 1100px) {
          .usersTableContainer .col-email {
            display: none;
          }
        }
        @container (max-width: 980px) {
          .usersTableContainer .col-valores {
            display: none;
          }
        }
        @container (max-width: 860px) {
          .usersTableContainer .col-telefone {
            display: none;
          }
        }
        @container (max-width: 740px) {
          .usersTableContainer .col-pagamento {
            display: none;
          }
        }
        @container (max-width: 640px) {
          .usersTableContainer .col-nome {
            display: none;
          }
        }

        @container (min-width: 1101px) and (max-width: 1250px) {
          .usersTableContainer .cell-usuario {
            width: 84px !important;
          }
          .usersTableContainer .cell-nome {
            width: 160px !important;
          }
          .usersTableContainer .cell-plano {
            width: 78px !important;
          }
          .usersTableContainer .cell-pagamento {
            width: 110px !important;
          }

          .usersTableContainer .cell-usuario,
          .usersTableContainer .cell-nome,
          .usersTableContainer .cell-plano,
          .usersTableContainer .cell-pagamento {
            padding-left: 6px !important;
            padding-right: 6px !important;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .usersTableContainer .cell-plano span,
          .usersTableContainer .cell-pagamento span {
            padding-left: 0.5rem !important;
            padding-right: 0.5rem !important;
          }
        }

        /* bolinha azul que anda (cursor da paginação) */
        .ptv-pagination-hero [data-slot="cursor"] {
          background-color: #556ee6 !important;
          box-shadow: 0 0 18px rgba(85, 110, 230, 0.65) !important;
          border-radius: 9999px !important;
          transition: transform 0.3s ease, background-color 0.3s ease,
            box-shadow 0.3s ease !important;
        }

        /* garante que o número da página ativa fique preto por cima do cursor */
        .ptv-pagination-hero [data-slot="item"][data-active="true"] {
          color: #000 !important;
        }
      `}</style>

      <div className="w-full overflow-x-hidden usersTableContainer">
        <Table
          aria-label="Tabela de Usuários"
          removeWrapper
          isStriped
          classNames={{
            table: "min-w-full table-fixed border-separate border-spacing-y-2",
            thead: "bg-[#18181B]",
            tbody: "bg-transparent",
            tr: `
              data-[odd=true]:bg-[#27272A]
              data-[even=true]:bg-[#18181B]
              [&>td:first-child]:rounded-l-xl
              [&>td:last-child]:rounded-r-xl
            `,
            th: `
              text-[10px] md:text-[11px]
              font-semibold
              tracking-[0.14em]
              text-foreground-500
              uppercase
              text-left
              px-2 sm:px-2
              py-[0.65rem] sm:py-[0.8rem]
              bg-[#27272A]
              border-none
              whitespace-nowrap
            `,
            td: `
              text-[13px] md:text-sm
              text-foreground
              px-2 sm:px-2
              py-2.5 sm:py-3
              border-none
              align-middle
              whitespace-nowrap
            `,
          }}
        >
          <TableHeader>
            <TableColumn className={`${w.gestao} text-center`}>
              GESTÃO
            </TableColumn>
            <TableColumn className={`${w.usuario} cell-usuario`}>
              USUÁRIO
            </TableColumn>
            <TableColumn className={`${col.nome} cell-nome`}>NOME</TableColumn>
            <TableColumn className={w.vencimento}>VENCIMENTO</TableColumn>
            <TableColumn className={`${w.plano} cell-plano`}>PLANO</TableColumn>
            <TableColumn className={`${col.pagamento} cell-pagamento`}>
              PAGAMENTO
            </TableColumn>
            <TableColumn className={col.telefone}>TELEFONE</TableColumn>
            <TableColumn className={col.valores}>BRUTO / LÍQUIDO</TableColumn>
            <TableColumn className={col.email}>E-MAIL</TableColumn>
            <TableColumn className={`${w.acoes} text-left`}>AÇÕES</TableColumn>
          </TableHeader>

          <TableBody>
            {paginatedRows.map((u) => {
              const due = getDueInfo(u.dueDate);

              return (
                <TableRow key={u.id}>
                  <TableCell className="px-1 sm:px-1">
                    <div className="flex items-center justify-center">
                      <ManagePaymentsModal
                        client={u}
                        onUpdated={handleRowUpdated}
                        onUpdatePaymentStatus={handleUpdatePaymentStatus}
                      />
                    </div>
                  </TableCell>

                  <TableCell className={`${truncateText} cell-usuario`}>
                    {u.user?.username}
                  </TableCell>

                  <TableCell
                    className={`${col.nome} ${truncateName} cell-nome`}
                  >
                    {u.fullName}
                  </TableCell>

                  <TableCell>
                    <Tooltip
                      content={due.tooltip}
                      classNames={tipClass}
                      placement="top"
                    >
                      <span className={due.className}>
                        {new Date(u.dueDate).toLocaleDateString("pt-BR", {
                          timeZone: "UTC",
                        })}
                      </span>
                    </Tooltip>
                  </TableCell>

                  <TableCell className={`${truncateText} cell-plano`}>
                    <span className={getPlanPillClass(u.plan?.name)}>
                      {u.plan?.name}
                    </span>
                  </TableCell>

                  <TableCell
                    className={`${col.pagamento} ${truncateText} cell-pagamento`}
                  >
                    <span
                      className={getPaymentPillClass(u.paymentMethod?.name)}
                    >
                      {u.paymentMethod?.name}
                    </span>
                  </TableCell>

                  <TableCell className={`${col.telefone} ${truncateText}`}>
                    {u.phone ?? ""}
                  </TableCell>

                  <TableCell className={col.valores}>
                    {`R$ ${u.grossAmount} / R$ ${u.netAmount}`}
                  </TableCell>

                  <TableCell className={`${col.email} ${truncateEmail}`}>
                    {u.email}
                  </TableCell>

                  <TableCell className="px-1 sm:px-2">
                    <div className="flex items-center pr-1 overflow-visible">
                      <Tooltip
                        content="Detalhes"
                        classNames={tipClass}
                        placement="top"
                      >
                        <span className="inline-flex text-sky-700">
                          <ClientInfoPopover
                            client={u}
                            iconClassName="w-5 h-5"
                          />
                        </span>
                      </Tooltip>

                      <Tooltip
                        content="Renovar"
                        classNames={tipClass}
                        placement="top"
                      >
                        <span className="inline-flex text-amber-400">
                          <RenewClientModal
                            client={u}
                            onUpdated={handleRowUpdated}
                            iconClassName="w-5 h-5"
                          />
                        </span>
                      </Tooltip>

                      <Tooltip
                        content="Editar"
                        classNames={tipClass}
                        placement="top"
                      >
                        <span className="inline-flex text-emerald-400">
                          <EditClientModal
                            client={u}
                            onUpdated={handleRowUpdated}
                            iconClassName="w-5 h-5"
                          />
                        </span>
                      </Tooltip>

                      <Tooltip
                        content="Excluir"
                        classNames={tipClass}
                        placement="top"
                      >
                        <span className="inline-flex">
                          <DeleteClientModal
                            client={u}
                            onDeleted={handleRowDeleted}
                          />
                        </span>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Paginação DESKTOP/TABLET (layout igual referência) */}
      <div className="mt-4 space-y-2 px-1 sm:px-2">
        {/* 1) paginação centralizada ocupando a linha inteira */}
        <div className="flex justify-end">
          <div className="ptv-pagination-hero">
            <Pagination
              isCompact
              showControls
              total={totalPages}
              page={page}
              onChange={setPage}
              disableAnimation={false}
              disableCursorAnimation={false}
              showShadow
              classNames={{
                base: "gap-2",
                item: `
                  w-9 h-9
                  m-1
                  text-[13px]
                  bg-[#27272A]
                  rounded-xl
                  [&>button]:rounded-xl
                  data-[active=true]:bg-[#556EE6]
                  data-[active=true]:text-black
                  data-[active=true]:shadow-[0_0_10px_rgba(85,110,230,0.3)]
                  transition-[background-color,transform,box-shadow]
                  duration-300
                `,
                prev: "w-8 h-8 [&>svg]:rotate-0",
                next: "w-8 h-8 [&>svg]:rotate-180",
              }}
            />
          </div>
        </div>

        {/* 2) Itens por página: alinhado à direita, fonte maior em desktop */}
        <div className="flex justify-end">
          <div className="flex items-center gap-2 text-[11px] sm:text-[15px] text-foreground-500">
            <span>Itens por página:</span>

            <Dropdown placement="top-end" offset={6}>
              <DropdownTrigger>
                <Button
                  variant="flat"
                  radius="lg"
                  className="
                    bg-[#27272A]
                    rounded-xl
                    py-1
                    min-w-[64px] h-8
                    text-[11px] sm:text-[15px]
                    text-foreground
                    border border-white/10
                    flex items-center justify-between
                  "
                >
                  {rowsPerPage}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3 h-3 ml-1 text-foreground-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Button>
              </DropdownTrigger>

              <DropdownMenu
                aria-label="Itens por página"
                className="
                  bg-[#18181B]
                  border border-white/10
                  rounded-xl
                  shadow-[0_18px_45px_rgba(0,0,0,0.65)]
                  p-1
                  w-[60px]
                "
                itemClasses={{
                  base: `
                    text-foreground text-sm
                    px-3 py-2
                    rounded-lg
                    data-[hover=true]:bg-white/10
                    cursor-pointer
                  `,
                }}
                onAction={(key) => {
                  const value = Number(key);
                  setRowsPerPage(value || 10);
                  setPage(1);
                }}
              >
                <DropdownItem key={10}>10</DropdownItem>
                <DropdownItem key={25}>25</DropdownItem>
                <DropdownItem key={50}>50</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>

        {/* 3) Texto da página: centralizado, fonte maior em desktop */}
        <div className="flex justify-center">
          <span className="text-[11px] sm:text-[15px] text-foreground-500">
            {totalItems === 0
              ? "Nenhum registro"
              : `Página ${pageStart} a ${pageEnd} - Total de ${totalItems} registros`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default UsersTable;