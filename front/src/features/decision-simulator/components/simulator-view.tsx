"use client";

import React, { useState } from "react";
import {
  RefreshCw,
  AlertCircle,
  Cpu,
  Sparkles,
  Database,
} from "lucide-react";
import { useSimulation } from "../hooks/use-simulation";
import { SimulatorKpis } from "./simulator-kpis";
import { MomentsQueue } from "./moments-queue";
import { SimulationDrawer } from "./simulation-drawer";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function SimulatorView() {
  const {
    momentos = [],
    isLoadingMomentos,
    isErrorMomentos,
    momentosError,
    refetchMomentos,
    selectedMomento,
    setSelectedMomento,
    executeSimulation,
    simulationResult,
    lastDispatchedMission,
    isSimulating,
    simulationError,
    shapData,
    isLoadingShap,
    isDemoMode,
  } = useSimulation();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleSelectMomento = (m: any) => {
    setSelectedMomento(m);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  return (
    <div className="relative space-y-7 selection:bg-sky-500/30 selection:text-sky-200">
      {/* ─────────────────────────────────────────────────────────────
          ELEMENTO ATMOSFÉRICO DE PROFUNDIDADE (AERO GLOW SUTIL)
         ───────────────────────────────────────────────────────────── */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-full max-w-5xl h-64 bg-sky-500/5 dark:bg-sky-500/10 blur-[120px] pointer-events-none -z-10 rounded-full" />

      {/* ─────────────────────────────────────────────────────────────
          HEADER DA CENTRAL DE DECISÕES
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-2 border-b border-border/60 dark:border-white/10">
        <div>
          {/* Micro-badge de Ecossistema */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/25 text-azul-action dark:text-sky-300 text-[11px] font-semibold tracking-wide shadow-xs mb-2">
            <Sparkles className="h-3 w-3 text-azul-action dark:text-sky-400" />
            <span>Ecossistema Azul Fidelidade • Cockpit B2B</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Central de Decisões & Arbitragem IA
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-semibold text-[11px] bg-[#EAF4FC] dark:bg-sky-950/70 text-[#003B7A] dark:text-sky-300 border border-[#0077C8]/25 dark:border-sky-500/30">
              Simulador em Tempo Real
            </span>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed flex items-center gap-1.5">
            <span>
              Arbitragem matemática de Uplift (retorno líquido vs custo), explicabilidade aditiva SHAP e mensageria generativa RAG calibrada para atritos e retenção de alto valor.
            </span>
            <InfoTooltip text="Clique em qualquer passageiro da fila para abrir o painel de decisão expansivo com o Árbitro de Uplift e a geração da mensagem RAG." />
          </p>
        </div>

        {/* Controles de Atualização & Status dos Motores */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status do Motor DuckDB */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card/80 dark:bg-[#071120]/80 border border-border/80 dark:border-white/10 backdrop-blur-md text-xs shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-medium text-foreground">
              {isDemoMode ? "Modo Demo" : "DuckDB Camada Gold"}
            </span>
          </div>

          {/* Status do Modelo RAG */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card/80 dark:bg-[#071120]/80 border border-border/80 dark:border-white/10 text-xs shadow-xs text-muted-foreground font-mono">
            <Cpu className="h-3.5 w-3.5 text-sky-500" />
            <span className="text-[11px] font-medium text-foreground">GPT-4o-mini RAG</span>
          </div>

          {/* Botão de Atualização com Micro-Interação */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchMomentos()}
            disabled={isLoadingMomentos}
            className="h-9 px-3.5 rounded-xl border-border/80 dark:border-white/15 bg-card/80 dark:bg-[#071120]/80 hover:bg-muted dark:hover:bg-white/10 text-foreground font-semibold text-xs shadow-xs transition-all duration-200 flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-azul-action dark:text-sky-400 ${
                isLoadingMomentos ? "animate-spin" : ""
              }`}
            />
            <span>Atualizar Fila</span>
          </Button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ALERTA DE FALHA NA COMUNICAÇÃO DA API (SE HOUVER)
         ───────────────────────────────────────────────────────────── */}
      {isErrorMomentos && (
        <Alert
          variant="destructive"
          className="rounded-xl border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200"
        >
          <AlertCircle className="h-4 w-4 text-rose-500" />
          <AlertTitle className="font-bold text-sm">Falha ao carregar fila de momentos</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-1 text-xs">
            <span>
              {momentosError?.message ||
                "Não foi possível sincronizar os dados da esteira de atritos com a API analítica."}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchMomentos()}
              className="w-fit h-8 rounded-lg border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20"
            >
              Tentar Novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. KPIS CONSOLIDADOS DA FILA (RESPIRANDO EM LARGURA TOTAL)
         ───────────────────────────────────────────────────────────── */}
      <section aria-label="KPIs Dinâmicos da Fila">
        <SimulatorKpis
          momentos={momentos}
          selectedMomento={selectedMomento}
          simulationResult={simulationResult}
          isLoading={isLoadingMomentos}
        />
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. RADAR OPERACIONAL DE ATRITOS (TELA MESTRE LIMPA)
             Sem scrolls internos presos; navegação ampla em grade!
         ───────────────────────────────────────────────────────────── */}
      <section aria-label="Radar de Atritos e Fila de Momentos">
        <MomentsQueue
          momentos={momentos}
          isLoading={isLoadingMomentos}
          selectedMomento={selectedMomento}
          onSelectMomento={handleSelectMomento}
        />
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. PAINEL LATERAL DESLIZANTE / DRAWER (780px - MASTER-DETAIL)
             Abre ao clicar em qualquer passageiro, isolando a análise
             complexa em um único scroll vertical natural e fluido!
         ───────────────────────────────────────────────────────────── */}
      <SimulationDrawer
        isOpen={isDrawerOpen && !!selectedMomento}
        onClose={handleCloseDrawer}
        selectedMomento={selectedMomento}
        onSelectMomento={handleSelectMomento}
        allMomentos={momentos}
        simulationResult={simulationResult}
        isSimulating={isSimulating}
        simulationError={simulationError}
        onSimulate={executeSimulation}
        shapData={shapData}
        isLoadingShap={isLoadingShap}
        lastDispatchedMission={lastDispatchedMission}
      />

      {/* ─────────────────────────────────────────────────────────────
          FOOTER COMPLIANCE & INTEGRIDADE DO DATA LAKE
         ───────────────────────────────────────────────────────────── */}
      <div className="pt-4 pb-2 border-t border-border/60 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-azul-action dark:text-sky-400" />
          <span>
            Arquitetura Medallion: Fila de eventos originada em Silver Viagens cruzada com Gold CLV e Evasão
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
