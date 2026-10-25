"use client";

import React, { useState, useEffect } from "react";
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
  ReferenceLine,
} from "recharts";
import { useTheme } from "next-themes";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { PersonaData } from "@/types/api";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/formatters";
import { Compass } from "lucide-react";

interface PersonasScatterChartProps {
  data?: PersonaData[];
  isLoading: boolean;
}

const getPersonaColor = (nome: string, _isDark?: boolean) => {
  if (nome.includes("Corporativo")) {
    return { fill: "hsl(var(--primary))", stroke: "hsl(var(--primary) / 0.8)", label: "Gestor Corporativo" };
  }
  if (nome.includes("Solo")) {
    return { fill: "hsl(var(--azul-action))", stroke: "hsl(var(--primary))", label: "Viajante Solo Premium" };
  }
  if (nome.includes("Familiar")) {
    return { fill: "hsl(var(--azul-success))", stroke: "hsl(var(--azul-success) / 0.8)", label: "Líder Familiar" };
  }
  return { fill: "hsl(var(--azul-warning))", stroke: "hsl(var(--azul-warning) / 0.8)", label: "Turista Eventual" };
};

export function PersonasScatterChart({ data, isLoading }: PersonasScatterChartProps) {
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
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-[290px] w-full rounded-xl" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="relative rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl p-6 shadow-sm h-[440px] flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground">Mapeamento de Personas: CLV vs Influência</h3>
          <p className="text-xs text-muted-foreground mt-1">Sem registros no momento.</p>
        </div>
        <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
          Nenhuma persona carregada pelo backend.
        </div>
      </div>
    );
  }

  const chartData = data.map((item) => {
    const clv = Number(item.clv_previsto ?? item.clv_medio ?? 0);
    const influencia = Number((item.score_influencia ?? 50).toFixed(1));
    const personaNome = item.persona_nome || item.persona;
    const colors = getPersonaColor(personaNome, isDark);

    return {
      ...item,
      persona: personaNome,
      score_influencia: influencia,
      clv_previsto: clv,
      tamanho_bolha: item.tamanho_bolha,
      fillColor: colors.fill,
      strokeColor: colors.stroke,
    };
  });

  const maxVolume = Math.max(...data.map((d) => d.tamanho_bolha), 100);
  const minVolume = Math.min(...data.map((d) => d.tamanho_bolha), 10);

  return (
    <div
      data-tour="personas-chart"
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
                <Compass className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                Mapeamento Multidimensional: CLV vs Influência
                <InfoTooltip
                  title="Segmentação 2D de Valor"
                  badge="Clusterização"
                  text="Segmentação 2D: cruza o Poder de Influência do cliente (impacto em reservas em grupo, PNR e rede de contatos) com a estimativa do valor de vida (CLV)."
                  side="bottom"
                />
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Eixo X: Score de Influência (0-100) | Eixo Y: CLV Médio | Tamanho da Bolha: Volume de Clientes
            </p>
          </div>

          <Badge className="w-fit bg-secondary text-secondary-foreground border border-primary/20 text-[11px] font-semibold py-1 px-3">
            Matriz 4 Quadrantes
          </Badge>
        </div>
      </div>

      {/* Área do Gráfico */}
      <div className="px-4 pt-2 pb-3 flex-1 min-h-[300px]">
        <div className="h-[290px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 15, right: 25, bottom: 12, left: 15 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(226, 232, 240, 0.9)"}
              />

              <XAxis
                type="number"
                dataKey="score_influencia"
                name="Score de Influência"
                domain={[0, 100]}
                tick={{
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
                }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />

              <YAxis
                type="number"
                dataKey="clv_previsto"
                name="CLV Médio"
                domain={[0, 42000]}
                tick={{
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
                }}
                tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                tickLine={false}
                axisLine={false}
                width={50}
              />

              <ZAxis
                type="number"
                dataKey="tamanho_bolha"
                range={[200, 1000]}
                domain={[minVolume, maxVolume]}
              />

              {/* Linhas de Referência dos Quadrantes Estratégicos */}
              <ReferenceLine
                x={50}
                stroke="hsl(var(--primary) / 0.3)"
                strokeDasharray="4 4"
              />
              <ReferenceLine
                y={15000}
                stroke="hsl(var(--primary) / 0.3)"
                strokeDasharray="4 4"
              />

              <Tooltip
                cursor={{ strokeDasharray: "3 3", stroke: "hsl(var(--primary))" }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload as PersonaData & {
                    score_influencia: number;
                    clv_previsto: number;
                  };

                  return (
                    <div className="rounded-xl border border-border/80 bg-popover/95 backdrop-blur-xl p-3.5 shadow-xl text-xs space-y-2 min-w-[220px]">
                      <div className="flex items-center justify-between border-b border-border pb-1.5">
                        <span className="font-bold text-foreground text-sm">
                          {item.persona}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                          Cluster Gold
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">CLV Médio:</span>
                          <span className="font-bold text-foreground">
                            {formatCurrency(item.clv_previsto || item.clv_medio)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Poder de Influência:</span>
                          <span className="font-bold text-azul-action dark:text-sky-400">
                            {item.score_influencia} / 100
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Tamanho da Base:</span>
                          <span className="font-semibold text-foreground">
                            {formatNumber(item.tamanho_bolha)} clientes
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-1 border-t border-border/50">
                          <span className="text-muted-foreground">Risco de Evasão:</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            {formatPercent(item.risco_evasao_medio)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />

              <Scatter
                name="Personas"
                data={chartData}
                isAnimationActive={false}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fillColor}
                    stroke={entry.strokeColor}
                    strokeWidth={2}
                    fillOpacity={0.85}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Legenda dos 4 Clusters */}
      <div className="px-6 py-3 bg-muted/40 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        {[
          { name: "Gestor Corporativo", conf: getPersonaColor("Corporativo", isDark) },
          { name: "Viajante Solo Premium", conf: getPersonaColor("Solo", isDark) },
          { name: "Líder Familiar", conf: getPersonaColor("Familiar", isDark) },
          { name: "Turista Eventual", conf: getPersonaColor("Eventual", isDark) },
        ].map(({ name, conf }) => (
          <div key={name} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: conf.fill }}
            />
            <span className="text-muted-foreground font-medium text-[11px]">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
