"use client";

import React from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PersonaData } from "@/types/api";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/formatters";

interface PersonasScatterChartProps {
  data?: PersonaData[];
  isLoading: boolean;
}

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

export function PersonasScatterChart({ data, isLoading }: PersonasScatterChartProps) {
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
          <CardTitle>Mapa de Personas (CLV × Risco × Efeito Manada)</CardTitle>
          <CardDescription>Sem dados disponíveis</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
          Nenhuma persona retornada pelo backend.
        </CardContent>
      </Card>
    );
  }

  // Prepara dados transformando risco para escala percentual (0 a 100)
  const chartData = data.map((item) => ({
    ...item,
    risco_pct: Number((item.risco_evasao_medio * 100).toFixed(1)),
  }));

  const maxVolume = Math.max(...data.map((d) => d.tamanho_bolha), 100);
  const minVolume = Math.min(...data.map((d) => d.tamanho_bolha), 10);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Mapa de Personas (CLV Médio × Risco de Evasão)
            </CardTitle>
            <CardDescription className="text-xs">
              Eixo X: Risco de Churn | Eixo Y: CLV Médio (R$) | Tamanho da Bolha: Efeito Manada (Volume)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                type="number"
                dataKey="risco_pct"
                name="Risco de Evasão"
                unit="%"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
              />
              <YAxis
                type="number"
                dataKey="clv_medio"
                name="CLV Médio"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickFormatter={(val) => `R$ ${val}`}
                tickLine={false}
                axisLine={false}
              />
              <ZAxis
                type="number"
                dataKey="tamanho_bolha"
                range={[120, 900]}
                domain={[minVolume, maxVolume]}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload as PersonaData & { risco_pct: number };
                  return (
                    <div className="rounded-lg border border-border bg-popover p-3 shadow-md text-xs space-y-1">
                      <p className="font-bold text-foreground text-sm border-b pb-1">
                        {item.persona}
                      </p>
                      <p className="text-blue-600 font-medium">
                        CLV Médio: {formatCurrency(item.clv_medio)}
                      </p>
                      <p className="text-rose-600 font-medium">
                        Risco de Evasão: {formatPercent(item.risco_evasao_medio)}
                      </p>
                      <p className="text-slate-600 dark:text-slate-400 font-medium">
                        Efeito Manada: {formatNumber(item.tamanho_bolha)} clientes
                      </p>
                    </div>
                  );
                }}
              />
              <Scatter name="Personas" data={chartData}>
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    fillOpacity={0.75}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
