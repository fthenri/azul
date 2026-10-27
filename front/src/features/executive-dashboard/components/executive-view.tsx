"use client";

import React from "react";
import {
  RefreshCw,
  AlertCircle,
  Sparkles,
  Database,
} from "lucide-react";
import { useExecutiveData } from "../hooks/use-executive-data";
import { KpiCards } from "./kpi-cards";
import { ParetoChart } from "./pareto-chart";
import { PersonasScatterChart } from "./personas-scatter-chart";
import { PersonaMatrix } from "./persona-matrix";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ExecutiveView() {
  const { kpis, personas, pareto, isLoading, isError, error, refetchAll } =
    useExecutiveData();

  return (
    <div className="relative space-y-7 selection:bg-primary/30 selection:text-primary">
      {/* ─────────────────────────────────────────────────────────────
          ELEMENTO ATMOSFÉRICO DE PROFUNDIDADE (AERO GLOW SUTIL)
         ───────────────────────────────────────────────────────────── */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-full max-w-5xl h-64 bg-primary/5 blur-[120px] pointer-events-none -z-10 rounded-full" />

      {/* ─────────────────────────────────────────────────────────────
          HEADER DA TELA EXECUTIVA
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-2 border-b border-border/80">
        <div>
          {/* Micro-badge de Ecossistema */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold tracking-wide shadow-xs mb-2">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Ecossistema Azul Fidelidade • Enterprise</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
              Painel de Valor
            </h1>
            <span className="rounded-full bg-secondary border border-border text-secondary-foreground text-[11px] font-bold px-3 py-0.5">
              Visão Executiva
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            pulso: Monitoramento macro do ROI, concentração de carteira (Pareto 80/20) e matriz de personas de alto valor
          </p>
        </div>

        {/* Controles de Atualização & Badges de Governança */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/80 border border-border text-xs text-muted-foreground shadow-xs">
            <Database className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-medium">Camada Gold (DuckDB)</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refetchAll}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl border-border bg-card/80 hover:bg-muted text-foreground text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-primary ${isLoading ? "animate-spin" : ""}`} />
            <span>Atualizar Dados</span>
          </Button>
        </div>
      </div>

      {/* Tratamento de Erro Real da API */}
      {isError && (
        <Alert variant="destructive" className="rounded-2xl border-destructive/30 bg-destructive/10 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-bold">Falha na comunicação com a API</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
            <span className="text-xs leading-relaxed">
              {error?.message ||
                "Não foi possível carregar os dados executivos da API (/api/v1/dashboard/*). Verifique se o backend FastAPI está em execução."}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={refetchAll}
              className="w-fit rounded-xl border-destructive/40 text-destructive hover:bg-destructive/15 text-xs font-semibold cursor-pointer"
            >
              Tentar Novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 1. KPIs Consolidados */}
      <section aria-label="KPIs Consolidados">
        <KpiCards data={kpis} isLoading={isLoading} />
      </section>

      {/* 2. Gráficos de Concentração e Personas */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ParetoChart data={pareto} isLoading={isLoading} />
        <PersonasScatterChart data={personas} isLoading={isLoading} />
      </section>

      {/* 3. Matriz Persona x Faixa de Valor */}
      <section aria-label="Matriz de Personas">
        <PersonaMatrix data={personas} />
      </section>
    </div>
  );
}
