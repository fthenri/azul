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
    shapData,
    isLoadingShap,
    isErrorShap,
    shapError,
    isDemoMode,
  } = useAuditLogs();

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Logs & Explicabilidade
            </h1>
            <span className="rounded bg-slate-200 text-slate-800 text-[11px] font-semibold px-2 py-0.5 dark:bg-slate-800 dark:text-slate-200">
              Auditoria Regulatória
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Rastreabilidade de decisões tomadas, bloqueios de segurança e decomposição de risco via SHAP
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchDecisoes()}
            disabled={isLoadingDecisoes}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingDecisoes ? "animate-spin" : ""}`} />
            <span>Atualizar Logs</span>
          </Button>
        </div>
      </div>

      {/* Alerta de erro da API real */}
      {isErrorDecisoes && !isDemoMode && (
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

      {/* Grid Principal: Tabela à esquerda, Detalhes + SHAP à direita */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        <div className="lg:col-span-7">
          <AuditTable
            data={decisoes}
            isLoading={isLoadingDecisoes}
            selectedDecisao={selectedDecisao}
            onSelectDecisao={setSelectedDecisao}
          />
        </div>

        <div className="lg:col-span-5">
          <DecisionDetailDrawer
            decisao={selectedDecisao}
            shapData={shapData}
            isLoadingShap={isLoadingShap}
            shapError={shapError}
          />
        </div>
      </div>
    </div>
  );
}
