"use client";

import React from "react";
import { FileText, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DecisaoAuditoria, ShapResponse } from "@/types/api";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { ShapChart } from "./shap-chart";

interface DecisionDetailDrawerProps {
  decisao: DecisaoAuditoria | null;
  shapData?: ShapResponse | null;
  isLoadingShap: boolean;
  shapError: Error | null;
}

export function DecisionDetailDrawer({
  decisao,
  shapData,
  isLoadingShap,
  shapError,
}: DecisionDetailDrawerProps) {
  if (!decisao) {
    return (
      <Card className="h-full flex flex-col justify-center items-center p-8 text-center text-[#5B6E84] text-xs bg-white border border-[#E2E8F0] shadow-xs">
        <FileText className="h-10 w-10 mb-3 opacity-30 text-[#0077C8]" />
        <h4 className="font-bold text-[#243447] text-sm">Inspeção Detalhada de Decisão</h4>
        <p className="mt-1 max-w-xs">
          Clique em &quot;Detalhes&quot; ou selecione uma linha na tabela para inspecionar os metadados de MLOps e os fatores SHAP.
        </p>
      </Card>
    );
  }

  const isBloqueada = !!decisao.motivo_bloqueio;

  return (
    <div className="space-y-6">
      {/* 1. Card com Metadados da Decisão */}
      <Card className="border border-[#E2E8F0] bg-white shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#0077C8]" />
              <CardTitle className="text-base font-bold text-[#243447]">
                Registro de Auditoria #{decisao.decisao_id}
              </CardTitle>
            </div>
            <Badge variant={isBloqueada ? "warning" : "success"} className="text-xs font-bold">
              {isBloqueada ? "Ação Bloqueada" : "Ação Concedida"}
            </Badge>
          </div>
          <CardDescription className="text-xs text-[#5B6E84]">
            Metadados persistidos pelo motor para governança e compliance
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-xs">
          {/* Informações Principais */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-lg bg-[#F4F7FA] border border-[#E2E8F0]">
              <span className="text-[#5B6E84] block text-[10px] uppercase font-bold">
                Cliente Alvo
              </span>
              <span className="font-mono font-bold text-[#003B7A]">
                {decisao.cliente_id}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#F4F7FA] border border-[#E2E8F0]">
              <span className="text-[#5B6E84] block text-[10px] uppercase font-bold">
                Tipo de Gatilho
              </span>
              <span className="font-bold text-[#243447]">
                {decisao.tipo_simulacao}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#F4F7FA] border border-[#E2E8F0]">
              <span className="text-[#5B6E84] block text-[10px] uppercase font-bold">
                Data do Registro
              </span>
              <span className="text-[#243447]">
                {formatDateTime(decisao.data_decisao)}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#F4F7FA] border border-[#E2E8F0]">
              <span className="text-[#5B6E84] block text-[10px] uppercase font-bold">
                Custo Realizado
              </span>
              <span className="font-bold text-[#243447]">
                {formatCurrency(decisao.custo_realizado)}
              </span>
            </div>
          </div>

          {/* Bloqueio se houver */}
          {isBloqueada && (
            <div className="rounded-lg border border-[#B96B08]/30 bg-[#B96B08]/10 p-3 text-[#B96B08]">
              <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                <AlertTriangle className="h-4 w-4 text-[#B96B08]" />
                <span>Justificativa do Bloqueio:</span>
              </div>
              <p className="text-xs font-medium">{decisao.motivo_bloqueio}</p>
            </div>
          )}

          {/* Versões dos Modelos Matemáticos */}
          <div className="pt-2 border-t border-[#E2E8F0]">
            <span className="text-[#5B6E84] block text-[10px] uppercase font-bold mb-2">
              Linhagem & Versões de Modelos (MLOps)
            </span>
            <div className="flex flex-wrap gap-2 font-mono text-[11px]">
              <span className="rounded bg-[#EAF4FC] px-2 py-1 text-[#003B7A] border border-[#0077C8]/20 font-semibold">
                CLV: <strong>{decisao.versao_modelos?.clv || "v1.2"}</strong>
              </span>
              <span className="rounded bg-[#EAF4FC] px-2 py-1 text-[#003B7A] border border-[#0077C8]/20 font-semibold">
                Churn/SHAP: <strong>{decisao.versao_modelos?.churn || "v2.0"}</strong>
              </span>
              <span className="rounded bg-[#EAF4FC] px-2 py-1 text-[#003B7A] border border-[#0077C8]/20 font-semibold">
                LLM: <strong>{decisao.versao_modelos?.llm || "gpt-4o-mini-rag"}</strong>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Visualização dos Fatores SHAP */}
      <ShapChart
        data={shapData}
        isLoading={isLoadingShap}
        decisaoId={decisao.decisao_id}
      />
    </div>
  );
}
