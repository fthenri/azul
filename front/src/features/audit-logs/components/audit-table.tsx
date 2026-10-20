"use client";

import React, { useState, useMemo } from "react";
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
  ArrowUpDown,
  AlertTriangle,
  CheckCircle,
  Eye,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DecisaoAuditoria } from "@/types/api";
import { formatCurrency, formatDateTime } from "@/lib/formatters";

interface AuditTableProps {
  data?: DecisaoAuditoria[];
  isLoading: boolean;
  selectedDecisao: DecisaoAuditoria | null;
  onSelectDecisao: (d: DecisaoAuditoria) => void;
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
  const [statusFilter, setStatusFilter] = useState<"ALL" | "BLOQUEADAS" | "EXECUTADAS">("ALL");

  const filteredData = useMemo(() => {
    if (statusFilter === "ALL") return data;
    if (statusFilter === "BLOQUEADAS") {
      return data.filter(
        (d) =>
          d.motivo_bloqueio !== null ||
          d.acao_executada.toLowerCase().includes("bloqueada") ||
          d.acao_executada.toLowerCase().includes("não agir")
      );
    }
    return data.filter(
      (d) =>
        !d.motivo_bloqueio &&
        !d.acao_executada.toLowerCase().includes("bloqueada") &&
        !d.acao_executada.toLowerCase().includes("não agir")
    );
  }, [data, statusFilter]);

  const columns = useMemo<ColumnDef<DecisaoAuditoria>[]>(
    () => [
      {
        accessorKey: "decisao_id",
        header: "ID Decisão",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-foreground">
            {row.original.decisao_id}
          </span>
        ),
      },
      {
        accessorKey: "cliente_id",
        header: "Cliente",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.cliente_id}
          </span>
        ),
      },
      {
        accessorKey: "data_decisao",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 font-semibold uppercase text-[11px] hover:text-foreground"
          >
            <span>Data / Hora</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDateTime(row.original.data_decisao)}
          </span>
        ),
      },
      {
        accessorKey: "tipo_simulacao",
        header: "Tipo",
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.tipo_simulacao.toLowerCase() === "reativa"
                ? "destructive"
                : "secondary"
            }
            className="text-[10px] px-2 py-0"
          >
            {row.original.tipo_simulacao}
          </Badge>
        ),
      },
      {
        accessorKey: "acao_executada",
        header: "Ação Arbitrada",
        cell: ({ row }) => {
          const isBloqueada = !!row.original.motivo_bloqueio;
          return (
            <div className="flex flex-col">
              <span className="font-semibold text-xs text-foreground">
                {row.original.acao_executada}
              </span>
              {isBloqueada && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium line-clamp-1">
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
            className="flex items-center gap-1 font-semibold uppercase text-[11px] hover:text-foreground ml-auto"
          >
            <span>Custo Realizado</span>
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <div className="text-right font-medium text-xs text-foreground">
            {formatCurrency(row.original.custo_realizado)}
          </div>
        ),
      },
      {
        id: "status_bloqueio",
        header: "Status",
        cell: ({ row }) => {
          const isBloqueada = !!row.original.motivo_bloqueio;
          return (
            <div className="flex justify-center">
              {isBloqueada ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">Bloqueado</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">Executado</span>
                </span>
              )}
            </div>
          );
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
            className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            <span>Detalhes</span>
          </Button>
        ),
      },
    ],
    [onSelectDecisao]
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
        pageSize: 6,
      },
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">
              Histórico de Decisões & Auditoria
            </CardTitle>
            <CardDescription className="text-xs">
              Rastreabilidade completa de todas as decisões tomadas pelo motor, incluindo bloqueios de 72h
            </CardDescription>
          </div>

          {/* Filtros e Busca */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar decisão ou cliente..."
                value={globalFilter ?? ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="h-8 w-44 sm:w-56 rounded-md border border-input pl-8 pr-3 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center rounded-md border border-input bg-card p-0.5 text-xs">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  statusFilter === "ALL"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Todas ({data.length})
              </button>
              <button
                onClick={() => setStatusFilter("BLOQUEADAS")}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  statusFilter === "BLOQUEADAS"
                    ? "bg-amber-500 text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Bloqueios
              </button>
              <button
                onClick={() => setStatusFilter("EXECUTADAS")}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  statusFilter === "EXECUTADAS"
                    ? "bg-emerald-600 text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Executadas
              </button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold border-b">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="py-3 px-3">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => {
                  const isSelected = selectedDecisao?.decisao_id === row.original.decisao_id;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => onSelectDecisao(row.original)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-blue-50/70 dark:bg-blue-950/30"
                          : "hover:bg-muted/30"
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="py-2.5 px-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    Nenhum registro de decisão encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="flex items-center justify-between pt-4 text-xs text-muted-foreground">
          <span>
            Página {table.getState().pagination.pageIndex + 1} de{" "}
            {Math.max(1, table.getPageCount())} ({filteredData.length} registros)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 px-2.5"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Anterior</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 px-2.5"
            >
              <span>Próxima</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
