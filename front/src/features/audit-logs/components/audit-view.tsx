"use client";

import React from "react";
import {
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  Database,
  Lock,
  Cpu,
  FileSpreadsheet,
} from "lucide-react";
import { useAuditLogs } from "../hooks/use-audit-logs";
import { AuditKpis } from "./audit-kpis";
import { AuditTable } from "./audit-table";
import { DecisionDetailDrawer } from "./decision-detail-drawer";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { exportAuditLogsToCsv } from "../lib/audit-helpers";

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
    currentIndex,
    totalCount,
    hasPrev,
    hasNext,
    handleSelectPrev,
    handleSelectNext,
    isDemoMode,
  } = useAuditLogs();

  return (
    <div className="relative space-y-7 selection:bg-sky-500/30 selection:text-sky-200">
      {/* ─────────────────────────────────────────────────────────────
          ELEMENTO ATMOSFÉRICO DE PROFUNDIDADE (AERO GLOW SUTIL)
         ───────────────────────────────────────────────────────────── */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-full max-w-5xl h-64 bg-sky-500/5 dark:bg-sky-500/10 blur-[120px] pointer-events-none -z-10 rounded-full" />

      {/* ─────────────────────────────────────────────────────────────
          HEADER DA CENTRAL DE AUDITORIA & GOVERNANÇA IA
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-2 border-b border-border/60">
        <div>
          {/* Micro-badge de Ecossistema */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/25 text-azul-action dark:text-sky-300 text-[11px] font-semibold tracking-wide shadow-xs mb-2">
            <Sparkles className="h-3 w-3 text-azul-action dark:text-sky-400" />
            <span>Ecossistema Azul Fidelidade • Governança & Compliance B2B</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Central de Auditoria, Compliance & Governança IA
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-semibold text-[11px] bg-secondary text-secondary-foreground border border-primary/25">
              ANAC Res. 400 & LGPD Art. 20
            </span>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed flex items-center gap-1.5">
            <span>
              Rastreabilidade contínua de intervenções concedidas, bloqueios do Árbitro de Uplift (janela de 72h e ROI), explicabilidade aditiva SHAP e governança MLOps.
            </span>
            <InfoTooltip text="Clique em qualquer linha da tabela para abrir o dossiê detalhado com os fatores explicativos SHAP, histórico de atrito e parecer regulatório." />
          </p>
        </div>

        {/* Controles de Atualização & Status dos Motores de Auditoria */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status do SQLite Audit Store */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card/80 border border-border/80 backdrop-blur-md text-xs shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-medium text-foreground">
              {isDemoMode ? "Modo Demo" : "SQLite WAL Audit Store"}
            </span>
          </div>

          {/* Status de Criptografia / Integridade */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card/80 border border-border/80 text-xs shadow-xs text-muted-foreground font-mono">
            <Lock className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-medium text-foreground">SHA-256 Ledger</span>
          </div>

          {/* Botão de Exportação Imediata */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportAuditLogsToCsv(decisoes)}
            disabled={isLoadingDecisoes || decisoes.length === 0}
            className="h-9 px-3 rounded-xl border-border/80 bg-card/80 hover:bg-muted text-foreground font-semibold text-xs shadow-xs transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
            title="Exportar registros de auditoria em CSV"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Relatório ANAC</span>
          </Button>

          {/* Botão de Atualização com Micro-Interação */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchDecisoes()}
            disabled={isLoadingDecisoes}
            className="h-9 px-3.5 rounded-xl border-border/80 bg-card/80 hover:bg-muted text-foreground font-semibold text-xs shadow-xs transition-all duration-200 flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-primary ${
                isLoadingDecisoes ? "animate-spin" : ""
              }`}
            />
            <span>Atualizar Logs</span>
          </Button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ALERTA DE FALHA NA COMUNICAÇÃO DA API (SE HOUVER)
         ───────────────────────────────────────────────────────────── */}
      {isErrorDecisoes && (
        <Alert
          variant="destructive"
          className="rounded-xl border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200"
        >
          <AlertCircle className="h-4 w-4 text-rose-500" />
          <AlertTitle className="font-bold text-sm">Falha ao carregar registros de auditoria</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-1 text-xs">
            <span>
              {decisoesError?.message ||
                "Não foi possível sincronizar o histórico com o serviço de auditoria (/api/v1/auditoria/decisoes)."}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchDecisoes()}
              className="w-fit h-8 rounded-lg border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20"
            >
              Tentar Novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. DECK DE KPIS DE GOVERNANÇA & COMPLIANCE
         ───────────────────────────────────────────────────────────── */}
      <section aria-label="Indicadores Macro de Governança">
        <AuditKpis data={decisoes} isLoading={isLoadingDecisoes} />
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. TABELA MASTER DE AUDITORIA (COM ABAS ANIMADAS & AERO PAGINAÇÃO)
         ───────────────────────────────────────────────────────────── */}
      <section aria-label="Trilha Histórica de Auditoria">
        <AuditTable
          data={decisoes}
          isLoading={isLoadingDecisoes}
          selectedDecisao={selectedDecisao}
          onSelectDecisao={setSelectedDecisao}
        />
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. DRAWER MASTER-DETAIL DESLIZANTE DE 840PX (SHAP + MLOPS)
         ───────────────────────────────────────────────────────────── */}
      <DecisionDetailDrawer
        isOpen={!!selectedDecisao}
        onClose={() => setSelectedDecisao(null)}
        decisao={selectedDecisao}
        onSelectPrev={handleSelectPrev}
        onSelectNext={handleSelectNext}
        hasPrev={hasPrev}
        hasNext={hasNext}
        currentIndex={currentIndex}
        totalCount={totalCount}
        shapData={shapData}
        isLoadingShap={isLoadingShap}
      />

      {/* ─────────────────────────────────────────────────────────────
          FOOTER COMPLIANCE & INTEGRIDADE DO DATA LAKE
         ───────────────────────────────────────────────────────────── */}
      <div className="pt-4 pb-2 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-azul-action dark:text-sky-400" />
          <span>
            Arquitetura Medallion: Trilha imutável em SQLite WAL cruzada com Silver Viagens e Gold CLV & Evasão
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span>Motor de Decisões</span>
          <span>•</span>
          <span className="font-mono text-azul-action dark:text-sky-400">Azul v2.4 Enterprise</span>
        </div>
      </div>
    </div>
  );
}
