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
      <div className="relative rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl p-6 shadow-sm space-y-4 h-[440px]">
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
      <div className="relative rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl p-6 shadow-sm h-[440px] flex flex-col justify-between">
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
    <div
      data-tour="pareto-chart"
      className="group relative rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col"
    >
      {/* Feixe Superior Luminous Edge Highlight */}
      <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* Header do Gráfico */}
      <div className="p-6 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <TrendingUp className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-foreground flex items-center gap-1.5 font-sans">
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

          <Badge className="w-fit bg-secondary text-secondary-foreground border border-primary/20 text-[11px] font-semibold py-1 px-3">
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
                <linearGradient id="paretoBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.85} />
                  <stop offset="100%" stopColor="hsl(var(--primary) / 0.4)" stopOpacity={0.8} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border) / 0.6)"
              />

              <XAxis
                dataKey="decil_clientes"
                tick={{
                  fontSize: 11,
                  fill: "hsl(var(--muted-foreground))",
                  fontWeight: 500,
                }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />

              <YAxis
                yAxisId="left"
                orientation="left"
                tick={{
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
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
                  fill: "hsl(var(--muted-foreground))",
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
                    <div className="rounded-xl border border-border/80 bg-popover/95 backdrop-blur-xl p-3.5 shadow-xl text-xs space-y-1.5 min-w-[210px]">
                      <div className="flex items-center justify-between border-b border-border pb-1.5">
                        <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-primary" />
                          {label}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">
                          Decil Carteira
                        </span>
                      </div>

                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">Valor Acumulado:</span>
                          <span className="font-bold text-foreground">
                            {formatCurrency(item.valor_acumulado)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">% Carteira Total:</span>
                          <span className="font-bold text-primary">
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
                fill="url(#paretoBarGrad)"
                radius={[6, 6, 0, 0]}
                barSize={26}
                isAnimationActive={false}
              />

              <Line
                yAxisId="right"
                type="monotone"
                dataKey="percentual_pct"
                name="% Acumulado"
                stroke="hsl(var(--primary))"
                strokeWidth={2.8}
                dot={{
                  r: 3.5,
                  fill: "hsl(var(--primary))",
                  stroke: "hsl(var(--card))",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 6,
                  fill: "hsl(var(--primary))",
                  stroke: "hsl(var(--card))",
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rodapé Informativo Rápido */}
      <div className="px-6 py-3 bg-muted/40 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Foco Estratégico: 80% do valor retido com 20% do orçamento.</span>
        </div>
        <span className="font-mono text-[11px] text-primary">
          Curva 80/20 Homologada
        </span>
      </div>
    </div>
  );
}
