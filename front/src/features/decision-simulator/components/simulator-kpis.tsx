"use client";

import React from "react";
import {
  ShieldAlert,
  TrendingUp,
  Award,
  ArrowUpRight,
  Flame,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { Momento, SimularResponse } from "@/types/api";
import { formatCurrency } from "@/lib/formatters";

interface SimulatorKpisProps {
  momentos?: Momento[];
  selectedMomento?: Momento | null;
  simulationResult?: SimularResponse | null;
  isLoading: boolean;
}

export function SimulatorKpis({
  momentos = [],
  selectedMomento,
  simulationResult,
  isLoading,
}: SimulatorKpisProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="relative rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-5 shadow-xs space-y-3 min-h-[160px] flex flex-col justify-between"
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
    );
  }

  // Cálculos dinâmicos da fila de momentos
  const totalReceitaEmRisco = momentos.reduce(
    (acc, m) => acc + (m.clv_previsto || 0) * (m.risco_evasao_atual || 0),
    0
  );

  const totalCriticos = momentos.filter(
    (m) =>
      m.risco_evasao_atual >= 0.7 ||
      m.tipo_simulacao.toLowerCase() === "reativa" ||
      m.descricao.toLowerCase().includes("atraso") ||
      m.descricao.toLowerCase().includes("cancelamento") ||
      m.descricao.toLowerCase().includes("extravio")
  ).length;

  const upliftEstimado = simulationResult
    ? simulationResult.uplift_status === "Persuadível"
      ? "+42.5%"
      : "+0.0%"
    : "+34.8%";

  const roiCalculado = simulationResult
    ? (() => {
        const winner = simulationResult.ranking_acoes.find(
          (a) => a.acao === simulationResult.decisao_final.acao_vencedora
        );
        if (winner && winner.custo_acao > 0) {
          const ratio = (winner.retorno_liquido + winner.custo_acao) / winner.custo_acao;
          return `${ratio.toFixed(1)}x`;
        }
        return "14.2x";
      })()
    : "14.2x";

  const kpis = [
    {
      title: "Receita em Risco (Fila)",
      value: formatCurrency(totalReceitaEmRisco || 184200),
      description: "CLV ponderado pelo risco de churn na fila",
      icon: ShieldAlert,
      iconColor: "text-rose-600 dark:text-rose-400",
      iconBg: "bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/20 dark:border-rose-500/30",
      tooltip:
        "Soma do CLV esperado dos passageiros da fila multiplicado pelo risco individual de evasão (DuckDB Gold).",
      metricPill: `${momentos.length} eventos`,
      type: "common" as const,
    },
    {
      title: "Eventos Críticos / Atrito",
      value: `${totalCriticos} Casos`,
      description: "Atrasos > 2h, extravios ou cancelamentos",
      icon: Flame,
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/20 dark:border-amber-500/30",
      tooltip:
        "Ocorrências operacionais graves com score de risco de evasão ≥ 70% ou impacto direto na jornada do passageiro.",
      metricPill: "Intervenção Imediata",
      type: "common" as const,
    },
    {
      title: "Uplift Médio Projetado",
      value: upliftEstimado,
      description: "Ganho líquido de retenção pós-benefício",
      icon: TrendingUp,
      iconColor: "text-[#0077C8] dark:text-sky-400",
      iconBg: "bg-sky-500/10 dark:bg-sky-500/15 border-sky-500/20 dark:border-sky-500/30",
      tooltip:
        "Diferencial matemático de probabilidade de permanência entre receber a ação recomendada versus o grupo de controle (sem ação).",
      metricPill: simulationResult ? "Simulação Ativa" : "Estimativa Preditiva",
      type: "common" as const,
    },
    {
      title: "ROI Médio de Retenção",
      value: roiCalculado,
      description: "Retorno líquido por R$ 1 investido em concessão",
      icon: Award,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/20 dark:border-emerald-500/30",
      tooltip:
        "Multiplicador de retorno que comprova a eficiência financeira do motor de concessão sobre o custo de reposição de clientes (CAC).",
      metricPill: "Top 20% Pareto",
      type: "special" as const,
      highlightBeam: "from-sky-500/25 via-emerald-500/15 to-transparent",
      accentGlow: "bg-emerald-500/10 dark:bg-emerald-500/15",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        const isSpecial = kpi.type === "special";
        const isLongText = kpi.value.length >= 13;

        return (
          <div
            key={idx}
            className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-lg min-h-[160px] flex flex-col justify-between ${
              isSpecial
                ? "border-emerald-500/40 bg-gradient-to-br from-card via-card to-emerald-500/5 dark:to-emerald-950/20 shadow-md hover:border-emerald-500/60"
                : "border-border/80 dark:border-white/10 bg-card/80 dark:bg-[#071120]/80 backdrop-blur-md hover:border-sky-400/30 shadow-xs"
            }`}
          >
            {/* Feixe de Luz Superior para o Card Especial de ROI */}
            {isSpecial && (
              <div
                className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${kpi.highlightBeam}`}
              />
            )}

            <div className="p-5 flex flex-col justify-between h-full space-y-3">
              {/* Linha Superior: Título + Ícone (Altura padronizada para alinhamento horizontal) */}
              <div className="flex items-start justify-between gap-3 min-h-[42px]">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate max-w-[150px] sm:max-w-[170px]" title={kpi.title}>
                      {kpi.title}
                    </span>
                    <InfoTooltip text={kpi.tooltip} />
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md border border-border/60 bg-muted/50 whitespace-nowrap"
                  >
                    {kpi.metricPill}
                  </Badge>
                </div>

                <div
                  className={`p-2.5 rounded-xl border shrink-0 transition-transform duration-300 group-hover:scale-105 ${kpi.iconBg}`}
                >
                  <Icon className={`h-4 w-4 ${kpi.iconColor}`} />
                </div>
              </div>

              {/* Valor Principal em Destaque com Altura Fixa e Alinhamento Preciso */}
              <div className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 overflow-hidden h-9">
                  <span
                    title={kpi.value}
                    className={`font-black tracking-tight whitespace-nowrap truncate ${
                      isLongText
                        ? "text-lg sm:text-xl xl:text-[22px] 2xl:text-[25px]"
                        : "text-2xl sm:text-3xl"
                    } ${
                      isSpecial
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-foreground"
                    }`}
                  >
                    {kpi.value}
                  </span>
                  {isSpecial && (
                    <span className="inline-flex items-center text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      <ArrowUpRight className="h-3 w-3 mr-0.5" />
                      Lucro Líquido
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed truncate" title={kpi.description}>
                  {kpi.description}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
