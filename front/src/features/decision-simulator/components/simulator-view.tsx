"use client";

import React from "react";
import { RefreshCw, AlertCircle, Cpu } from "lucide-react";
import { useSimulation } from "../hooks/use-simulation";
import { MomentsQueue } from "./moments-queue";
import { SimulationForm } from "./simulation-form";
import { ArbitrationPanel } from "./arbitration-panel";
import { LlmMessagePanel } from "./llm-message-panel";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
    isSimulating,
    simulationError,
    isDemoMode,
  } = useSimulation();

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
          <p className="text-xs sm:text-sm text-[#5B6E84] mt-1">
            Simulação de ações de retenção com Árbitro Matemático (Uplift) e geração de mensagens com LLM + RAG
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
      {isErrorMomentos && !isDemoMode && (
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
              <ArbitrationPanel result={simulationResult} />
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
