"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Clock,
  Zap,
  Search,
  Flame,
  AlertCircle,
  Luggage,
  Plane,
  AlertTriangle,
  Crown,
  Sparkles,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Momento } from "@/types/api";
import { formatCurrency, formatPercent } from "@/lib/formatters";

interface MomentsQueueProps {
  momentos?: Momento[];
  isLoading: boolean;
  selectedMomento: Momento | null;
  onSelectMomento: (m: Momento) => void;
}

type FilterCategory = "all" | "reativa" | "proativa" | "critico" | "alto_clv";

function inferTier(momento: Momento): {
  label: string;
  color: string;
  border: string;
  bg: string;
} {
  const p = momento.persona.toLowerCase();
  const clv = momento.clv_previsto;

  if (p.includes("executivo") || clv >= 8000) {
    return {
      label: "Diamante",
      color: "text-sky-200 dark:text-sky-300",
      border: "border-sky-400/50 dark:border-sky-400/60",
      bg: "bg-gradient-to-r from-azul-navy-dark to-azul-navy dark:from-sky-950 dark:to-azul-navy-dark",
    };
  }
  if (p.includes("premium") || clv >= 5000) {
    return {
      label: "Safira",
      color: "text-blue-100 dark:text-blue-200",
      border: "border-blue-400/40 dark:border-blue-400/50",
      bg: "bg-gradient-to-r from-blue-900 to-blue-800 dark:from-blue-950 dark:to-blue-900",
    };
  }
  if (clv >= 3000) {
    return {
      label: "Topázio",
      color: "text-amber-100 dark:text-amber-200",
      border: "border-amber-400/40 dark:border-amber-400/50",
      bg: "bg-gradient-to-r from-amber-900 to-amber-800 dark:from-amber-950 dark:to-amber-900",
    };
  }
  return {
    label: "Básico",
    color: "text-slate-700 dark:text-slate-300",
    border: "border-slate-300 dark:border-slate-700",
    bg: "bg-slate-100 dark:bg-slate-800/80",
  };
}

function parseFlightDetails(descricao: string): { voo: string | null; rota: string | null } {
  const flightMatch = descricao.match(/voo\s+([A-Z0-9]+)/i);
  const routeMatch = descricao.match(/\(([A-Z]{3})\s*(?:->|➔)\s*([A-Z]{3})\)/i);

  return {
    voo: flightMatch ? flightMatch[1].toUpperCase() : null,
    rota: routeMatch ? `${routeMatch[1]} ➔ ${routeMatch[2]}` : null,
  };
}

// Gera números de página com elipses inteligentes
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

export function MomentsQueue({
  momentos = [],
  isLoading,
  selectedMomento,
  onSelectMomento,
}: MomentsQueueProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9); // Padrão equilibrado 3x3

  // Resetar página ao alterar filtros ou busca
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilter, itemsPerPage]);

  const counts = useMemo(() => {
    return {
      all: momentos.length,
      reativa: momentos.filter((m) => m.tipo_simulacao.toLowerCase() === "reativa").length,
      critico: momentos.filter((m) => m.risco_evasao_atual >= 0.7).length,
      proativa: momentos.filter((m) => m.tipo_simulacao.toLowerCase() === "proativa").length,
      alto_clv: momentos.filter((m) => m.clv_previsto >= 5000).length,
    };
  }, [momentos]);

  const filteredMomentos = useMemo(() => {
    return momentos.filter((m) => {
      const matchesSearch =
        m.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.cliente_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.persona.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.id.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      switch (activeFilter) {
        case "reativa":
          return m.tipo_simulacao.toLowerCase() === "reativa";
        case "proativa":
          return m.tipo_simulacao.toLowerCase() === "proativa";
        case "critico":
          return m.risco_evasao_atual >= 0.7;
        case "alto_clv":
          return m.clv_previsto >= 5000;
        default:
          return true;
      }
    });
  }, [momentos, searchTerm, activeFilter]);

  // Cálculos de Paginação
  const totalItems = filteredMomentos.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  const paginatedMomentos = useMemo(() => {
    return filteredMomentos.slice(startIndex, endIndex);
  }, [filteredMomentos, startIndex, endIndex]);

  const handleSelectMostCritical = () => {
    if (!momentos || momentos.length === 0) return;
    const sorted = [...momentos].sort(
      (a, b) => b.clv_previsto * b.risco_evasao_atual - a.clv_previsto * a.risco_evasao_atual
    );
    if (sorted[0]) {
      const criticalIndex = filteredMomentos.findIndex((m) => m.id === sorted[0].id);
      if (criticalIndex !== -1) {
        const targetPage = Math.floor(criticalIndex / itemsPerPage) + 1;
        setCurrentPage(targetPage);
      }
      onSelectMomento(sorted[0]);
    }
  };

  const paginationRange = useMemo(() => {
    return getPaginationRange(safeCurrentPage, totalPages);
  }, [safeCurrentPage, totalPages]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-9 w-64 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─────────────────────────────────────────────────────────────
          BARRA DE COMANDO DA FILA (BUSCA, FILTROS E FOCO RÁPIDO)
         ───────────────────────────────────────────────────────────── */}
      <Card className="rounded-2xl border border-border/80 bg-card/80 backdrop-blur-md shadow-xs p-4 space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-black tracking-tight text-foreground">
                  Radar de Atritos & Fila Operacional
                </CardTitle>
                <Badge
                  variant="outline"
                  className="text-xs font-bold text-primary border-primary/25 bg-primary/10"
                >
                  {filteredMomentos.length} de {momentos.length} casos
                </Badge>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Clique em qualquer card para abrir o painel lateral de decisão com o Árbitro de Uplift
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Campo de Busca */}
            <div className="relative min-w-[240px] sm:min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por cliente, voo, persona ou PNR..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-background/80 border border-border/80 placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            {/* Botão de Foco no Caso Crítico */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectMostCritical}
              className="h-8 px-3 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/15 border-primary/25 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Simular Caso Mais Crítico</span>
            </Button>
          </div>
        </div>

        {/* Pílulas de Filtro por Categoria com Contadores Dinâmicos */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 rounded-2xl bg-muted/40 border border-border/60 text-xs scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all duration-200 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeFilter === "all"
                ? "bg-background text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            }`}
          >
            <span>Todos os Casos</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold transition-colors ${
                activeFilter === "all"
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-muted/80 text-muted-foreground"
              }`}
            >
              {counts.all}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("reativa")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all duration-200 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeFilter === "reativa"
                ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            }`}
          >
            <span>Atritos Operacionais</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold transition-colors ${
                activeFilter === "reativa"
                  ? "bg-rose-500/20 text-rose-600 dark:text-rose-300"
                  : "bg-muted/80 text-muted-foreground"
              }`}
            >
              {counts.reativa}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("critico")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all duration-200 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeFilter === "critico"
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            }`}
          >
            <span>Risco Crítico (≥70%)</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold transition-colors ${
                activeFilter === "critico"
                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-300"
                  : "bg-muted/80 text-muted-foreground"
              }`}
            >
              {counts.critico}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("proativa")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all duration-200 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeFilter === "proativa"
                ? "bg-primary/15 text-primary border border-primary/30 shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            }`}
          >
            <span>Preditivo / Churn</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold transition-colors ${
                activeFilter === "proativa"
                  ? "bg-primary/20 text-primary"
                  : "bg-muted/80 text-muted-foreground"
              }`}
            >
              {counts.proativa}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("alto_clv")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all duration-200 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeFilter === "alto_clv"
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            }`}
          >
            <span>Top CLV (&gt;R$ 5k)</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold transition-colors ${
                activeFilter === "alto_clv"
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300"
                  : "bg-muted/80 text-muted-foreground"
              }`}
            >
              {counts.alto_clv}
            </span>
          </button>
        </div>
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          GRADE PRINCIPAL PAGINADA COM TRANSIÇÃO EM CASCATA
         ───────────────────────────────────────────────────────────── */}
      {totalItems === 0 ? (
        <Card className="p-12 text-center text-muted-foreground text-xs space-y-3 rounded-2xl border-dashed">
          <Clock className="h-8 w-8 mx-auto opacity-40 text-azul-action" />
          <p className="font-bold text-foreground text-sm">Nenhum evento encontrado para os filtros selecionados.</p>
          <p>Redefina o termo de busca ou escolha outra categoria de atrito.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setActiveFilter("all");
            }}
            className="rounded-xl mt-2 cursor-pointer"
          >
            Limpar Filtros
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Grade de Cards com Altura Mínima Estável */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[520px] content-start">
            {paginatedMomentos.map((m, idx) => {
              const isSelected = selectedMomento?.id === m.id;
              const isReativo = m.tipo_simulacao.toLowerCase() === "reativa";
              const tier = inferTier(m);
              const { voo, rota } = parseFlightDetails(m.descricao);

              const paretoFaixa =
                m.clv_previsto >= 8000
                  ? "Top 10%"
                  : m.clv_previsto >= 4000
                  ? "Top 20%"
                  : "Cauda Longa";

              const isAtraso = m.descricao.toLowerCase().includes("atraso");
              const isBagagem = m.descricao.toLowerCase().includes("bagagem");
              const isCancelado = m.descricao.toLowerCase().includes("cancelamento");

              return (
                <div
                  key={`${m.id}-p${safeCurrentPage}`}
                  onClick={() => onSelectMomento(m)}
                  style={{ animationDelay: `${(idx % itemsPerPage) * 35}ms` }}
                  className={`group relative p-4 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 fill-mode-both ${
                    isSelected
                      ? "border-primary bg-primary/[0.08] dark:bg-primary/[0.15] shadow-md ring-2 ring-primary/40"
                      : "border-border/80 bg-card/85 backdrop-blur-md hover:border-primary/50 hover:shadow-primary/5"
                  }`}
                >
                  {/* Linha 1: Badges de Tipo, Tier e Voo */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
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
                          <span>{m.tipo_simulacao}</span>
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${tier.bg} ${tier.color} ${tier.border} shadow-xs`}
                        >
                          <Crown className="h-2.5 w-2.5" />
                          <span>{tier.label}</span>
                        </span>
                      </div>

                      <span className="text-[10px] font-bold font-mono text-muted-foreground bg-muted/60 dark:bg-muted/30 px-1.5 py-0.5 rounded border border-border/50">
                        {paretoFaixa}
                      </span>
                    </div>

                    {/* Strip de Cartão de Embarque: Rota Aeroespacial e Código do Voo */}
                    {rota && (
                      <div className="flex items-center justify-between text-xs font-mono font-bold text-foreground bg-sky-500/5 dark:bg-sky-950/40 px-2.5 py-1 rounded-lg border border-sky-400/20 mb-2">
                        <div className="flex items-center gap-1.5 text-sky-800 dark:text-sky-200">
                          <Plane className="h-3.5 w-3.5 text-azul-action dark:text-sky-400" />
                          <span>{rota}</span>
                        </div>
                        {voo && (
                          <span className="text-[10px] text-muted-foreground bg-background/90 px-1.5 py-0.2 rounded border border-border/60">
                            Voo {voo}
                          </span>
                        )}
                      </div>
                    )}

                    <p className="text-xs font-medium text-foreground leading-snug line-clamp-2 mb-3">
                      {m.descricao}
                    </p>
                  </div>

                  {/* Linha 3: Barra Visual de Risco e Footer */}
                  <div className="space-y-2 pt-2.5 border-t border-dashed border-border/70">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground font-medium">Risco de Churn:</span>
                        <span
                          className={`font-mono font-bold ${
                            m.risco_evasao_atual >= 0.7
                              ? "text-rose-600 dark:text-rose-400"
                              : m.risco_evasao_atual >= 0.4
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {formatPercent(m.risco_evasao_atual)}
                          {m.risco_evasao_atual >= 0.7 && " • Crítico"}
                        </span>
                      </div>

                      {/* Barra de telemetria iluminada */}
                      <div className="h-2 w-full bg-muted/80 dark:bg-muted/40 rounded-full overflow-hidden p-[1px]">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            m.risco_evasao_atual >= 0.7
                              ? "bg-gradient-to-r from-amber-500 to-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.35)]"
                              : m.risco_evasao_atual >= 0.4
                              ? "bg-gradient-to-r from-sky-400 to-amber-500"
                              : "bg-gradient-to-r from-emerald-400 to-emerald-500"
                          }`}
                          style={{ width: `${Math.min(m.risco_evasao_atual * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <div className="flex items-center gap-1.5 truncate max-w-[55%]">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-azul-action dark:text-sky-400 shadow-xs">
                          <UserCheck className="h-3 w-3" />
                        </div>
                        <div className="truncate">
                          <span className="font-bold text-foreground truncate block leading-tight">{m.persona}</span>
                          <span className="font-mono text-[9px] text-muted-foreground block truncate leading-tight">#{m.cliente_id}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground block leading-tight">CLV</span>
                          <span className="font-mono font-bold text-foreground text-xs leading-tight">
                            {formatCurrency(m.clv_previsto)}
                          </span>
                        </div>
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-xl transition-all duration-200 shrink-0 ${
                            isSelected
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "bg-muted text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary group-hover:translate-x-0.5"
                          }`}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ─────────────────────────────────────────────────────────────
              BARRA DE PAGINAÇÃO AERO-GLOW (CONTROLES DE NAVEGAÇÃO)
             ───────────────────────────────────────────────────────────── */}
          <Card className="rounded-2xl border border-border/80 bg-card/80 backdrop-blur-md shadow-xs p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Esquerda: Contador de Contexto */}
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>
                Exibindo <strong className="text-foreground font-mono">{startIndex + 1}–{endIndex}</strong> de{" "}
                <strong className="text-foreground font-mono">{totalItems}</strong> casos
              </span>
              <span>•</span>
              <span>
                Página <strong className="text-foreground font-mono">{safeCurrentPage}</strong> de{" "}
                <strong className="text-foreground font-mono">{totalPages}</strong>
              </span>
            </div>

            {/* Centro: Controles Numéricos de Navegação */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {/* Botão Primeira Página */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage === 1}
                className="h-8 w-8 p-0 rounded-full border-border/70 hover:bg-muted disabled:opacity-25 cursor-pointer hidden sm:flex items-center justify-center transition-all"
                title="Primeira Página"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>

              {/* Botão Anterior */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="h-8 px-3 rounded-full border-border/70 hover:bg-muted disabled:opacity-25 cursor-pointer flex items-center gap-1 text-xs font-semibold transition-all"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Anterior</span>
              </Button>

              {/* Pílulas Numéricas */}
              <div className="flex items-center gap-1 mx-0.5 p-0.5 rounded-full bg-muted/40 border border-border/60">
                {paginationRange.map((page, idx) => {
                  if (page === "...") {
                    return (
                      <span key={`dots-${idx}`} className="px-1.5 text-xs text-muted-foreground font-mono">
                        ...
                      </span>
                    );
                  }

                  const pageNum = Number(page);
                  const isActive = pageNum === safeCurrentPage;

                  return (
                    <button
                      key={`page-${pageNum}`}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
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

              {/* Botão Próximo */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                className="h-8 px-3 rounded-full border-border/70 hover:bg-muted disabled:opacity-25 cursor-pointer flex items-center gap-1 text-xs font-semibold transition-all"
              >
                <span className="hidden xs:inline">Próximo</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>

              {/* Botão Última Página */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage === totalPages}
                className="h-8 w-8 p-0 rounded-full border-border/70 hover:bg-muted disabled:opacity-25 cursor-pointer hidden sm:flex items-center justify-center transition-all"
                title="Última Página"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Direita: Seletor de Densidade (Cards por Página) */}
            <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-muted-foreground">
              <span className="hidden md:inline text-[11px] font-medium">Densidade:</span>
              <div className="flex items-center rounded-full border border-border/70 bg-background/60 p-0.5 shadow-xs">
                {[6, 9, 12].map((size) => (
                  <button
                    key={`density-${size}`}
                    type="button"
                    onClick={() => setItemsPerPage(size)}
                    className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold transition-all cursor-pointer ${
                      itemsPerPage === size
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
