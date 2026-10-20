"use client";

import React from "react";
import { Scale, Trophy, DollarSign, TrendingUp, CheckCircle, AlertOctagon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SimularResponse } from "@/types/api";
import { formatCurrency } from "@/lib/formatters";

interface ArbitrationPanelProps {
  result?: SimularResponse | null;
}

export function ArbitrationPanel({ result }: ArbitrationPanelProps) {
  if (!result) return null;

  const { uplift_status, ranking_acoes, decisao_final } = result;
  const isBloqueada = decisao_final.acao_vencedora.toLowerCase().includes("bloqueada");

  return (
    <Card className="flex flex-col border-blue-200 dark:border-blue-900/50 shadow-sm">
      <CardHeader className="pb-3 bg-muted/20 border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-base font-semibold">
                Decisão do Árbitro Matemático
              </CardTitle>
              <CardDescription className="text-xs">
                Otimização de Uplift: Seleção da ação com maior retorno líquido preservando o teto de gastos
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Classificação Uplift:</span>
            <Badge variant="default" className="bg-blue-600 text-xs">
              {uplift_status}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Ação Vencedora / Destaque */}
        <div
          className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
            isBloqueada
              ? "border-amber-300 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-800"
              : "border-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/30 dark:border-emerald-800"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                isBloqueada ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"
              }`}
            >
              {isBloqueada ? <AlertOctagon className="h-5 w-5" /> : <Trophy className="h-5 w-5" />}
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Ação Arbitrada Final
              </span>
              <h4 className="text-base font-bold text-foreground">
                {decisao_final.acao_vencedora}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <Badge variant={isBloqueada ? "warning" : "success"} className="text-xs">
              {isBloqueada ? "Ação Bloqueada" : "Aprovado para Execução"}
            </Badge>
          </div>
        </div>

        {/* Ranking de Ações Avaliadas */}
        <div>
          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Ranking Comparativo de Custos & Retorno Líquido
          </h5>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">Posição / Ação</th>
                  <th className="py-2.5 px-3 text-right">Custo da Ação</th>
                  <th className="py-2.5 px-3 text-right">Retorno Líquido Estimado</th>
                  <th className="py-2.5 px-3 text-center">Status no Árbitro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ranking_acoes.map((item, idx) => {
                  const isWinner = item.acao === decisao_final.acao_vencedora;
                  return (
                    <tr
                      key={item.acao}
                      className={`transition-colors ${
                        isWinner
                          ? "bg-blue-50/50 dark:bg-blue-950/20 font-semibold"
                          : "hover:bg-muted/30"
                      }`}
                    >
                      <td className="py-3 px-3 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-foreground">{item.acao}</span>
                        {isWinner && (
                          <Badge variant="default" className="text-[9px] py-0 px-1 bg-blue-600">
                            Vencedora
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-muted-foreground">
                        {formatCurrency(item.custo_acao)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(item.retorno_liquido)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.retorno_liquido > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                            <CheckCircle className="h-3 w-3" /> ROI Positivo
                          </span>
                        ) : (
                          <span className="text-[11px] text-destructive font-medium">
                            Inviável
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
