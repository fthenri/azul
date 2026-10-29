"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Plane,
  AlertTriangle,
  Crown,
  Users,
  Search,
  RefreshCw,
  ArrowRight,
  Clock,
  Sparkles,
  Database,
  ShieldAlert,
  ArrowUpRight,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useDemoMode } from "@/components/providers/demo-mode-context";
import { DEMO_MALHA_VOOS } from "@/lib/demo-data";
import { ListaVoosResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function FlightsGrid() {
  const { isDemoMode } = useDemoMode();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"todos" | "criticos" | "vips">("todos");

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<ListaVoosResponse, Error>({
    queryKey: ["scheduled-flights", isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        return DEMO_MALHA_VOOS;
      }
      return api.getFlights(50);
    },
    staleTime: 1000 * 30, // 30 segundos
  });

  const flights = useMemo(() => data?.voos || [], [data?.voos]);

  // Métricas agregadas de cabeçalho
  const metrics = useMemo(() => {
    let totalPax = 0;
    let totalCriticos = 0;
    let totalVips = 0;
    let totalPnrs = 0;

    flights.forEach((f) => {
      totalPax += f.total_passageiros;
      totalCriticos += f.passageiros_criticos;
      totalVips += f.passageiros_vip;
      totalPnrs += f.total_pnrs;
    });

    return {
      totalVoos: flights.length,
      totalPax,
      totalCriticos,
      totalVips,
      totalPnrs,
    };
  }, [flights]);

  const totalCriticosFlights = useMemo(
    () => flights.filter((f) => f.passageiros_criticos > 0).length,
    [flights]
  );
  const totalVipsFlights = useMemo(
    () => flights.filter((f) => f.passageiros_vip > 0).length,
    [flights]
  );

  // Filtragem e busca
  const filteredFlights = useMemo(() => {
    return flights.filter((f) => {
      const matchSearch =
        f.numero_voo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.origem.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.destino.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.rota.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.id.includes(searchTerm);

      if (!matchSearch) return false;

      if (selectedFilter === "criticos") {
        return f.passageiros_criticos > 0;
      }
      if (selectedFilter === "vips") {
        return f.passageiros_vip > 0;
      }

      return true;
    });
  }, [flights, searchTerm, selectedFilter]);

  const kpis = [
    {
      title: "Voos na Malha",
      value: String(metrics.totalVoos),
      description: "Rotas comerciais ativas monitoradas em tempo real com DuckDB",
      icon: Plane,
      iconColor: "text-primary",
      iconBg: "bg-primary/10 border-primary/20",
      tooltip: "Total de voos comerciais programados ativos na camada Gold do Data Lake.",
      metricPill: "Malha em Operação",
      footerAction: "Ver Rotas",
      highlightBeam: "via-primary/40",
      accentGlow: "from-primary/15 to-transparent",
      isSpecial: false,
    },
    {
      title: "Passageiros",
      value: metrics.totalPax.toLocaleString("pt-BR"),
      description: `Alocados em ${metrics.totalPnrs} reservas (PNR) com agrupamento familiar`,
      icon: Users,
      iconColor: "text-sky-500 dark:text-sky-400",
      iconBg: "bg-sky-500/10 border-sky-500/20",
      tooltip: "Passageiros mapeados com histórico de fidelidade e agrupamento contíguo por PNR.",
      metricPill: "Agrupamento Familiar",
      footerAction: "Explorar PNRs",
      highlightBeam: "via-sky-400",
      accentGlow: "from-sky-500/15 to-transparent",
      isSpecial: false,
    },
    {
      title: "Risco Crítico (Evasão)",
      value: String(metrics.totalCriticos),
      description: "Atrito operacional elevado ou Churn > 60% elegíveis a ações de cabine",
      icon: ShieldAlert,
      iconColor: "text-rose-600 dark:text-rose-400",
      iconBg: "bg-rose-500/15 border-rose-500/30",
      tooltip: "Passageiros prioritários que sofreram atritos recentes com alto potencial de evasão.",
      metricPill: "Prioridade Imediata",
      footerAction: "Intervir",
      highlightBeam: "via-rose-500",
      accentGlow: "from-rose-500/20 to-transparent",
      isSpecial: true,
      cardStyle: "border-rose-500/40 bg-gradient-to-br from-card via-card to-rose-500/5 shadow-md hover:border-rose-500/60",
      valueColor: "text-rose-600 dark:text-rose-400",
      badgeText: "Atenção Crítica",
    },
    {
      title: "Alto Valor (Tiers)",
      value: String(metrics.totalVips),
      description: "Diamante & Safira responsáveis pela maior fatia de receita recorrente",
      icon: Crown,
      iconColor: "text-indigo-600 dark:text-indigo-400",
      iconBg: "bg-indigo-500/10 border-indigo-500/20",
      tooltip: "Clientes categorizados no topo do princípio de Pareto da Azul Fidelidade.",
      metricPill: "Top Pareto Fidelidade",
      footerAction: "Auditar",
      highlightBeam: "via-indigo-500",
      accentGlow: "from-indigo-500/20 to-transparent",
      isSpecial: true,
      cardStyle: "border-indigo-500/40 bg-gradient-to-br from-card via-card to-indigo-500/5 shadow-md hover:border-indigo-500/60",
      valueColor: "text-indigo-600 dark:text-indigo-400",
      badgeText: "Top Pareto",
    },
  ];

  return (
    <div className="relative space-y-7 selection:bg-primary/30 selection:text-primary">
      {/* ─────────────────────────────────────────────────────────────
          ELEMENTO ATMOSFÉRICO DE PROFUNDIDADE (AERO GLOW SUTIL)
         ───────────────────────────────────────────────────────────── */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-full max-w-5xl h-64 bg-primary/5 blur-[120px] pointer-events-none -z-10 rounded-full" />

      {/* ─────────────────────────────────────────────────────────────
          HEADER DA TELA
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-2 border-b border-border/80">
        <div>
          {/* Micro-badge de Ecossistema */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold tracking-wide shadow-xs mb-2">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Ecossistema Azul Fidelidade • Operações On-Board</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
              Malha Aérea Comercial
            </h1>
            <span className="rounded-full bg-secondary border border-border text-secondary-foreground text-[11px] font-bold px-3 py-0.5">
              DuckDB Real
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            pulso: Selecione um voo programado para inspecionar mapa de assentos, atrito e ações recomendadas de cabine
          </p>
        </div>

        {/* Controles de Atualização & Badges de Governança */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/80 border border-border text-xs text-muted-foreground shadow-xs">
            <Database className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-medium">Camada Gold (DuckDB)</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 rounded-xl border-border bg-card/80 hover:bg-muted text-foreground text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-primary", isFetching && "animate-spin")} />
            <span>Atualizar Malha</span>
          </Button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          KPI CARDS DA MALHA (IDENTIDADE PULSO DASHBOARD COM GLOW)
         ───────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="relative rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-9 rounded-xl" />
              </div>
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            const isSpecial = kpi.isSpecial;

            return (
              <div
                key={kpi.title}
                className={cn(
                  "group relative rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col justify-between",
                  kpi.cardStyle ||
                    "border-border/80 bg-card/80 backdrop-blur-xl shadow-xs hover:border-primary/30 hover:shadow-sm"
                )}
              >
                {/* Faixa de Luz Superior em Gradiente (Luminous Edge Highlight) */}
                <div
                  className={cn(
                    "absolute inset-x-6 top-0 h-[1.5px] bg-gradient-to-r from-transparent to-transparent opacity-85 group-hover:opacity-100 transition-opacity",
                    kpi.highlightBeam || "via-primary/30"
                  )}
                />

                {/* Glow sutil de fundo */}
                {kpi.accentGlow && (
                  <div
                    className={cn(
                      "absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl blur-2xl rounded-full pointer-events-none",
                      kpi.accentGlow
                    )}
                  />
                )}

                <div className="relative p-5 flex flex-col justify-between h-full space-y-3">
                  {/* Cabeçalho do Card */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      {kpi.title}
                      <InfoTooltip
                        text={kpi.tooltip}
                        title={kpi.title}
                        badge={isSpecial ? "Crítico" : "Malha"}
                        side="bottom"
                      />
                    </span>

                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-105",
                        kpi.iconBg,
                        kpi.iconColor
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Valor Principal */}
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2.5 flex-wrap">
                      <span
                        className={cn(
                          "text-2xl sm:text-[27px] font-black tracking-tight font-sans",
                          kpi.valueColor || "text-foreground"
                        )}
                      >
                        {kpi.value}
                      </span>

                      {kpi.badgeText && (
                        <Badge className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 shadow-xs inline-flex items-center gap-1">
                          <Sparkles className="h-2.5 w-2.5" />
                          <span>{kpi.badgeText}</span>
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {kpi.description}
                    </p>
                  </div>

                  {/* Rodapé / Micro-pill de Indicador */}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/40">
                      {kpi.metricPill}
                    </span>

                    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                      <span>{kpi.footerAction}</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          BARRA DE FILTROS E BUSCA (IDENTIDADE PULSO DASHBOARD)
         ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl p-3.5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar voo, rota (ex: 6002, SBSP, SBFI)..."
            className="w-full h-10 pl-9 pr-8 text-xs rounded-xl border border-input bg-background/80 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 transition-all shadow-inner"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs text-muted-foreground mr-1 hidden sm:inline font-medium">
            Filtrar:
          </span>
          <Button
            variant={selectedFilter === "todos" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFilter("todos")}
            className={cn(
              "text-xs h-9 rounded-xl font-semibold transition-all cursor-pointer",
              selectedFilter === "todos"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border-border hover:bg-muted text-foreground"
            )}
          >
            Todos ({flights.length})
          </Button>
          <Button
            variant={selectedFilter === "criticos" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFilter("criticos")}
            className={cn(
              "text-xs h-9 rounded-xl font-semibold transition-all cursor-pointer",
              selectedFilter === "criticos"
                ? "bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                : "border-border hover:bg-muted text-foreground"
            )}
          >
            Com Críticos ({totalCriticosFlights})
          </Button>
          <Button
            variant={selectedFilter === "vips" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFilter("vips")}
            className={cn(
              "text-xs h-9 rounded-xl font-semibold transition-all cursor-pointer",
              selectedFilter === "vips"
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                : "border-border hover:bg-muted text-foreground"
            )}
          >
            Diamante / Safira ({totalVipsFlights})
          </Button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TABELA DE VOOS (ESTILO LIQUID GLASS PULSO COM LUMINOUS EDGE)
         ───────────────────────────────────────────────────────────── */}
      <div className="group relative rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
        {/* Feixe Superior Luminous Edge Highlight */}
        <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/60 text-secondary-foreground uppercase text-[10px] font-bold tracking-wider border-b border-border/70">
              <TableRow className="hover:bg-transparent border-border/70">
                <TableHead className="py-3.5 px-4 font-bold text-[10px]">Voo</TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-[10px]">Rota</TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-[10px]">Partida Prevista</TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-[10px]">Ocupação</TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-[10px] text-center">Críticos</TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-[10px] text-center">Diamante / Safira</TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-[10px]">Pontualidade</TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-[10px]">Status</TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-[10px] text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-40 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-xs font-medium">Carregando malha aérea do DuckDB...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-40 text-center text-rose-600">
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <AlertTriangle className="h-6 w-6 text-rose-500" />
                      <span className="text-xs font-semibold">
                        Erro ao carregar malha aérea: {error?.message}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refetch()}
                        className="text-xs rounded-xl mt-1 cursor-pointer"
                      >
                        Tentar Novamente
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredFlights.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground text-xs">
                    Nenhum voo encontrado com os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredFlights.map((flight) => (
                  <TableRow
                    key={flight.id}
                    className="hover:bg-muted/40 transition-colors duration-150"
                  >
                    {/* Número do Voo */}
                    <TableCell className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                          <Plane className="h-4 w-4" />
                        </div>
                        <span className="font-sans font-black text-sm text-foreground tracking-tight">
                          {flight.numero_voo}
                        </span>
                      </div>
                    </TableCell>

                    {/* Rota */}
                    <TableCell className="py-3.5 px-4 text-xs">
                      <div className="font-bold text-foreground flex items-center gap-1.5">
                        <span>{flight.rota}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {flight.origem} ➔ {flight.destino}
                      </div>
                    </TableCell>

                    {/* Horário */}
                    <TableCell className="py-3.5 px-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Clock className="h-3.5 w-3.5 opacity-60 text-primary" />
                        <span>{flight.partida_prevista.replace("T", " ")}</span>
                      </div>
                    </TableCell>

                    {/* Ocupação */}
                    <TableCell className="py-3.5 px-4 text-xs">
                      <div className="font-bold text-foreground">
                        {flight.total_passageiros} passageiros
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3 opacity-60" />
                        <span>{flight.total_pnrs} PNRs</span>
                      </div>
                    </TableCell>

                    {/* Críticos */}
                    <TableCell className="py-3.5 px-4 text-center">
                      {flight.passageiros_criticos > 0 ? (
                        <Badge
                          variant="destructive"
                          className="font-sans font-black text-xs px-2.5 py-0.5 rounded-md shadow-xs"
                        >
                          {flight.passageiros_criticos}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground opacity-40">-</span>
                      )}
                    </TableCell>

                    {/* VIPs */}
                    <TableCell className="py-3.5 px-4 text-center">
                      {flight.passageiros_vip > 0 ? (
                        <Badge className="bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-300 font-sans font-black text-xs px-2.5 py-0.5 rounded-md shadow-xs">
                          {flight.passageiros_vip}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground opacity-40">-</span>
                      )}
                    </TableCell>

                    {/* Atraso Médio */}
                    <TableCell className="py-3.5 px-4 text-xs font-mono">
                      {flight.atraso_medio_minutos >= 5 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                          +{Math.round(flight.atraso_medio_minutos)} min
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          Pontual
                        </span>
                      )}
                    </TableCell>

                    {/* Status Operacional */}
                    <TableCell className="py-3.5 px-4">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md",
                          flight.status_operacional === "A EMBARCAR"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800"
                            : flight.status_operacional === "PROGRAMADO"
                            ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-800"
                            : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {flight.status_operacional}
                      </Badge>
                    </TableCell>

                    {/* Ação */}
                    <TableCell className="py-3.5 px-4 text-right">
                      <Link href={`/dashboard/flights/${flight.id}`}>
                        <Button
                          size="sm"
                          className="text-xs h-8 px-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xs active:scale-[0.98] transition-all gap-1.5 cursor-pointer"
                        >
                          <span>Analisar Voo</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
