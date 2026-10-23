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
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { PersonaData } from "@/types/api";
import { formatCurrency, formatNumber } from "@/lib/formatters";

interface PersonasScatterChartProps {
  data?: PersonaData[];
  isLoading: boolean;
}

// Paleta visual corporativa Azul para os 4 quadrantes de negócio
const PERSONA_COLORS: Record<string, { fill: string; stroke: string }> = {
  "Gestor Corporativo": { fill: "#003B7A", stroke: "#002855" }, // Azul Marinho Institucional (Alto CLV / Alta Influência)
  "Viajante Solo Premium": { fill: "#0077C8", stroke: "#005a99" }, // Azul Royal (Alto CLV / Foco Individual)
  "Líder Familiar": { fill: "#16805D", stroke: "#0f5b42" }, // Verde Esmeralda (Alta Influência PNR / Fim de Semana)
  "Turista Eventual": { fill: "#B96B08", stroke: "#8c5006" }, // Âmbar / Ocre (Baixo CLV / Baixa Frequência)
};

const DEFAULT_COLOR = { fill: "#5B6E84", stroke: "#3d4b5a" };

export function PersonasScatterChart({ data, isLoading }: PersonasScatterChartProps) {
  if (isLoading) {
    return (
      <Card className="h-[430px] bg-card border-border shadow-xs">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="flex h-[320px] items-center justify-center">
          <Skeleton className="h-[270px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="h-[430px] bg-card border-border shadow-xs">
        <CardHeader>
          <CardTitle className="text-base text-foreground">Mapeamento de Personas: CLV vs Influência</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Sem dados disponíveis</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
          Nenhuma persona retornada pelo backend.
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => {
    const clv = Number(item.clv_previsto ?? item.clv_medio ?? 0);
    const influencia = Number((item.score_influencia ?? 50).toFixed(1));
    const personaNome = item.persona_nome || item.persona;
    const colorScheme = PERSONA_COLORS[personaNome] || DEFAULT_COLOR;

    return {
      ...item,
      persona: personaNome,
      clv_previsto: clv,
      score_influencia: influencia,
      fillColor: colorScheme.fill,
      strokeColor: colorScheme.stroke,
    };
  });

  const maxVolume = Math.max(...data.map((d) => d.tamanho_bolha), 100);
  const minVolume = Math.min(...data.map((d) => d.tamanho_bolha), 10);

  return (
    <Card className="flex flex-col bg-card border-border shadow-xs">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-foreground flex items-center">
              Mapeamento de Personas: CLV vs Influência
              <InfoTooltip text="Segmentação multidimensional orientada a valor: cruza o Poder de Influência do passageiro (PNR de grupo, rede e tier) com a projeção futura de CLV." />
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Eixo X: Poder de Influência (0 - 100) | Eixo Y: CLV (Valor Vitalício) | Tamanho da Bolha: Volume de Clientes
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 25, bottom: 20, left: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                dataKey="score_influencia"
                name="Poder de Influência (0 - 100)"
                unit=""
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
              />
              <YAxis
                type="number"
                dataKey="clv_previsto"
                name="CLV (Valor Vitalício)"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                tickLine={false}
                axisLine={false}
              />
              <ZAxis
                type="number"
                dataKey="tamanho_bolha"
                range={[160, 900]}
                domain={[minVolume, maxVolume]}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload as PersonaData & {
                    score_influencia: number;
                    clv_previsto: number;
                  };
                  return (
                    <div className="rounded-lg border border-border bg-popover p-3 shadow-md text-xs space-y-1.5">
                      <p className="font-bold text-azul-navy dark:text-[#38BDF8] text-sm border-b border-border pb-1">
                        {item.persona}
                      </p>
                      <p className="text-azul-action font-semibold">
                        CLV (Valor Vitalício): {formatCurrency(item.clv_previsto || item.clv_medio)}
                      </p>
                      <p className="text-[#003B7A] dark:text-sky-300 font-semibold">
                        Poder de Influência: {item.score_influencia} / 100
                      </p>
                      <p className="text-muted-foreground font-medium">
                        Base de Clientes: {formatNumber(item.tamanho_bolha)} clientes
                      </p>
                    </div>
                  );
                }}
              />
              <Scatter name="Personas" data={chartData}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fillColor}
                    fillOpacity={0.85}
                    stroke={entry.strokeColor}
                    strokeWidth={2}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Legenda visual dos 4 quadrantes para o pitch */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs pt-3 border-t border-border/50">
          {Object.entries(PERSONA_COLORS).map(([name, { fill }]) => (
            <div key={name} className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: fill }} />
              <span className="font-medium text-foreground">{name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
