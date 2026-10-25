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
import { cn } from "@/lib/utils";

interface ShapChartProps {
  data?: ShapResponse | null;
  isLoading: boolean;
  decisaoId?: string;
  hideHeader?: boolean;
  className?: string;
}

export function ShapChart({
  data,
  isLoading,
  decisaoId,
  hideHeader = false,
  className,
}: ShapChartProps) {
  if (isLoading) {
    return (
      <Card className={cn("h-full bg-card border-border shadow-xs", className)}>
        {!hideHeader && (
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
        )}
        <CardContent className="space-y-4 pt-4">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-[220px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={cn("h-full bg-card border-border shadow-xs", className)}>
        {!hideHeader && (
          <CardHeader>
            <CardTitle className="text-base text-foreground">
              Explicabilidade dos Fatores (SHAP)
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Decomposição aditiva dos fatores operacionais e comportamentais na pontuação de risco
            </CardDescription>
          </CardHeader>
        )}
        <CardContent className="flex h-[240px] items-center justify-center text-xs text-muted-foreground">
          Nenhum dado de explicabilidade SHAP disponível para o evento/cliente selecionado.
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
    <Card className={cn("flex flex-col bg-card border-border shadow-xs", className)}>
      {!hideHeader && (
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Explicabilidade de Risco (Pesos SHAP)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Decomposição aditiva dos fatores operacionais e comportamentais na pontuação de dor
              </CardDescription>
            </div>
            {decisaoId && (
              <Badge
                variant="outline"
                className="font-mono text-xs w-fit bg-secondary text-secondary-foreground border-border"
              >
                {decisaoId.startsWith("dec_") ? `Decisão: ${decisaoId}` : `Alvo: ${decisaoId}`}
              </Badge>
            )}
          </div>
        </CardHeader>
      )}

      <CardContent className={cn("space-y-4", hideHeader ? "pt-4" : "pt-1")}>
        {/* Resumo Risco Base vs Risco Final */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="grid grid-cols-2 gap-3 flex-1 text-xs">
            <div className="rounded-lg bg-muted/40 p-2.5 border border-border">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                Risco Base (Prior da Carteira)
              </span>
              <span className="text-base font-bold text-foreground">
                {formatPercent(data.risco_base)}
              </span>
            </div>
            <div className="rounded-lg bg-primary/10 p-2.5 border border-primary/20">
              <span className="text-primary block text-[10px] uppercase font-bold">
                Risco Ponderado Final
              </span>
              <span className="text-base font-bold text-primary">
                {formatPercent(riscoFinalEstimado)}
              </span>
            </div>
          </div>

          {hideHeader && decisaoId && (
            <Badge
              variant="outline"
              className="font-mono text-xs self-start sm:self-center bg-secondary text-secondary-foreground border-border"
            >
              {decisaoId.startsWith("dec_") ? `Decisão: ${decisaoId}` : `Alvo: ${decisaoId}`}
            </Badge>
          )}
        </div>

        {/* Gráfico de Barras SHAP */}
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-border" />
              <XAxis
                type="number"
                unit="%"
                tick={{ fontSize: 11, fill: "currentColor" }}
                className="text-muted-foreground"
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="variavel"
                width={170}
                tick={{ fontSize: 10, fill: "currentColor" }}
                className="text-foreground"
                tickLine={false}
              />
              <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload;
                  const isAumenta = item.impacto_raw > 0;
                  return (
                    <div className="rounded-lg border border-border bg-card p-3 shadow-md text-xs space-y-1">
                      <p className="font-bold text-foreground">{item.variavel}</p>
                      <p
                        className={`font-semibold ${
                          isAumenta ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        Impacto no Risco: {item.impacto_raw > 0 ? "+" : ""}
                        {formatPercent(item.impacto_raw)}
                      </p>
                      <p className="text-muted-foreground text-[10px]">
                        {isAumenta
                          ? "Eleva a propensão de churn (fator de atrito operacional)"
                          : "Reduz a propensão de churn (fator protetor de fidelidade)"}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="impacto_pct" radius={[0, 4, 4, 0]} barSize={18}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.impacto_raw > 0 ? "hsl(var(--destructive))" : "hsl(var(--azul-success))"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 pt-2 border-t border-border text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-rose-500" />
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
