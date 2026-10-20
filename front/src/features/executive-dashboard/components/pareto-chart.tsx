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
import { ParetoData } from "@/types/api";
import { formatCurrency, formatPercent } from "@/lib/formatters";

interface ParetoChartProps {
  data?: ParetoData[];
  isLoading: boolean;
}

export function ParetoChart({ data, isLoading }: ParetoChartProps) {
  if (isLoading) {
    return (
      <Card className="h-[400px]">
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
      <Card className="h-[400px]">
        <CardHeader>
          <CardTitle>Curva de Concentração de Valor (Pareto)</CardTitle>
          <CardDescription>Sem dados disponíveis no momento</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
          Nenhum dado de concentração retornado pelo backend.
        </CardContent>
      </Card>
    );
  }

  // Prepara dados com percentual em base 100 para o eixo secundário
  const chartData = data.map((item) => ({
    ...item,
    percentual_pct: item.percentual_acumulado * 100,
  }));

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Curva de Concentração de Valor (Pareto 80/20)
            </CardTitle>
            <CardDescription className="text-xs">
              Valor acumulado (R$) por decil de clientes e percentual acumulado sobre o total da carteira
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
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="decil_clientes"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
              />
              {/* Eixo Esquerdo: Valor Monetário */}
              <YAxis
                yAxisId="left"
                orientation="left"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickFormatter={(val) => `R$ ${(val / 1000000).toFixed(1)}M`}
                tickLine={false}
                axisLine={false}
              />
              {/* Eixo Direito: Percentual Acumulado */}
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "#64748b" }}
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
                      <p className="font-bold text-foreground mb-1">{label}</p>
                      <p className="text-blue-600 font-medium">
                        Valor Acumulado: {formatCurrency(item.valor_acumulado)}
                      </p>
                      <p className="text-amber-600 font-medium">
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
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
                barSize={28}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="percentual_pct"
                name="% Acumulado"
                stroke="#d97706"
                strokeWidth={3}
                dot={{ r: 4, fill: "#d97706" }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
