"use client";

import React, { useState, useMemo } from "react";
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
  TrendingDown,
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

function inferTier(momento: Momento): { label: string; color: string; border: string; bg: string } {
  const p = momento.persona.toLowerCase();
  const clv = momento.clv_previsto;

  if (p.includes("executivo") || clv >= 8000) {
    return {
      label: "Diamante",
      color: "text-[#002855] dark:text-sky-300",
      border: "border-sky-400/40 dark:border-sky-500/40",
      bg: "bg-sky-500/10 dark:bg-sky-950/60",
    };
  }
  if (p.includes("premium") || clv >= 5000) {
    return {
      label: "Safira",
      color: "text-blue-700 dark:text-blue-300",
      border: "border-blue-400/30 dark:border-blue-500/30",
      bg: "bg-blue-500/10 dark:bg-blue-950/50",
    };
  }
  if (clv >= 3000) {
    return {
      label: "Topázio",
      color: "text-amber-700 dark:text-amber-400",
      border: "border-amber-400/30 dark:border-amber-500/30",
      bg: "bg-amber-500/10 dark:bg-amber-950/50",
    };
  }
  return {
    label: "Básico",
    color: "text-slate-600 dark:text-slate-400",
    border: "border-slate-300 dark:border-slate-700",
    bg: "bg-slate-100 dark:bg-slate-800/60",
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

export function MomentsQueue({
  momentos = [],
  isLoading,
  selectedMomento,
  onSelectMomento,
}: MomentsQueueProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");

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

  const handleSelectMostCritical = () => {
    if (!momentos || momentos.length === 0) return;
    const sorted = [...momentos].sort(
      (a, b) => b.clv_previsto * b.risco_evasao_atual - a.clv_previsto * a.risco_evasao_atual
    );
    if (sorted[0]) {
      onSelectMomento(sorted[0]);
    }
  };

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
      <Card className="rounded-2xl border border-border/80 dark:border-white/10 bg-card/80 dark:bg-[#071120]/80 backdrop-blur-md shadow-xs p-4 space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-400/20 text-[#0077C8] dark:text-sky-400">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-black tracking-tight text-foreground">
                  Radar de Atritos & Fila Operacional
                </CardTitle>
                <Badge
                  variant="outline"
                  className="text-xs font-bold text-azul-action dark:text-sky-300 border-sky-500/25 bg-sky-500/10"
                >
                  {filteredMomentos.length} de {momentos.length} casos
                </Badge>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Clique em qualquer card para abrir o painel de decisão e acionar o Árbitro de Uplift
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
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-background/80 border border-border/80 dark:border-white/10 placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
              />
            </div>

            {/* Botão de Foco no Caso Crítico */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectMostCritical}
              className="h-8 px-3 text-xs font-bold text-[#0077C8] dark:text-sky-400 bg-sky-500/5 hover:bg-sky-500/15 border-sky-400/25 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Simular Caso Mais Crítico</span>
            </Button>
          </div>
        </div>

        {/* Pílulas de Filtro por Categoria */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 text-xs scrollbar-none border-t border-border/50">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === "all"
                ? "bg-[#003B7A] dark:bg-sky-500 text-white shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Todos os Casos ({momentos.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("reativa")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === "reativa"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Atritos Operacionais (Atrasos / Cancelamentos)
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("critico")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === "critico"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Risco Crítico (≥70%)
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("proativa")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === "proativa"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Preditivo / Churn
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("alto_clv")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === "alto_clv"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Top CLV (&gt;R$ 5k)
          </button>
        </div>
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          GRADE PRINCIPAL DE CARDS DE ATRITO (SEM SCROLL INTERNO FORÇADO)
         ───────────────────────────────────────────────────────────── */}
      {filteredMomentos.length === 0 ? (
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
            className="rounded-xl mt-2"
          >
            Limpar Filtros
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMomentos.map((m) => {
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
                key={m.id}
                onClick={() => onSelectMomento(m)}
                className={`group relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-md ${
                  isSelected
                    ? "border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 shadow-sm ring-2 ring-sky-500/30"
                    : "border-border/80 dark:border-white/10 bg-card/80 dark:bg-[#071120]/80 backdrop-blur-md hover:border-sky-400/40"
                }`}
              >
                {/* Linha 1: Badges de Tipo, Tier e Voo */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isReativo
                            ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/25"
                            : "bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/25"
                        }`}
                      >
                        {isCancelado ? (
                          <AlertCircle className="h-2.5 w-2.5" />
                        ) : isBagagem ? (
                          <Luggage className="h-2.5 w-2.5" />
                        ) : isAtraso ? (
                          <Plane className="h-2.5 w-2.5" />
                        ) : (
                          <AlertTriangle className="h-2.5 w-2.5" />
                        )}
                        <span>{m.tipo_simulacao}</span>
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${tier.bg} ${tier.color} ${tier.border}`}
                      >
                        <Crown className="h-2.5 w-2.5" />
                        <span>{tier.label}</span>
                      </span>

                      {voo && (
                        <span className="font-mono text-[10px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                          {voo}
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] font-bold font-mono text-muted-foreground">
                      {paretoFaixa}
                    </span>
                  </div>

                  {/* Linha 2: Rota e Descrição */}
                  {rota && (
                    <div className="flex items-center gap-1.5 text-xs font-black text-foreground mb-1">
                      <Plane className="h-3.5 w-3.5 text-azul-action" />
                      <span>{rota}</span>
                    </div>
                  )}

                  <p className="text-xs font-medium text-foreground leading-snug line-clamp-2 mb-3">
                    {m.descricao}
                  </p>
                </div>

                {/* Linha 3: Barra Visual de Risco e Footer */}
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">Probabilidade de Evasão:</span>
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
                      </span>
                    </div>

                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          m.risco_evasao_atual >= 0.7
                            ? "bg-rose-500"
                            : m.risco_evasao_atual >= 0.4
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(m.risco_evasao_atual * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <div className="flex items-center gap-1.5 truncate max-w-[60%]">
                      <UserCheck className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="font-semibold text-foreground truncate">{m.persona}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold text-foreground">
                        {formatCurrency(m.clv_previsto)}
                      </span>
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full transition-transform ${
                          isSelected
                            ? "bg-sky-500 text-white"
                            : "bg-muted text-muted-foreground group-hover:translate-x-0.5 group-hover:bg-sky-500/15 group-hover:text-sky-600"
                        }`}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
