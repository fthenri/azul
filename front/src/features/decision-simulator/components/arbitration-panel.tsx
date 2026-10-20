"use client";

import React from "react";
import { Scale, Trophy, CheckCircle, AlertOctagon } from "lucide-react";
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
    <Card className="flex flex-col border border-[#E2E8F0] bg-white shadow-xs">
      <CardHeader className="pb-3 bg-[#F4F7FA]/70 border-b border-[#E2E8F0]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-[#003B7A]" />
            <div>
              <CardTitle className="text-base font-bold text-[#243447]">
                Decisão do Árbitro Matemático
              </CardTitle>
              <CardDescription className="text-xs text-[#5B6E84]">
                Otimização de Uplift: Seleção da melhor ação preservando o teto de gastos
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#5B6E84] font-medium">Classificação Uplift:</span>
            <Badge className="bg-[#0077C8] text-white text-xs font-bold">
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
              ? "border-[#B96B08]/30 bg-[#B96B08]/10"
              : "border-[#16805D]/30 bg-[#16805D]/10"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                isBloqueada ? "bg-[#B96B08] text-white" : "bg-[#16805D] text-white"
              }`}
            >
              {isBloqueada ? <AlertOctagon className="h-5 w-5" /> : <Trophy className="h-5 w-5" />}
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B6E84]">
                Ação Arbitrada Final
              </span>
              <h4 className="text-base font-bold text-[#243447]">
                {decisao_final.acao_vencedora}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <Badge variant={isBloqueada ? "warning" : "success"} className="text-xs font-bold">
              {isBloqueada ? "Ação Bloqueada" : "Aprovado para Execução"}
            </Badge>
          </div>
        </div>

        {/* Ranking de Ações Avaliadas */}
        <div>
          <h5 className="text-xs font-bold text-[#5B6E84] uppercase tracking-wider mb-2">
            Ranking Comparativo de Custos & Retorno Líquido
          </h5>
          <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EAF4FC]/60 text-[#003B7A] uppercase text-[11px] font-bold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-2.5 px-3">Posição / Ação</th>
                  <th className="py-2.5 px-3 text-right">Custo da Ação</th>
                  <th className="py-2.5 px-3 text-right">Retorno Líquido Estimado</th>
                  <th className="py-2.5 px-3 text-center">Status no Árbitro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {ranking_acoes.map((item, idx) => {
                  const isWinner = item.acao === decisao_final.acao_vencedora;
                  return (
                    <tr
                      key={item.acao}
                      className={`transition-colors ${
                        isWinner
                          ? "bg-[#EAF4FC]/70 font-semibold"
                          : "hover:bg-[#F4F7FA]/70"
                      }`}
                    >
                      <td className="py-3 px-3 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E2E8F0] text-[10px] font-bold text-[#003B7A]">
                          {idx + 1}
                        </span>
                        <span className="text-[#243447]">{item.acao}</span>
                        {isWinner && (
                          <Badge className="text-[9px] py-0 px-1 bg-[#0077C8] text-white">
                            Vencedora
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-[#5B6E84]">
                        {formatCurrency(item.custo_acao)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-[#16805D]">
                        {formatCurrency(item.retorno_liquido)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.retorno_liquido > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#16805D] font-medium">
                            <CheckCircle className="h-3 w-3" /> ROI Positivo
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#C43D4B] font-medium">
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
