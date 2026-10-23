"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, AlertCircle, Cpu, Activity, ChevronDown } from "lucide-react";
import { useSimulation } from "../hooks/use-simulation";
import { MomentsQueue } from "./moments-queue";
import { SimulationForm } from "./simulation-form";
import { ArbitrationPanel } from "./arbitration-panel";
import { LlmMessagePanel } from "./llm-message-panel";
import { ShapChart } from "@/features/audit-logs/components/shap-chart";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export function SimulatorView() {
  const {
    momentos,
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
  } = useSimulation();

  const [isShapOpen, setIsShapOpen] = useState(false);

  // Garante que o componente expansível inicie sempre recolhido/fechado ao alternar eventos
  useEffect(() => {
    setIsShapOpen(false);
  }, [selectedMomento?.id]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#003B7A] sm:text-3xl">
              Central de Decisões
            </h1>
            <span className="rounded bg-[#EAF4FC] text-[#003B7A] border border-[#0077C8]/20 text-[11px] font-bold px-2.5 py-0.5">
              Simulador em Tempo Real
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5B6E84] mt-1 flex items-center">
            <span>Simulação de ações de retenção com Árbitro Matemático (Uplift) e geração de mensagens com LLM + RAG</span>
            <InfoTooltip text="Cálculo de probabilidade de mudança de comportamento do cliente após receber o benefício." />
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchMomentos()}
            disabled={isLoadingMomentos}
            className="flex items-center gap-2 border-[#E2E8F0] text-[#003B7A] hover:bg-[#EAF4FC]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingMomentos ? "animate-spin" : ""}`} />
            <span>Atualizar Fila</span>
          </Button>
        </div>
      </div>

      {/* Alerta de erro da API real */}
      {isErrorMomentos && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Falha ao carregar fila de momentos</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
            <span>
              {momentosError?.message ||
                "Não foi possível obter a lista de momentos de /api/v1/momentos. Verifique se o backend está acessível."}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchMomentos()}
              className="w-fit border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              Tentar Novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Grid Principal: Fila à esquerda, Formulário e Resultados à direita */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Coluna da Esquerda: Fila de Momentos */}
        <div className="lg:col-span-5">
          <MomentsQueue
            momentos={momentos}
            isLoading={isLoadingMomentos}
            selectedMomento={selectedMomento}
            onSelectMomento={setSelectedMomento}
          />
        </div>

        {/* Coluna da Direita: Execução e Resultados */}
        <div className="lg:col-span-7 space-y-6">
          <SimulationForm
            selectedMomento={selectedMomento}
            onSimulate={executeSimulation}
            isSimulating={isSimulating}
            simulationError={simulationError}
          />

          {simulationResult && (
            <>
              {/* Notificação Visual: Sincronização Cross-Tab com a Comissária */}
              {lastDispatchedMission && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 dark:text-emerald-100 text-xs shadow-xs animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-mono text-xs font-black">
                      ✓
                    </span>
                    <div>
                      <span className="font-bold text-foreground">Missão Despachada para a Comissária:</span>{" "}
                      <span>Assento <strong>[{lastDispatchedMission.assento}]</strong> • {lastDispatchedMission.passageiro}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold hidden md:inline">
                      Sincronizado via LocalStorage (Tempo Real)
                    </span>
                    <a
                      href="/crew"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors shrink-0"
                    >
                      Ver no App da Comissária ↗
                    </a>
                  </div>
                </div>
              )}

              <ArbitrationPanel result={simulationResult} />

              {/* Componente Expansível: Explicabilidade do Risco (SHAP) */}
              <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden transition-all duration-200">
                <button
                  type="button"
                  onClick={() => setIsShapOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between p-4 bg-card hover:bg-muted/40 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-expanded={isShapOpen}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF4FC] dark:bg-[#003B7A]/30 text-[#0077C8] dark:text-[#38BDF8]">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground">
                          Explicabilidade do Risco (SHAP)
                        </h3>
                        <span className="rounded bg-[#EAF4FC] dark:bg-[#003B7A]/30 text-[#003B7A] dark:text-[#38BDF8] border border-[#0077C8]/20 text-[10px] font-bold px-2 py-0.5">
                          Fatores Aditivos
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Decomposição dos fatores operacionais e comportamentais de risco para o cliente selecionado
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">
                      {isShapOpen ? "Ocultar Análise" : "Ver Análise"}
                    </span>
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-transform duration-200",
                        isShapOpen && "rotate-180"
                      )}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </button>

                {isShapOpen && (
                  <div className="border-t border-border p-4 bg-muted/5 animate-in fade-in-50 duration-150">
                    <ShapChart
                      data={shapData}
                      isLoading={isLoadingShap}
                      decisaoId={selectedMomento?.cliente_id || selectedMomento?.id}
                      hideHeader
                    />
                  </div>
                )}
              </div>

              <LlmMessagePanel decisaoFinal={simulationResult.decisao_final} />
            </>
          )}

          {!simulationResult && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-xs">
              <Cpu className="h-8 w-8 mx-auto mb-2 opacity-40 text-blue-500" />
              <p className="font-medium text-foreground">Aguardando Execução da Simulação</p>
              <p className="mt-1">
                Selecione um evento da fila ao lado e clique em &quot;Executar Simulação&quot; para acionar o motor.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
