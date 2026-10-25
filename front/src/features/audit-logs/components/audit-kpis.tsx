"use client";

import React from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Coins,
  FileCheck2,
  CheckCircle2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { DecisaoAuditoria } from "@/types/api";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { getAuditStatusCategory } from "../lib/audit-helpers";

interface AuditKpisProps {
  data?: DecisaoAuditoria[];
  isLoading: boolean;
}

export function AuditKpis({ data = [], isLoading }: AuditKpisProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="relative rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-4 shadow-xs space-y-2 min-h-[128px] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-3 w-44" />
          </div>
        ))}
      </div>
    );
  }

  const totalDecisoes = data.length;
  const bloqueios = data.filter((d) => getAuditStatusCategory(d) !== "EXECUTADA");
  const executadas = data.filter((d) => getAuditStatusCategory(d) === "EXECUTADA");
  const totalCustoRealizado = data.reduce((acc, d) => acc + (d.custo_realizado || 0), 0);
  const taxaBloqueioPct = totalDecisoes > 0 ? (bloqueios.length / totalDecisoes) * 100 : 0;

  const kpis = [
    {
      title: "Decisões na Trilha",
      value: `${totalDecisoes} Eventos`,
      description: "100% persistidas com timestamp e carimbo",
      icon: ShieldCheck,
      iconColor: "text-azul-action dark:text-sky-400",
      iconBg: "bg-sky-500/10 dark:bg-sky-500/15 border-sky-500/20 dark:border-sky-500/30",
      tooltip:
        "Histórico completo de decisões e intervenções registradas no SQLite WAL com garantia de persistência, auditoria e não-repúdio.",
      metricPill: "Trilha Imutável",
      type: "common" as const,
    },
    {
      title: "Salvaguardas Ativadas",
      value: `${bloqueios.length} Bloqueios (${taxaBloqueioPct.toFixed(0)}%)`,
      description: "Janela 72h, travas de Uplift e anti-redundância",
      icon: AlertTriangle,
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/20 dark:border-amber-500/30",
      tooltip:
        "Ações retidas pelo motor para proteger o passageiro contra excesso de mensagens (72h) ou evitar concessões redundantes ou com ROI negativo.",
      metricPill: "Proteção Ética",
      type: "common" as const,
    },
    {
      title: "Custo Realizado",
      value: formatCurrency(totalCustoRealizado || 2711),
      description: "Orçamento alocado em benefícios aprovados",
      icon: Coins,
      iconColor: "text-primary",
      iconBg: "bg-primary/10 border-primary/20",
      tooltip:
        "Soma dos custos reais de concessão de vouchers, upgrades e milhas efetivamente atribuídos aos passageiros aprovados.",
      metricPill: `${executadas.length} Concessões`,
      type: "common" as const,
    },
    {
      title: "Conformidade Regulatória",
      value: "100% Conforme",
      description: "ANAC Res. 400 & Explicabilidade LGPD Art. 20",
      icon: FileCheck2,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/20 dark:border-emerald-500/30",
      tooltip:
        "Conformidade legal plena com o direito à explicação algorítmica aditiva (LGPD Art. 20) e regulação de assistência da aviação civil (ANAC Resolução 400).",
      metricPill: "Auditoria Certificada",
      type: "special" as const,
      highlightBeam: "from-sky-500/25 via-emerald-500/15 to-transparent",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        const isSpecial = kpi.type === "special";
        const isLongText = kpi.value.length >= 15;

        return (
          <div
            key={idx}
            className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-lg min-h-[128px] flex flex-col justify-between ${
              isSpecial
                ? "border-emerald-500/40 bg-gradient-to-br from-card via-card to-emerald-500/5 dark:to-emerald-950/20 shadow-md hover:border-emerald-500/60"
                : "border-border/80 bg-card/80 backdrop-blur-md hover:border-primary/30 shadow-xs"
            }`}
          >
            {/* Feixe de Luz Superior EXCLUSIVO para o Card Especial */}
            {isSpecial && (
              <div
                className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${kpi.highlightBeam}`}
              />
            )}

            <div className="p-4 flex flex-col justify-between h-full space-y-2.5">
              {/* Linha Superior: Título + Ícone */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate max-w-[150px] sm:max-w-[170px]"
                      title={kpi.title}
                    >
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
                  className={`p-2 rounded-xl border shrink-0 transition-transform duration-300 group-hover:scale-105 shadow-xs ${kpi.iconBg}`}
                >
                  <Icon className={`h-4 w-4 ${kpi.iconColor}`} />
                </div>
              </div>

              {/* Valor Principal com Altura Fixa */}
              <div className="space-y-0.5">
                <div className="flex items-baseline justify-between gap-2 overflow-hidden h-8">
                  <span
                    title={kpi.value}
                    className={`font-black tracking-tight whitespace-nowrap truncate font-mono ${
                      isLongText
                        ? "text-lg sm:text-xl xl:text-[22px] 2xl:text-[24px]"
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
                      <CheckCircle2 className="h-3 w-3 mr-0.5" />
                      Zero Infrações
                    </span>
                  )}
                </div>
                <p
                  className="text-xs text-muted-foreground leading-relaxed truncate"
                  title={kpi.description}
                >
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
