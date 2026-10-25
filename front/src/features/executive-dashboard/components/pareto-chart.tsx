"use client";

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { ParetoData } from "@/types/api";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { TrendingUp, Layers, CheckCircle2 } from "lucide-react";

interface ParetoChartProps {
  data?: ParetoData[];
  isLoading: boolean;
}

export function ParetoChart({ data, isLoading }: ParetoChartProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  if (isLoading) {
    return (
      <div className="relative rounded-2xl border border-border/80 dark:border-white/10 bg-card/80 dark:bg-[#071120]/80 backdrop-blur-xl p-6 shadow-sm space-y-4 h-[440px]">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-[290px] w-full rounded-xl" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="relative rounded-2xl border border-border/80 dark:border-white/10 bg-card/80 dark:bg-[#071120]/80 backdrop-blur-xl p-6 shadow-sm h-[440px] flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground">Curva de Concentração de Valor (Pareto)</h3>
          <p className="text-xs text-muted-foreground mt-1">Sem dados disponíveis no momento.</p>
        </div>
        <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
          Nenhum registro de concentração retornado pelo banco analítico.
        </div>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    percentual_pct: Math.round(item.percentual_acumulado * 1000) / 10,
  }));

  const top20 = data.find((d) => d.decil_clientes === "Top 20%");
  const top20Pct = top20 ? Math.round(top20.percentual_acumulado * 100) : 80;

  return (
    <div className="group relative rounded-2xl border border-border/80 dark:border-white/10 bg-card/80 dark:bg-[#071120]/80 backdrop-blur-xl shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
      {/* Feixe Superior Luminous Edge Highlight */}
      <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#0077C8]/50 dark:via-sky-400/80 to-transparent" />

      {/* Header do Gráfico */}
      <div className="p-6 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/10 dark:bg-sky-500/15 text-[#0077C8] dark:text-sky-400 border border-sky-500/20">
                <TrendingUp className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                Curva de Concentração de Valor (Pareto 80/20)
                <InfoTooltip
                  title="Princípio de Pareto (80/20)"
                  badge="Estratégico"
                  text="Uma fatia reduzida de clientes (Top 20%) é responsável por aproximadamente 80% do faturamento futuro da Azul."
                  side="bottom"
                />
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Valor financeiro acumulado (R$) e percentual sobre o montante geral da carteira
            </p>
          </div>

          <Badge className="w-fit bg-[#EAF4FC] dark:bg-sky-950/60 text-[#003B7A] dark:text-sky-300 border border-[#0077C8]/25 dark:border-sky-500/30 text-[11px] font-semibold py-1 px-3">
            Top 20% = {top20Pct}% Receita
          </Badge>
        </div>
      </div>

      {/* Área do Gráfico */}
      <div className="px-4 pt-2 pb-3 flex-1 min-h-[300px]">
        <div className="h-[290px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 12, right: 15, left: 10, bottom: 8 }}
            >
              <defs>
                <linearGradient id="paretoBarLight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0077C8" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#003B7A" stopOpacity={0.95} />
                </linearGradient>

                <linearGradient id="paretoBarDark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00A3FF" stopOpacity={0.85} />
                  <stop offset="60%" stopColor="#0284C7" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#071E3D" stopOpacity={0.7} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(226, 232, 240, 0.9)"}
              />

              <XAxis
                dataKey="decil_clientes"
                tick={{
                  fontSize: 11,
                  fill: isDark ? "#94A3B8" : "#5B6E84",
                  fontWeight: 500,
                }}
                tickLine={false}
                axisLine={{ stroke: isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0" }}
              />

              <YAxis
                yAxisId="left"
                orientation="left"
                tick={{
                  fontSize: 10,
                  fill: isDark ? "#94A3B8" : "#5B6E84",
                }}
                tickFormatter={(val) => `R$ ${(val / 1000000).toFixed(1)}M`}
                tickLine={false}
                axisLine={false}
                width={55}
              />

              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tick={{
                  fontSize: 10,
                  fill: isDark ? "#94A3B8" : "#5B6E84",
                }}
                tickFormatter={(val) => `${val}%`}
                tickLine={false}
                axisLine={false}
                width={36}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload as ParetoData & { percentual_pct: number };
                  return (
                    <div className="rounded-xl border border-border/80 dark:border-white/15 bg-white/95 dark:bg-[#071120]/95 backdrop-blur-xl p-3.5 shadow-xl text-xs space-y-1.5 min-w-[210px]">
                      <div className="flex items-center justify-between border-b border-border dark:border-white/10 pb-1.5">
                        <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-azul-action" />
                          {label}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">
                          Decil Carteira
                        </span>
                      </div>

                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">Valor Acumulado:</span>
                          <span className="font-bold text-[#003B7A] dark:text-sky-300">
                            {formatCurrency(item.valor_acumulado)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">% Carteira Total:</span>
                          <span className="font-bold text-azul-action dark:text-sky-400">
                            {formatPercent(item.percentual_acumulado)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />

              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 10, fontSize: 11 }}
                formatter={(value) => (
                  <span className="text-muted-foreground font-medium text-xs">{value}</span>
                )}
              />

              <Bar
                yAxisId="left"
                dataKey="valor_acumulado"
                name="Valor Acumulado (R$)"
                fill={isDark ? "url(#paretoBarDark)" : "url(#paretoBarLight)"}
                radius={[6, 6, 0, 0]}
                barSize={26}
                isAnimationActive={false}
              />

              <Line
                yAxisId="right"
                type="monotone"
                dataKey="percentual_pct"
                name="% Acumulado"
                stroke={isDark ? "#38BDF8" : "#0077C8"}
                strokeWidth={2.8}
                dot={{
                  r: 3.5,
                  fill: isDark ? "#38BDF8" : "#0077C8",
                  stroke: isDark ? "#071120" : "#FFFFFF",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 6,
                  fill: isDark ? "#00A3FF" : "#003B7A",
                  stroke: "#FFFFFF",
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rodapé Informativo Rápido */}
      <div className="px-6 py-3 bg-muted/40 dark:bg-white/[0.02] border-t border-border/60 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Foco Estratégico: 80% do valor retido com 20% do orçamento.</span>
        </div>
        <span className="font-mono text-[11px] text-azul-action dark:text-sky-400">
          Curva 80/20 Homologada
        </span>
      </div>
    </div>
  );
}
