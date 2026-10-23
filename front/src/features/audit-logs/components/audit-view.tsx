"use client";

import React from "react";
import { RefreshCw, AlertCircle, FileText } from "lucide-react";
import { useAuditLogs } from "../hooks/use-audit-logs";
import { AuditTable } from "./audit-table";
import { DecisionDetailDrawer } from "./decision-detail-drawer";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function AuditView() {
  const {
    decisoes,
    isLoadingDecisoes,
    isErrorDecisoes,
    decisoesError,
    refetchDecisoes,
    selectedDecisao,
    setSelectedDecisao,
  } = useAuditLogs();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#003B7A] sm:text-3xl">
              Logs & Auditoria
            </h1>
            <span className="rounded bg-[#EAF4FC] text-[#003B7A] border border-[#0077C8]/20 text-[11px] font-bold px-2.5 py-0.5">
              Auditoria Regulatória
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5B6E84] mt-1">
            Rastreabilidade completa de decisões executadas, bloqueios do árbitro e conformidade operacional
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchDecisoes()}
            disabled={isLoadingDecisoes}
            className="flex items-center gap-2 border-[#E2E8F0] text-[#003B7A] hover:bg-[#EAF4FC]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingDecisoes ? "animate-spin" : ""}`} />
            <span>Atualizar Logs</span>
          </Button>
        </div>
      </div>

      {/* Alerta de erro da API real */}
      {isErrorDecisoes && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Falha ao carregar registros de auditoria</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
            <span>
              {decisoesError?.message ||
                "Não foi possível obter o histórico de /api/v1/auditoria/decisoes. Verifique se o backend está ativo."}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchDecisoes()}
              className="w-fit border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              Tentar Novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabela de Auditoria de Histórico: Visão Completa Full-Width */}
      <div className="w-full">
        <AuditTable
          data={decisoes}
          isLoading={isLoadingDecisoes}
          selectedDecisao={selectedDecisao}
          onSelectDecisao={setSelectedDecisao}
        />
      </div>

      {/* Modal de Detalhes da Decisão (se selecionada) focado em compliance e MLOps */}
      {selectedDecisao && (
        <DecisionDetailDrawer
          decisao={selectedDecisao}
          onClose={() => setSelectedDecisao(null)}
        />
      )}
    </div>
  );
}
