"use client";

import React from "react";
import { RefreshCw, AlertCircle, BarChart2 } from "lucide-react";
import { useExecutiveData } from "../hooks/use-executive-data";
import { KpiCards } from "./kpi-cards";
import { ParetoChart } from "./pareto-chart";
import { PersonasScatterChart } from "./personas-scatter-chart";
import { PersonaMatrix } from "./persona-matrix";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ExecutiveView() {
  const { kpis, personas, pareto, isLoading, isError, error, refetchAll, isDemoMode } =
    useExecutiveData();

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header da Tela */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Painel de Valor
            </h1>
            <span className="rounded bg-blue-100 text-blue-800 text-[11px] font-semibold px-2 py-0.5 dark:bg-blue-900/40 dark:text-blue-300">
              Visão Executiva
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Monitoramento macro do ROI, concentração de carteira (Pareto) e matriz de personas de alto valor
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={refetchAll}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Atualizar Dados</span>
          </Button>
        </div>
      </div>

      {/* Tratamento de Erro Real da API */}
      {isError && !isDemoMode && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Falha na comunicação com a API</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
            <span>
              {error?.message ||
                "Não foi possível carregar os dados executivos da API (/api/v1/dashboard/*). Verifique se o backend FastAPI está em execução."}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={refetchAll}
              className="w-fit border-destructive/50 text-destructive hover:bg-destructive/10"
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
