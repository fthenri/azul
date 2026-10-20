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
        color: "text-[#C43D4B] bg-[#C43D4B]/10 border-[#C43D4B]/20",
      };
    }
    if (risco >= 0.4) {
      return {
        label: "Moderado (40-70%)",
        icon: AlertTriangle,
        color: "text-[#B96B08] bg-[#B96B08]/10 border-[#B96B08]/20",
      };
    }
    return {
      label: "Controlado (< 40%)",
      icon: CheckCircle2,
      color: "text-[#16805D] bg-[#16805D]/10 border-[#16805D]/20",
    };
  };

  return (
    <Card className="flex flex-col bg-card border-border shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-azul-action" />
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              Matriz Estratégica: Personas × Faixa de Valor
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Mapeamento de prioridades de retenção e proteção de margem por perfil de viajante
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/60 text-secondary-foreground uppercase text-[11px] font-bold border-b border-border">
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
                  <tr key={item.persona} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      {item.persona}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-azul-navy dark:text-[#38BDF8]">
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
                    <td className="py-3.5 px-4 text-right font-semibold text-foreground">
                      {formatNumber(item.tamanho_bolha)} clientes
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {item.risco_evasao_medio >= 0.4 && item.clv_medio >= 4000 ? (
                        <span className="text-[#C43D4B] font-semibold">
                          Prioridade Máxima: Simulação Proativa
                        </span>
                      ) : item.risco_evasao_medio >= 0.4 ? (
                        <span className="text-[#B96B08] font-medium">
                          Atenção Operacional em Falhas
                        </span>
                      ) : (
                        <span className="text-[#16805D] font-medium">
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
