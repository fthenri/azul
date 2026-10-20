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
      <Card className="h-full bg-white border border-[#E2E8F0] shadow-xs">
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
      <Card className="h-full bg-white border border-[#E2E8F0] shadow-xs">
        <CardHeader>
          <CardTitle className="text-base text-[#243447]">Explicabilidade dos Fatores (SHAP)</CardTitle>
          <CardDescription className="text-xs text-[#5B6E84]">
            Selecione uma decisão na tabela para analisar os fatores que influenciaram o risco
          </CardDescription>
        </CardHeader>
        <CardContent className="flex h-[280px] items-center justify-center text-xs text-[#5B6E84]">
          Nenhuma decisão selecionada para inspeção de SHAP.
        </CardContent>
      </Card>
    );
  }

  const sortedFatores = [...data.fatores].sort(
    (a, b) => Math.abs(b.impacto) - Math.abs(a.impacto)
  );

  const chartData = sortedFatores.map((f) => ({
    variavel: f.variavel,
    impacto_pct: Number((f.impacto * 100).toFixed(1)),
    impacto_raw: f.impacto,
    direcao: f.direcao,
  }));

  const somaImpactos = data.fatores.reduce((acc, f) => acc + f.impacto, 0);
  const riscoFinalEstimado = Math.max(0, Math.min(1, data.risco_base + somaImpactos));

  return (
    <Card className="flex flex-col bg-white border border-[#E2E8F0] shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold text-[#243447]">
              Explicabilidade de Risco (Pesos SHAP)
            </CardTitle>
            <CardDescription className="text-xs text-[#5B6E84]">
              Decomposição aditiva dos fatores operacionais e comportamentais na pontuação de dor
            </CardDescription>
          </div>
          {decisaoId && (
            <Badge variant="outline" className="font-mono text-xs w-fit bg-[#EAF4FC] text-[#003B7A] border-[#0077C8]/40">
              Decisão: {decisaoId}
            </Badge>
          )}
        </div>

        {/* Resumo Risco Base vs Risco Final */}
        <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
          <div className="rounded-lg bg-[#F4F7FA] p-2.5 border border-[#E2E8F0]">
            <span className="text-[#5B6E84] block text-[10px] uppercase font-bold">
              Risco Base (Prior da Carteira)
            </span>
            <span className="text-base font-bold text-[#243447]">
              {formatPercent(data.risco_base)}
            </span>
          </div>
          <div className="rounded-lg bg-[#EAF4FC] p-2.5 border border-[#0077C8]/30">
            <span className="text-[#003B7A] block text-[10px] uppercase font-bold">
              Risco Ponderado Final
            </span>
            <span className="text-base font-bold text-[#0077C8]">
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
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
              <XAxis
                type="number"
                unit="%"
                tick={{ fontSize: 11, fill: "#5B6E84" }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="variavel"
                width={160}
                tick={{ fontSize: 10, fill: "#243447" }}
                tickLine={false}
              />
              <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1.5} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload;
                  const isAumenta = item.impacto_raw > 0;
                  return (
                    <div className="rounded-lg border border-[#E2E8F0] bg-white p-3 shadow-md text-xs space-y-1">
                      <p className="font-bold text-[#243447]">{item.variavel}</p>
                      <p
                        className={`font-semibold ${
                          isAumenta ? "text-[#C43D4B]" : "text-[#16805D]"
                        }`}
                      >
                        Impacto no Risco: {item.impacto_raw > 0 ? "+" : ""}
                        {formatPercent(item.impacto_raw)}
                      </p>
                      <p className="text-[#5B6E84] text-[10px]">
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
                    fill={entry.impacto_raw > 0 ? "#C43D4B" : "#16805D"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-center gap-6 mt-2 pt-2 border-t border-[#E2E8F0] text-[11px] text-[#5B6E84]">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-[#C43D4B]" />
            <span>Eleva o Risco de Churn (Fator de Atrito)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-[#16805D]" />
            <span>Reduz o Risco de Churn (Fator Protetor)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
