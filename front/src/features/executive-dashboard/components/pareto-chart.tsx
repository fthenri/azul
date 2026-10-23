"use client";

import React from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { ParetoData } from "@/types/api";
import { formatCurrency, formatPercent } from "@/lib/formatters";

interface ParetoChartProps {
  data?: ParetoData[];
  isLoading: boolean;
}

export function ParetoChart({ data, isLoading }: ParetoChartProps) {
  if (isLoading) {
    return (
      <Card className="h-[400px] bg-card border-border shadow-xs">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="h-[400px] bg-card border-border shadow-xs">
        <CardHeader>
          <CardTitle className="text-base text-foreground">Curva de Concentração de Valor (Pareto)</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Sem dados disponíveis</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
          Nenhum dado de concentração retornado pelo backend.
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    percentual_pct: item.percentual_acumulado * 100,
  }));

  return (
    <Card className="flex flex-col bg-card border-border shadow-xs">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-foreground flex items-center">
              Curva de Concentração de Valor (Pareto 80/20)
              <InfoTooltip text="Concentração de receita: identifica a pequena parcela de clientes que sustenta o faturamento." />
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Valor acumulado (R$) por decil e percentual acumulado sobre o total da carteira
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="decil_clientes"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(val) => `R$ ${(val / 1000000).toFixed(1)}M`}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(val) => `${val}%`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload as ParetoData & { percentual_pct: number };
                  return (
                    <div className="rounded-lg border border-border bg-popover p-3 shadow-md text-xs">
                      <p className="font-bold text-popover-foreground mb-1">{label}</p>
                      <p className="text-azul-navy dark:text-[#38BDF8] font-semibold">
                        Valor Acumulado: {formatCurrency(item.valor_acumulado)}
                      </p>
                      <p className="text-azul-action font-semibold">
                        Percentual Acumulado: {formatPercent(item.percentual_acumulado)}
                      </p>
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 10, fontSize: 12 }}
              />
              <Bar
                yAxisId="left"
                dataKey="valor_acumulado"
                name="Valor Acumulado (R$)"
                fill="#003B7A"
                radius={[4, 4, 0, 0]}
                barSize={28}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="percentual_pct"
                name="% Acumulado"
                stroke="#0077C8"
                strokeWidth={3}
                dot={{ r: 4, fill: "#0077C8" }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
