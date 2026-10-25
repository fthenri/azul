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

const getPersonaColor = (nome: string, isDark: boolean) => {
  if (nome.includes("Corporativo")) {
    return isDark
      ? { fill: "#38BDF8", stroke: "#0284C7", label: "Gestor Corporativo" }
      : { fill: "#003B7A", stroke: "#002855", label: "Gestor Corporativo" };
  }
  if (nome.includes("Solo")) {
    return isDark
      ? { fill: "#00A3FF", stroke: "#0A84FF", label: "Viajante Solo Premium" }
      : { fill: "#0077C8", stroke: "#005a99", label: "Viajante Solo Premium" };
  }
  if (nome.includes("Familiar")) {
    return isDark
      ? { fill: "#34D399", stroke: "#059669", label: "Líder Familiar" }
      : { fill: "#16805D", stroke: "#0f5b42", label: "Líder Familiar" };
  }
  return isDark
    ? { fill: "#FBBF24", stroke: "#D97706", label: "Turista Eventual" }
    : { fill: "#B96B08", stroke: "#8c5006", label: "Turista Eventual" };
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
      <div className="relative rounded-2xl border border-border/80 dark:border-white/10 bg-card/80 dark:bg-[#071120]/80 backdrop-blur-xl p-6 shadow-sm space-y-4 h-[440px]">
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
      <div className="relative rounded-2xl border border-border/80 dark:border-white/10 bg-card/80 dark:bg-[#071120]/80 backdrop-blur-xl p-6 shadow-sm h-[440px] flex flex-col justify-between">
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
    <div className="group relative rounded-2xl border border-border/80 dark:border-white/10 bg-card/80 dark:bg-[#071120]/80 backdrop-blur-xl shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
      {/* Feixe Superior Luminous Edge Highlight */}
      <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#0077C8]/50 dark:via-sky-400/80 to-transparent" />

      {/* Header do Gráfico */}
      <div className="p-6 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/10 dark:bg-sky-500/15 text-[#0077C8] dark:text-sky-400 border border-sky-500/20">
                <Compass className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                Mapeamento Multidimensional: CLV vs Influência
                <InfoTooltip text="Segmentação 2D: cruza o Poder de Influência do cliente (impacto em reservas em grupo, PNR e rede de contatos) com a estimativa do valor de vida (CLV)." />
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Eixo X: Score de Influência (0-100) | Eixo Y: CLV Médio | Tamanho da Bolha: Volume de Clientes
            </p>
          </div>

          <Badge className="w-fit bg-[#EAF4FC] dark:bg-sky-950/60 text-[#003B7A] dark:text-sky-300 border border-[#0077C8]/25 dark:border-sky-500/30 text-[11px] font-semibold py-1 px-3">
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
                  fill: isDark ? "#94A3B8" : "#5B6E84",
                }}
                tickLine={false}
                axisLine={{ stroke: isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0" }}
              />

              <YAxis
                type="number"
                dataKey="clv_previsto"
                name="CLV Médio"
                domain={[0, 42000]}
                tick={{
                  fontSize: 10,
                  fill: isDark ? "#94A3B8" : "#5B6E84",
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
                stroke={isDark ? "rgba(56, 189, 248, 0.3)" : "rgba(0, 119, 200, 0.3)"}
                strokeDasharray="4 4"
              />
              <ReferenceLine
                y={15000}
                stroke={isDark ? "rgba(56, 189, 248, 0.3)" : "rgba(0, 119, 200, 0.3)"}
                strokeDasharray="4 4"
              />

              <Tooltip
                cursor={{ strokeDasharray: "3 3", stroke: isDark ? "#38BDF8" : "#0077C8" }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload as PersonaData & {
                    score_influencia: number;
                    clv_previsto: number;
                  };

                  return (
                    <div className="rounded-xl border border-border/80 dark:border-white/15 bg-white/95 dark:bg-[#071120]/95 backdrop-blur-xl p-3.5 shadow-xl text-xs space-y-2 min-w-[220px]">
                      <div className="flex items-center justify-between border-b border-border dark:border-white/10 pb-1.5">
                        <span className="font-bold text-[#003B7A] dark:text-sky-300 text-sm">
                          {item.persona}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-azul-action dark:text-sky-400 font-semibold">
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

                        <div className="flex justify-between items-center pt-1 border-t border-border/50 dark:border-white/5">
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
      <div className="px-6 py-3 bg-muted/40 dark:bg-white/[0.02] border-t border-border/60 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
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
