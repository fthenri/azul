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

const AZUL_COLORS = ["#003B7A", "#0077C8", "#16805D", "#B96B08", "#5B6E84"];

export function PersonasScatterChart({ data, isLoading }: PersonasScatterChartProps) {
  if (isLoading) {
    return (
      <Card className="h-[400px] bg-white border border-[#E2E8F0] shadow-xs">
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
      <Card className="h-[400px] bg-white border border-[#E2E8F0] shadow-xs">
        <CardHeader>
          <CardTitle className="text-base text-[#243447]">Mapa de Personas (CLV × Risco × Efeito Manada)</CardTitle>
          <CardDescription className="text-xs text-[#5B6E84]">Sem dados disponíveis</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center text-sm text-[#5B6E84]">
          Nenhuma persona retornada pelo backend.
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    risco_pct: Number((item.risco_evasao_medio * 100).toFixed(1)),
  }));

  const maxVolume = Math.max(...data.map((d) => d.tamanho_bolha), 100);
  const minVolume = Math.min(...data.map((d) => d.tamanho_bolha), 10);

  return (
    <Card className="flex flex-col bg-white border border-[#E2E8F0] shadow-xs">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-[#243447]">
              Mapa de Personas (CLV Médio × Risco de Evasão)
            </CardTitle>
            <CardDescription className="text-xs text-[#5B6E84]">
              Eixo X: Risco de Churn | Eixo Y: CLV Médio (R$) | Tamanho da Bolha: Efeito Manada (Volume)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                type="number"
                dataKey="risco_pct"
                name="Risco de Evasão"
                unit="%"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "#5B6E84" }}
                tickLine={false}
              />
              <YAxis
                type="number"
                dataKey="clv_medio"
                name="CLV Médio"
                tick={{ fontSize: 11, fill: "#5B6E84" }}
                tickFormatter={(val) => `R$ ${val}`}
                tickLine={false}
                axisLine={false}
              />
              <ZAxis
                type="number"
                dataKey="tamanho_bolha"
                range={[120, 850]}
                domain={[minVolume, maxVolume]}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload as PersonaData & { risco_pct: number };
                  return (
                    <div className="rounded-lg border border-[#E2E8F0] bg-white p-3 shadow-md text-xs space-y-1">
                      <p className="font-bold text-[#003B7A] text-sm border-b border-[#E2E8F0] pb-1">
                        {item.persona}
                      </p>
                      <p className="text-[#0077C8] font-semibold">
                        CLV Médio: {formatCurrency(item.clv_medio)}
                      </p>
                      <p className="text-[#C43D4B] font-semibold">
                        Risco de Evasão: {formatPercent(item.risco_evasao_medio)}
                      </p>
                      <p className="text-[#5B6E84] font-medium">
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
                    fill={AZUL_COLORS[index % AZUL_COLORS.length]}
                    fillOpacity={0.8}
                    stroke={AZUL_COLORS[index % AZUL_COLORS.length]}
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
