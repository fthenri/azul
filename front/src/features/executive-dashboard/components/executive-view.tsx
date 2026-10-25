"use client";

import React, { useState } from "react";
import {
  RefreshCw,
  AlertCircle,
  BarChart3,
  ShieldCheck,
  Sparkles,
  Database,
  Layers,
  Users,
  Zap,
} from "lucide-react";
import { useExecutiveData } from "../hooks/use-executive-data";
import { KpiCards } from "./kpi-cards";
import { ParetoChart } from "./pareto-chart";
import { PersonasScatterChart } from "./personas-scatter-chart";
import { PersonaMatrix } from "./persona-matrix";
import { ParetoRoiAnalysis } from "./pareto-roi-analysis";
import { ExecutiveFilterTabs, TabType } from "./executive-filter-tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export function ExecutiveView() {
  const {
    kpis,
    personas,
    pareto,
    paretoRoi,
    isLoading,
    isError,
    error,
    refetchAll,
    isDemoMode,
  } = useExecutiveData();

  const [activeTab, setActiveTab] = useState<"all" | "pareto" | "personas" | "roi">("all");

  return (
    <div className="relative space-y-7 selection:bg-sky-500/30 selection:text-sky-200">
      {/* ─────────────────────────────────────────────────────────────
          ELEMENTO ATMOSFÉRICO DE PROFUNDIDADE (AERO GLOW SUTIL)
         ───────────────────────────────────────────────────────────── */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-full max-w-5xl h-64 bg-sky-500/5 dark:bg-white/[0.02] blur-[120px] pointer-events-none -z-10 rounded-full" />

      {/* ─────────────────────────────────────────────────────────────
          HEADER DA TELA EXECUTIVA
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-2 border-b border-border/60">
        <div>
          {/* Micro-badge de Ecossistema */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold tracking-wide shadow-xs mb-2">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Ecossistema Azul Fidelidade • Cockpit B2B</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Painel de Valor & Retenção
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-semibold text-[11px] bg-secondary text-secondary-foreground border border-primary/25">
              Visão Executiva
            </span>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed">
            Monitoramento macro do ROI por real gasto, concentração da receita pela regra de Pareto (80/20) e clusterização preditiva da carteira de passageiros de alto valor.
          </p>
        </div>

        {/* Controles de Atualização & Status do Motor */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status do Motor DuckDB */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card/80 border border-border/80 backdrop-blur-md text-xs shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-medium text-foreground">
              {isDemoMode ? "Modo Demo" : "DuckDB Camada Gold"}
            </span>
          </div>

          {/* Botão de Atualização com Micro-Interação */}
          <Button
            variant="outline"
            size="sm"
            onClick={refetchAll}
            disabled={isLoading}
            className="h-9 px-3.5 rounded-xl border-border/80 bg-card/80 hover:bg-muted text-foreground font-semibold text-xs shadow-xs transition-all duration-200 flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-primary ${isLoading ? "animate-spin" : ""}`} />
            <span>Atualizar Dados</span>
          </Button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ALERTA DE FALHA NA COMUNICAÇÃO DA API (SE HOUVER)
         ───────────────────────────────────────────────────────────── */}
      {isError && (
        <Alert variant="destructive" className="rounded-xl border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200">
          <AlertCircle className="h-4 w-4 text-rose-500" />
          <AlertTitle className="font-bold text-sm">Falha na comunicação com a API analítica</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-1 text-xs">
            <span>
              {error?.message ||
                "Não foi possível sincronizar os dados com o serviço backend FastAPI (/api/v1/dashboard/*). Verifique a conectividade da API."}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={refetchAll}
              className="w-fit h-8 rounded-lg border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20"
            >
              Tentar Novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. KPIS CONSOLIDADOS (4 MACRO INDICADORES)
         ───────────────────────────────────────────────────────────── */}
      <section aria-label="KPIs Macro Executivos">
        <KpiCards data={kpis} isLoading={isLoading} />
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SELETOR DE ABAS / FILTROS VISUAIS RECONSTRUÍDO
          (Com trilho interligador e animação fluida que corre entre os botões)
         ───────────────────────────────────────────────────────────── */}
      <ExecutiveFilterTabs
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab)}
      />

      {/* ─────────────────────────────────────────────────────────────
          2. GRÁFICOS: PARETO 80/20 & SCATTER PLOT PERSONAS
         ───────────────────────────────────────────────────────────── */}
      {(activeTab === "all" || activeTab === "pareto") && (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ParetoChart data={pareto} isLoading={isLoading} />
          <PersonasScatterChart data={personas} isLoading={isLoading} />
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. COMPROVAÇÃO MATEMÁTICA DE ROI (TOP 20% VS CAUDA LONGA)
         ───────────────────────────────────────────────────────────── */}
      {(activeTab === "all" || activeTab === "roi") && (
        <section aria-label="Comprovação de ROI">
          <ParetoRoiAnalysis data={paretoRoi} isLoading={isLoading} />
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. MATRIZ ESTRATÉGICA: PERSONAS X FAIXA DE VALOR
         ───────────────────────────────────────────────────────────── */}
      {(activeTab === "all" || activeTab === "personas") && (
        <section aria-label="Matriz de Personas">
          <PersonaMatrix data={personas} />
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          FOOTER COMPLIANCE & INTEGRIDADE DO DATA LAKE
         ───────────────────────────────────────────────────────────── */}
      <div className="pt-4 pb-2 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <span>
            Arquitetura Medallion: Camadas Silver e Gold processadas via DuckDB In-Process
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span>Políticas de Retenção Ativas</span>
          <span>•</span>
          <span className="font-mono text-primary">Azul v2.4 Enterprise</span>
        </div>
      </div>
    </div>
  );
}
