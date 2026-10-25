"use client";

import React from "react";
import { Award, Zap, ShieldAlert, ArrowUpRight, CheckCircle2, AlertOctagon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ParetoRoiData } from "@/types/api";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/formatters";

interface ParetoRoiAnalysisProps {
  data?: ParetoRoiData[];
  isLoading?: boolean;
}

export function ParetoRoiAnalysis({ data, isLoading }: ParetoRoiAnalysisProps) {
  if (isLoading || !data || data.length === 0) return null;

  const maxRoi = Math.max(...data.map((d) => d.roi_retencao_multiplicador), 150);

  return (
    <div className="group relative rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
      {/* Feixe Superior Luminous Edge Highlight */}
      <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* Header da Seção */}
      <div className="p-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Zap className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-foreground">
                Comprovação Matemática: ROI da Retenção (Top 20% vs Cauda Longa)
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Demonstração empírica: O retorno sobre investimento na blindagem do Top 20% supera o CAC e a Cauda Longa em até 26x
            </p>
          </div>

          <Badge className="w-fit bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold py-1 px-3">
            Até 148x de Retorno
          </Badge>
        </div>
      </div>

      {/* Grid de Cards Comparativos */}
      <div className="px-6 pb-6 pt-0 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.map((item, idx) => {
            const isTopTier = idx <= 1;
            const barWidth = Math.max((item.roi_retencao_multiplicador / maxRoi) * 100, 4);

            return (
              <div
                key={item.faixa_pareto}
                className={`relative rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between ${
                  isTopTier
                    ? "border-primary/40 bg-primary/[0.04] shadow-xs"
                    : "border-border/70 bg-muted/20"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      {item.faixa_pareto}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {formatNumber(item.total_clientes)} pax
                    </span>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      Multiplicador ROI
                    </div>
                    <div
                      className={`text-2xl font-black mt-0.5 ${
                        isTopTier
                          ? "text-primary"
                          : "text-foreground"
                      }`}
                    >
                      {item.roi_retencao_multiplicador.toFixed(1)}x
                    </div>
                  </div>

                  {/* Barra Visual de ROI */}
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isTopTier
                          ? "bg-primary"
                          : "bg-muted-foreground/40"
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/50 space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">CLV Médio:</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(item.clv_medio)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Risco Churn:</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {formatPercent(item.risco_evasao_medio)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Perda/Pax:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(item.perda_media_por_cliente)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Box Executivo de Conclusão e Decisão */}
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 dark:bg-sky-500/15 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-azul-action dark:text-sky-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-foreground">
                Diretriz de Decisão Automatizada
              </span>
              <p className="text-muted-foreground leading-relaxed">
                Alocar contramedidas proativas exclusivamente nos tiers Top 10% e Top 20% gera um multiplicador de até <strong>148x</strong> de retorno sobre cada real gasto, enquanto ações indiscriminadas na Cauda Longa geram apenas 5.7x e desgastam a margem operacional.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
