"use client";

import React from "react";
import { Users, AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PersonaData } from "@/types/api";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/formatters";

interface PersonaMatrixProps {
  data?: PersonaData[];
}

export function PersonaMatrix({ data }: PersonaMatrixProps) {
  if (!data || data.length === 0) return null;

  // Classifica faixa de valor e criticidade de risco sem mutar ou inventar endpoints
  const getFaixaValor = (clv: number) => {
    if (clv >= 7000) return { label: "Tier Alto Valor", badge: "default" as const };
    if (clv >= 3000) return { label: "Tier Médio Valor", badge: "secondary" as const };
    return { label: "Tier Entrada", badge: "outline" as const };
  };

  const getCriticidade = (risco: number) => {
    if (risco >= 0.7) {
      return {
        label: "Crítico (> 70%)",
        icon: ShieldAlert,
        color: "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900",
      };
    }
    if (risco >= 0.4) {
      return {
        label: "Moderado (40-70%)",
        icon: AlertTriangle,
        color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900",
      };
    }
    return {
      label: "Controlado (< 40%)",
      icon: CheckCircle2,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900",
    };
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          <div>
            <CardTitle className="text-base font-semibold">
              Matriz Estratégica: Personas × Faixa de Valor
            </CardTitle>
            <CardDescription className="text-xs">
              Mapeamento de prioridades de retenção e proteção de margem por perfil de viajante
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold border-b">
              <tr>
                <th className="py-3 px-4">Persona</th>
                <th className="py-3 px-4">Faixa de Valor (CLV Médio)</th>
                <th className="py-3 px-4 text-center">Risco de Evasão</th>
                <th className="py-3 px-4 text-right">Efeito Manada (Volume)</th>
                <th className="py-3 px-4">Diretriz Estratégica</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((item) => {
                const faixa = getFaixaValor(item.clv_medio);
                const criticidade = getCriticidade(item.risco_evasao_medio);
                const CritIcon = criticidade.icon;

                return (
                  <tr key={item.persona} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {item.persona}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-600">
                          {formatCurrency(item.clv_medio)}
                        </span>
                        <Badge variant={faixa.badge} className="text-[10px]">
                          {faixa.label}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${criticidade.color}`}
                      >
                        <CritIcon className="h-3.5 w-3.5" />
                        <span>{formatPercent(item.risco_evasao_medio)}</span>
                        <span className="text-[10px] font-normal opacity-80 hidden sm:inline">
                          ({criticidade.label.split(" ")[0]})
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-foreground">
                      {formatNumber(item.tamanho_bolha)} clientes
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {item.risco_evasao_medio >= 0.4 && item.clv_medio >= 4000 ? (
                        <span className="text-rose-700 dark:text-rose-400 font-medium">
                          Prioridade Máxima: Simulação Proativa
                        </span>
                      ) : item.risco_evasao_medio >= 0.4 ? (
                        <span className="text-amber-700 dark:text-amber-400">
                          Atenção Operacional em Falhas
                        </span>
                      ) : (
                        <span className="text-emerald-700 dark:text-emerald-400">
                          Fidelização Contínua
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
