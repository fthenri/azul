"use client";

import React from "react";
import {
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Award,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { DashboardKPIs } from "@/types/api";
import { formatCurrency, formatRatio } from "@/lib/formatters";

export type KpiType = "special" | "common";

interface KpiCardsProps {
  data?: DashboardKPIs;
  isLoading: boolean;
}

export function KpiCards({ data, isLoading }: KpiCardsProps) {
  if (isLoading) {
    return (
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
    );
  }

  if (!data) return null;

  const kpis: Array<{
    title: string;
    value: string;
    type: KpiType;
    badgeText?: string;
    description: string;
    icon: React.ElementType;
    iconColor: string;
    iconBg: string;
    tooltip: string;
    metricPill: string;
    highlightBeam?: string;
    accentGlow?: string;
  }> = [
    {
      title: "Valor Protegido",
      value: formatCurrency(data.valor_protegido),
      type: "common",
      description: "CLV de clientes em alto risco de churn blindado pelo motor",
      icon: ShieldCheck,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBg:
        "bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/20 dark:border-emerald-500/30",
      tooltip:
        "CLV (Customer Lifetime Value) acumulado dos passageiros com risco de evasão ≥ 35% que receberam intervenção preventiva e foram retidos na carteira.",
      metricPill: "Risco ≥ 0.35 mitigado",
    },
    {
      title: "Valor Gerado",
      value: formatCurrency(data.valor_gerado),
      type: "common",
      description: "Receita adicional de ancillaries, upgrades e fidelidade",
      icon: TrendingUp,
      iconColor: "text-primary",
      iconBg: "bg-primary/10 border-primary/20",
      tooltip:
        "Receita incremental medida entre o valor monetário expandido e a base transacional histórica de passageiros de alto valor.",
      metricPill: "Ancillaries + Upgrades",
    },
    {
      title: "Custo Total de Retenção",
      value: formatCurrency(data.custo_total),
      type: "common",
      description: "Investimento alocado em vouchers, milhas e cortesias",
      icon: DollarSign,
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg:
        "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/20 dark:border-amber-500/30",
      tooltip:
        "Custo operacional e financeiro total das ações calibradas por faixa de risco (R$ 300 para risco ≥70%, R$ 150 para risco ≥40%, R$ 50 base).",
      metricPill: "Calibrado por Risco",
    },
    {
      title: "ROI por Real Gasto",
      value: formatRatio(data.roi_por_real_gasto),
      type: "special",
      badgeText: "Alta Eficiência",
      description: "Retorno líquido alcançado para cada R$ 1,00 investido",
      icon: Award,
      iconColor: "text-primary-foreground",
      iconBg: "bg-primary shadow-xs",
      highlightBeam: "via-primary",
      accentGlow: "from-primary/20 to-transparent",
      tooltip:
        "Fórmula Matemática Oficial: (Valor Protegido + Valor Gerado) ÷ Custo Total. Comprova o multiplicador de retorno sobre investimento do motor analítico.",
      metricPill: "Supera CAC em 18x",
    },
  ];

  return (
    <div
      data-tour="executive-kpis"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const isSpecial = kpi.type === "special";

        return (
          <div
            key={kpi.title}
            className={`group relative rounded-2xl border transition-all duration-300 overflow-hidden ${
              isSpecial
                ? "border-emerald-500/40 bg-gradient-to-br from-card via-card to-emerald-500/5 shadow-md hover:border-emerald-500/60"
                : "border-border/80 bg-card/80 backdrop-blur-xl shadow-xs hover:border-primary/30 hover:shadow-sm"
            }`}
          >
            {/* Faixa de Luz Superior em Gradiente: APENAS para KPIs especiais */}
            {isSpecial && (
              <div
                className={`absolute inset-x-6 top-0 h-[1.5px] bg-gradient-to-r from-transparent ${
                  kpi.highlightBeam || "via-sky-400 dark:via-sky-300"
                } to-transparent opacity-85 group-hover:opacity-100 transition-opacity`}
              />
            )}

            {/* Glow sutil de fundo: APENAS para KPIs especiais */}
            {isSpecial && kpi.accentGlow && (
              <div
                className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${kpi.accentGlow} blur-2xl rounded-full pointer-events-none`}
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
                    badge={isSpecial ? "Oficial" : "Métrica"}
                    side="bottom"
                  />
                </span>

                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-105 ${kpi.iconBg} ${kpi.iconColor}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              {/* Valor Principal */}
              <div className="space-y-1">
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <span
                    className={`text-2xl sm:text-[27px] font-black tracking-tight font-sans ${
                      isSpecial
                        ? "text-primary"
                        : "text-foreground"
                    }`}
                  >
                    {kpi.value}
                  </span>

                  {isSpecial && kpi.badgeText && (
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
                  <span>Auditar</span>
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
