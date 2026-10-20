"use client";

import React from "react";
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  Cpu,
  Clock,
  User,
  DollarSign,
  Layers,
} from "lucide-react";
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
      <Card className="h-full flex flex-col justify-center items-center p-8 text-center text-muted-foreground text-xs">
        <FileText className="h-10 w-10 mb-3 opacity-30 text-blue-500" />
        <h4 className="font-semibold text-foreground text-sm">Inspeção Detalhada de Decisão</h4>
        <p className="mt-1 max-w-xs">
          Clique em &quot;Detalhes&quot; ou selecione uma linha na tabela ao lado para inspecionar os metadados e os fatores SHAP.
        </p>
      </Card>
    );
  }

  const isBloqueada = !!decisao.motivo_bloqueio;

  return (
    <div className="space-y-6">
      {/* 1. Card com Metadados da Decisão */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-base font-semibold">
                Registro de Auditoria #{decisao.decisao_id}
              </CardTitle>
            </div>
            <Badge variant={isBloqueada ? "warning" : "success"} className="text-xs">
              {isBloqueada ? "Ação Bloqueada" : "Ação Concedida"}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Metadados persistidos pelo motor para governança e compliance
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-xs">
          {/* Informações Principais */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                Cliente Alvo
              </span>
              <span className="font-mono font-bold text-foreground">
                {decisao.cliente_id}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                Tipo de Gatilho
              </span>
              <span className="font-semibold text-foreground">
                {decisao.tipo_simulacao}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                Data do Registro
              </span>
              <span className="text-foreground">
                {formatDateTime(decisao.data_decisao)}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                Custo Realizado
              </span>
              <span className="font-bold text-foreground">
                {formatCurrency(decisao.custo_realizado)}
              </span>
            </div>
          </div>

          {/* Bloqueio se houver */}
          {isBloqueada && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200">
              <div className="flex items-center gap-1.5 font-semibold text-xs mb-1">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>Justificativa do Bloqueio:</span>
              </div>
              <p className="text-xs">{decisao.motivo_bloqueio}</p>
            </div>
          )}

          {/* Versões dos Modelos Matemáticos */}
          <div className="pt-2 border-t border-border">
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold mb-2">
              Linhagem & Versões de Modelos (MLOps)
            </span>
            <div className="flex flex-wrap gap-2 font-mono text-[11px]">
              <span className="rounded bg-muted px-2 py-1 text-foreground border border-border">
                CLV: <strong>{decisao.versao_modelos?.clv || "v1.0"}</strong>
              </span>
              <span className="rounded bg-muted px-2 py-1 text-foreground border border-border">
                Churn/SHAP: <strong>{decisao.versao_modelos?.churn || "v1.0"}</strong>
              </span>
              <span className="rounded bg-muted px-2 py-1 text-foreground border border-border">
                LLM: <strong>{decisao.versao_modelos?.llm || "gpt-4o-mini"}</strong>
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
