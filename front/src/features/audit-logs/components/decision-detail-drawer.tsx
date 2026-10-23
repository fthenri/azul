"use client";

import React from "react";
import { FileText, AlertTriangle, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DecisaoAuditoria } from "@/types/api";
import { formatCurrency, formatDateTime } from "@/lib/formatters";

interface DecisionDetailDrawerProps {
  decisao: DecisaoAuditoria | null;
  onClose: () => void;
}

export function DecisionDetailDrawer({
  decisao,
  onClose,
}: DecisionDetailDrawerProps) {
  if (!decisao) return null;

  const isBloqueada = !!decisao.motivo_bloqueio;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="border border-border bg-card shadow-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-azul-sky" />
                <CardTitle className="text-base font-bold text-foreground">
                  Registro de Auditoria #{decisao.decisao_id}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={isBloqueada ? "warning" : "success"} className="text-xs font-bold">
                  {isBloqueada ? "Ação Bloqueada" : "Ação Concedida"}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Metadados persistidos pelo motor para governança regulatória e compliance
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-4 text-xs">
            {/* Informações Principais */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/40 border border-border">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                  Cliente Alvo
                </span>
                <span className="font-mono font-bold text-azul-navy dark:text-[#38BDF8] break-all">
                  {decisao.cliente_id}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                  Tipo de Gatilho
                </span>
                <span className="font-bold text-foreground">
                  {decisao.tipo_simulacao}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                  Data do Registro
                </span>
                <span className="text-foreground">
                  {formatDateTime(decisao.data_decisao)}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                  Custo Realizado
                </span>
                <span className="font-bold text-foreground">
                  {formatCurrency(decisao.custo_realizado)}
                </span>
              </div>
            </div>

            {/* Ação Executada */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold mb-1">
                Ação Registrada
              </span>
              <p className="font-semibold text-foreground text-sm">
                {decisao.acao_executada}
              </p>
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
            <div className="pt-2 border-t border-border">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold mb-2">
                Linhagem & Versões de Modelos (MLOps)
              </span>
              <div className="flex flex-wrap gap-2 font-mono text-[11px]">
                <span className="rounded bg-[#EAF4FC] dark:bg-[#003B7A]/30 px-2.5 py-1 text-[#003B7A] dark:text-[#38BDF8] border border-[#0077C8]/20 font-semibold">
                  CLV: <strong>{decisao.versao_modelos?.clv || "v1.2"}</strong>
                </span>
                <span className="rounded bg-[#EAF4FC] dark:bg-[#003B7A]/30 px-2.5 py-1 text-[#003B7A] dark:text-[#38BDF8] border border-[#0077C8]/20 font-semibold">
                  Churn: <strong>{decisao.versao_modelos?.churn || "v2.0"}</strong>
                </span>
                <span className="rounded bg-[#EAF4FC] dark:bg-[#003B7A]/30 px-2.5 py-1 text-[#003B7A] dark:text-[#38BDF8] border border-[#0077C8]/20 font-semibold">
                  LLM: <strong>{decisao.versao_modelos?.llm || "gpt-4o-mini-rag"}</strong>
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="border-border text-foreground hover:bg-muted"
              >
                Fechar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
