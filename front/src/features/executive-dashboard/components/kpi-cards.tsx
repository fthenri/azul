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
      iconColor: "text-[#0077C8] dark:text-sky-400",
      iconBg:
        "bg-sky-500/10 dark:bg-sky-500/15 border-sky-500/20 dark:border-sky-500/30",
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
      iconColor: "text-white",
      iconBg:
        "bg-gradient-to-r from-[#00A3FF] to-[#0077C8] shadow-[0_2px_12px_rgba(0,163,255,0.4)]",
      highlightBeam: "via-sky-400 dark:via-sky-300",
      accentGlow: "from-[#00A3FF]/20 to-transparent",
      tooltip:
        "Fórmula Matemática Oficial: (Valor Protegido + Valor Gerado) ÷ Custo Total. Comprova o multiplicador de retorno sobre investimento do motor analítico.",
      metricPill: "Supera CAC em 18x",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const isSpecial = kpi.type === "special";

        return (
          <div
            key={kpi.title}
            className={`group relative rounded-2xl border transition-all duration-300 overflow-hidden ${
              isSpecial
                ? "border-sky-400/40 dark:border-sky-400/40 bg-gradient-to-b from-[#003B7A]/5 via-white to-white dark:from-[#071324]/90 dark:via-[#071120]/80 dark:to-[#040915]/90 shadow-[0_4px_22px_rgba(0,119,200,0.12)] dark:shadow-[0_10px_35px_rgba(0,163,255,0.15)] hover:shadow-[0_8px_32px_rgba(0,163,255,0.25)] ring-1 ring-sky-400/20"
                : "border-border/70 dark:border-white/10 bg-white/70 dark:bg-[#071120]/70 backdrop-blur-xl shadow-xs hover:border-slate-300 dark:hover:border-white/20 hover:shadow-sm"
            }`}
          >
            {/* Faixa de Luz Superior em Gradiente: APENAS para KPIs especiais (comuns não levam) */}
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
                  <InfoTooltip text={kpi.tooltip} side="bottom" />
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
                    className={`text-2xl sm:text-[27px] font-black tracking-tight ${
                      isSpecial
                        ? "text-[#003B7A] dark:text-sky-300 drop-shadow-[0_2px_12px_rgba(56,189,248,0.25)]"
                        : "text-foreground"
                    }`}
                  >
                    {kpi.value}
                  </span>

                  {isSpecial && kpi.badgeText && (
                    <Badge className="bg-gradient-to-r from-[#00A3FF] to-[#0077C8] hover:from-[#38BDF8] hover:to-[#0284C7] text-white border-0 text-[10px] font-bold px-2 py-0.5 shadow-sm inline-flex items-center gap-1">
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
              <div className="pt-2 border-t border-border/60 dark:border-white/5 flex items-center justify-between text-[11px]">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted/60 dark:bg-white/[0.04] px-2 py-0.5 rounded-md border border-border/40 dark:border-white/10">
                  {kpi.metricPill}
                </span>

                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-azul-action dark:text-sky-400 group-hover:translate-x-0.5 transition-transform">
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
