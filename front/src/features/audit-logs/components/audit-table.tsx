"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from "@tanstack/react-table";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Crown,
  Plane,
  Zap,
  Layers,
  Scale,
  ShieldAlert,
  Download,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  Copy,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedTabs, type TabItem } from "@/components/ui/animated-tabs";
import { DecisaoAuditoria } from "@/types/api";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import {
  getClientAuditInfo,
  getAuditStatusCategory,
  exportAuditLogsToCsv,
  exportAuditLogsToJson,
  AuditStatusCategory,
} from "../lib/audit-helpers";

interface AuditTableProps {
  data?: DecisaoAuditoria[];
  isLoading: boolean;
  selectedDecisao: DecisaoAuditoria | null;
  onSelectDecisao: (d: DecisaoAuditoria) => void;
}

type FilterCategory =
  | "all"
  | "executadas"
  | "bloqueios_uplift"
  | "bloqueios_lgpd"
  | "reativa"
  | "proativa";

function getPaginationRange(current: number, total: number): (number | string)[] {
  if (total <= 6) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, 4, "...", total];
  }
  if (current >= total - 2) {
    return [1, "...", total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

function formatShortDateTime(isoString: string): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const dateStr = d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
    const timeStr = d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dateStr} ${timeStr}`;
  } catch {
    return isoString;
  }
}

export function AuditTable({
  data = [],
  isLoading,
  selectedDecisao,
  onSelectDecisao,
}: AuditTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "data_decisao", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const counts = useMemo(() => {
    return {
      all: data.length,
      executadas: data.filter((d) => getAuditStatusCategory(d) === "EXECUTADA").length,
      bloqueios_uplift: data.filter(
        (d) =>
          getAuditStatusCategory(d) === "BLOQUEIO_UPLIFT" ||
          getAuditStatusCategory(d) === "BLOQUEIO_REDUNDANCIA"
      ).length,
      bloqueios_lgpd: data.filter((d) => getAuditStatusCategory(d) === "BLOQUEIO_LGPD").length,
      reativa: data.filter((d) => d.tipo_simulacao.toLowerCase() === "reativa").length,
      proativa: data.filter((d) => d.tipo_simulacao.toLowerCase() === "proativa").length,
    };
  }, [data]);

  const auditTabs = useMemo<TabItem<FilterCategory>[]>(
    () => [
      {
        id: "all",
        label: "Todos",
        icon: Layers,
        badge: counts.all,
      },
      {
        id: "executadas",
        label: "Concedidas",
        icon: CheckCircle2,
        badge: counts.executadas,
        activeBadgeClassName: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
      },
      {
        id: "bloqueios_uplift",
        label: "Trava ROI",
        icon: Scale,
        badge: counts.bloqueios_uplift,
        activeBadgeClassName: "bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30",
      },
      {
        id: "bloqueios_lgpd",
        label: "Janela 72h",
        icon: ShieldAlert,
        badge: counts.bloqueios_lgpd,
        activeBadgeClassName: "bg-sky-500/20 text-sky-600 dark:text-sky-300 border-sky-500/30",
      },
      {
        id: "reativa",
        label: "Atritos",
        icon: Plane,
        badge: counts.reativa,
        activeBadgeClassName: "bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/30",
      },
      {
        id: "proativa",
        label: "Preditivas",
        icon: Zap,
        badge: counts.proativa,
        activeBadgeClassName: "bg-primary/20 text-primary border-primary/30",
      },
    ],
    [counts]
  );

  const filteredData = useMemo(() => {
    return data.filter((d) => {
      const client = getClientAuditInfo(d.cliente_id);
      const searchLower = globalFilter.toLowerCase();
      const matchesSearch =
        d.decisao_id.toLowerCase().includes(searchLower) ||
        d.cliente_id.toLowerCase().includes(searchLower) ||
        client.nome.toLowerCase().includes(searchLower) ||
        d.acao_executada.toLowerCase().includes(searchLower) ||
        (d.motivo_bloqueio && d.motivo_bloqueio.toLowerCase().includes(searchLower)) ||
        (client.voo && client.voo.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;

      const status = getAuditStatusCategory(d);
      switch (activeFilter) {
        case "executadas":
          return status === "EXECUTADA";
        case "bloqueios_uplift":
          return status === "BLOQUEIO_UPLIFT" || status === "BLOQUEIO_REDUNDANCIA";
        case "bloqueios_lgpd":
          return status === "BLOQUEIO_LGPD";
        case "reativa":
          return d.tipo_simulacao.toLowerCase() === "reativa";
        case "proativa":
          return d.tipo_simulacao.toLowerCase() === "proativa";
        default:
          return true;
      }
    });
  }, [data, globalFilter, activeFilter]);

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const columns = useMemo<ColumnDef<DecisaoAuditoria>[]>(
    () => [
      {
        accessorKey: "decisao_id",
        header: "ID Decisão",
        cell: ({ row }) => {
          const isCopied = copiedId === row.original.decisao_id;
          return (
            <div className="flex items-center gap-1 whitespace-nowrap">
              <span className="font-mono text-xs font-black text-primary">
                {row.original.decisao_id}
              </span>
              <button
                type="button"
                onClick={(e) => handleCopyId(row.original.decisao_id, e)}
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded cursor-pointer"
                title="Copiar ID da Decisão"
              >
                {isCopied ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
          );
        },
      },
      {
        accessorKey: "cliente_id",
        header: "Passageiro",
        cell: ({ row }) => {
          const client = getClientAuditInfo(row.original.cliente_id);
          const tierClasses = (() => {
            switch (client.tier) {
              case "Diamante":
                return "bg-azul-navy-dark text-sky-200 border-sky-400/50";
              case "Safira":
                return "bg-blue-900 text-blue-200 border-blue-400/40";
              case "Topázio":
                return "bg-amber-900 text-amber-200 border-amber-400/40";
              default:
                return "bg-slate-800 text-slate-300 border-slate-700";
            }
          })();

          return (
            <div className="flex flex-col space-y-0.5 max-w-[140px]">
              <div className="flex items-center gap-1">
                <span className="font-bold text-xs text-foreground truncate" title={client.nome}>
                  {client.nome}
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.2 rounded border shrink-0 ${tierClasses}`}
                >
                  <Crown className="h-2 w-2" />
                  <span>{client.tier}</span>
                </span>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground truncate">
                #{row.original.cliente_id} {client.voo ? `• ${client.voo}` : ""}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "data_decisao",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 font-bold uppercase text-[11px] text-foreground hover:text-primary cursor-pointer whitespace-nowrap"
          >
            <span>Data / Hora</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-[11px] text-muted-foreground whitespace-nowrap font-mono">
            {formatShortDateTime(row.original.data_decisao)}
          </span>
        ),
      },
      {
        accessorKey: "tipo_simulacao",
        header: "Gatilho",
        cell: ({ row }) => {
          const isReativo = row.original.tipo_simulacao.toLowerCase() === "reativa";
          return (
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${
                isReativo
                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/25"
                  : "bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/25"
              }`}
            >
              {isReativo ? (
                <span className="relative flex h-1.5 w-1.5 mr-0.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                </span>
              ) : (
                <Zap className="h-2.5 w-2.5" />
              )}
              <span>{row.original.tipo_simulacao}</span>
            </span>
          );
        },
      },
      {
        accessorKey: "acao_executada",
        header: "Ação Arbitrada",
        cell: ({ row }) => {
          return (
            <div className="flex flex-col max-w-[190px]">
              <span className="font-bold text-xs text-foreground truncate" title={row.original.acao_executada}>
                {row.original.acao_executada}
              </span>
              {row.original.motivo_bloqueio && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium truncate mt-0.5" title={row.original.motivo_bloqueio}>
                  {row.original.motivo_bloqueio}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "custo_realizado",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 font-bold uppercase text-[11px] text-foreground hover:text-primary ml-auto cursor-pointer whitespace-nowrap"
          >
            <span>Custo Real</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <div className="text-right font-mono font-bold text-xs text-foreground whitespace-nowrap">
            {formatCurrency(row.original.custo_realizado)}
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = getAuditStatusCategory(row.original);
          switch (status) {
            case "EXECUTADA":
              return (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Concedida</span>
                </span>
              );
            case "BLOQUEIO_LGPD":
              return (
                <span className="inline-flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 font-semibold whitespace-nowrap">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                  <span>Silêncio 72h</span>
                </span>
              );
            case "BLOQUEIO_REDUNDANCIA":
              return (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-semibold whitespace-nowrap">
                  <Crown className="h-3.5 w-3.5 shrink-0" />
                  <span>Redundância</span>
                </span>
              );
            default:
              return (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-semibold whitespace-nowrap">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>Trava ROI</span>
                </span>
              );
          }
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onSelectDecisao(row.original);
            }}
            className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 rounded-lg cursor-pointer flex items-center gap-1 ml-auto whitespace-nowrap"
            title="Abrir Dossiê & Gráfico SHAP"
          >
            <Eye className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Dossiê</span>
          </Button>
        ),
      },
    ],
    [onSelectDecisao, copiedId]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const currentPage = table.getState().pagination.pageIndex + 1;
  const totalPages = Math.max(1, table.getPageCount());
  const paginationRange = useMemo(
    () => getPaginationRange(currentPage, totalPages),
    [currentPage, totalPages]
  );

  if (isLoading) {
    return (
      <Card className="bg-card border-border shadow-xs rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-64 rounded-xl" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border border-border/80 bg-card/85 backdrop-blur-md shadow-xs overflow-hidden divide-y divide-border/60">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER INTEGRADO: TÍTULO, CONTADOR, BUSCA E EXPORTAÇÕES
         ───────────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base font-black tracking-tight text-foreground">
                Trilha Histórica de Decisões
              </CardTitle>
              <Badge
                variant="outline"
                className="text-xs font-bold text-primary border-primary/25 bg-primary/10"
              >
                {filteredData.length} de {data.length} registros
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Clique em qualquer linha para abrir o dossiê regulatório com gráfico SHAP e linhagem MLOps
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Campo de Busca */}
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar decisão, cliente, voo..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-background/80 border border-border/80 placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          {/* Botões de Exportação Regulatória */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportAuditLogsToCsv(data)}
              className="h-8 px-2.5 rounded-xl border-border/80 bg-card hover:bg-muted text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Exportar registros em formato CSV"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">CSV</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => exportAuditLogsToJson(data)}
              className="h-8 px-2.5 rounded-xl border-border/80 bg-card hover:bg-muted text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Exportar pacote completo de auditoria em JSON"
            >
              <FileCode className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              <span className="hidden sm:inline">JSON</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. BARRA DE FILTROS ANIMADA INTEGRADA (SEM SCROLL HORIZONTAL)
         ───────────────────────────────────────────────────────────── */}
      <div className="px-4 py-2 bg-muted/20">
        <AnimatedTabs<FilterCategory>
          tabs={auditTabs}
          activeTab={activeFilter}
          onChange={setActiveFilter}
          size="sm"
          containerClassName="p-1 rounded-xl"
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. TABELA MASTER COM DESIGN AÉREO
         ───────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-secondary/50 text-secondary-foreground uppercase text-[11px] font-bold border-b border-border/70">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="py-2.5 px-2.5">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border/60">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const isSelected = selectedDecisao?.decisao_id === row.original.decisao_id;
                return (
                  <tr
                    key={row.id}
                    onClick={() => onSelectDecisao(row.original)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-primary/[0.08] dark:bg-primary/[0.15] font-semibold"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="py-2.5 px-2.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-28 text-center text-muted-foreground text-xs"
                >
                  Nenhum registro de auditoria encontrado para os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. BARRA DE PAGINAÇÃO INTEGRADA
         ───────────────────────────────────────────────────────────── */}
      <div className="p-3 border-t border-border/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/20">
        <div className="text-xs text-muted-foreground">
          Exibindo{" "}
          <strong className="text-foreground font-mono">
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}–
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              filteredData.length
            )}
          </strong>{" "}
          de <strong className="text-foreground font-mono">{filteredData.length}</strong> registros
        </div>

        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="h-8 w-8 p-0 rounded-full border-border/70 hover:bg-muted disabled:opacity-25 cursor-pointer hidden sm:flex items-center justify-center"
            title="Primeira Página"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-8 px-3 rounded-full border-border/70 hover:bg-muted disabled:opacity-25 cursor-pointer flex items-center gap-1 text-xs font-semibold"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Anterior</span>
          </Button>

          <div className="flex items-center gap-1 mx-0.5 p-0.5 rounded-full bg-muted/40 border border-border/60">
            {paginationRange.map((page, idx) => {
              if (page === "...") {
                return (
                  <span
                    key={`dots-${idx}`}
                    className="px-1.5 text-xs text-muted-foreground font-mono"
                  >
                    ...
                  </span>
                );
              }
              const pageNum = Number(page);
              const isActive = pageNum === currentPage;
              return (
                <button
                  key={`page-${pageNum}`}
                  type="button"
                  onClick={() => table.setPageIndex(pageNum - 1)}
                  className={`h-7 w-7 rounded-full font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs scale-105"
                      : "text-muted-foreground hover:bg-background/80 hover:text-foreground"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-8 px-3 rounded-full border-border/70 hover:bg-muted disabled:opacity-25 cursor-pointer flex items-center gap-1 text-xs font-semibold"
          >
            <span className="hidden xs:inline">Próxima</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(totalPages - 1)}
            disabled={!table.getCanNextPage()}
            className="h-8 w-8 p-0 rounded-full border-border/70 hover:bg-muted disabled:opacity-25 cursor-pointer hidden sm:flex items-center justify-center"
            title="Última Página"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-muted-foreground">
          <span className="hidden md:inline text-[11px] font-medium">Linhas:</span>
          <div className="flex items-center rounded-full border border-border/70 bg-background/60 p-0.5 shadow-xs">
            {[10, 25, 50].map((size) => (
              <button
                key={`density-${size}`}
                type="button"
                onClick={() => table.setPageSize(size)}
                className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold transition-all cursor-pointer ${
                  table.getState().pagination.pageSize === size
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
