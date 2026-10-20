"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ShapResponse } from "@/types/api";
import { formatPercent } from "@/lib/formatters";

interface ShapChartProps {
  data?: ShapResponse | null;
  isLoading: boolean;
  decisaoId?: string;
}

export function ShapChart({ data, isLoading, decisaoId }: ShapChartProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[220px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base">Explicabilidade dos Fatores (SHAP)</CardTitle>
          <CardDescription className="text-xs">
            Selecione uma decisão na tabela para analisar os fatores que influenciaram o risco
          </CardDescription>
        </CardHeader>
        <CardContent className="flex h-[280px] items-center justify-center text-xs text-muted-foreground">
          Nenhuma decisão selecionada para inspeção de SHAP.
        </CardContent>
      </Card>
    );
  }

  // Ordena fatores pelo valor absoluto do impacto
  const sortedFatores = [...data.fatores].sort(
    (a, b) => Math.abs(b.impacto) - Math.abs(a.impacto)
  );

  const chartData = sortedFatores.map((f) => ({
    variavel: f.variavel,
    impacto_pct: Number((f.impacto * 100).toFixed(1)),
    impacto_raw: f.impacto,
    direcao: f.direcao,
  }));

  // Soma dos impactos
  const somaImpactos = data.fatores.reduce((acc, f) => acc + f.impacto, 0);
  const riscoFinalEstimado = Math.max(0, Math.min(1, data.risco_base + somaImpactos));

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold">
              Explicabilidade de Risco (Pesos SHAP)
            </CardTitle>
            <CardDescription className="text-xs">
              Decomposição aditiva dos fatores operacionais e comportamentais na pontuação de dor
            </CardDescription>
          </div>
          {decisaoId && (
            <Badge variant="outline" className="font-mono text-xs w-fit">
              Decisão: {decisaoId}
            </Badge>
          )}
        </div>

        {/* Resumo Risco Base vs Risco Final */}
        <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
          <div className="rounded-lg bg-muted/50 p-2.5 border border-border">
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
              Risco Base (Prior da Carteira)
            </span>
            <span className="text-base font-bold text-foreground">
              {formatPercent(data.risco_base)}
            </span>
          </div>
          <div className="rounded-lg bg-blue-50/60 dark:bg-blue-950/30 p-2.5 border border-blue-200 dark:border-blue-900">
            <span className="text-blue-700 dark:text-blue-300 block text-[10px] uppercase font-semibold">
              Risco Ponderado Final
            </span>
            <span className="text-base font-bold text-blue-600 dark:text-blue-400">
              {formatPercent(riscoFinalEstimado)}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis
                type="number"
                unit="%"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="variavel"
                width={160}
                tick={{ fontSize: 10, fill: "#334155" }}
                tickLine={false}
              />
              <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1.5} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload;
                  const isAumenta = item.impacto_raw > 0;
                  return (
                    <div className="rounded-lg border border-border bg-popover p-3 shadow-md text-xs space-y-1">
                      <p className="font-bold text-foreground">{item.variavel}</p>
                      <p
                        className={`font-semibold ${
                          isAumenta ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        Impacto no Risco: {item.impacto_raw > 0 ? "+" : ""}
                        {formatPercent(item.impacto_raw)}
                      </p>
                      <p className="text-muted-foreground text-[10px]">
                        {isAumenta
                          ? "Eleva a propensão de churn (atrito operacional)"
                          : "Reduz a propensão de churn (fator protetor)"}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="impacto_pct" radius={[0, 4, 4, 0]} barSize={18}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.impacto_raw > 0 ? "#e11d48" : "#10b981"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-center gap-6 mt-2 pt-2 border-t border-border text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-rose-600" />
            <span>Eleva o Risco de Churn (Fator de Atrito)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-emerald-500" />
            <span>Reduz o Risco de Churn (Fator Protetor)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
