"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useDemoMode } from "@/components/providers/demo-mode-context";
import { DEMO_MOMENTOS, DEMO_SIMULACAO_RESULT } from "@/lib/demo-data";
import { Momento, SimularResponse } from "@/types/api";

export function useSimulation() {
  const { isDemoMode } = useDemoMode();
  const [selectedMomento, setSelectedMomento] = useState<Momento | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimularResponse | null>(null);

  // Conexão de estado: chamada à API para consulta da fila de momentos reais
  const momentosQuery = useQuery<Momento[], Error>({
    queryKey: ["momentos", isDemoMode],
    queryFn: async () => {
      if (isDemoMode) return DEMO_MOMENTOS;
      return api.getMomentos();
    },
  });

  // Conexão de estado: chamada à API para execução da simulação do motor
  const simularMutation = useMutation<SimularResponse, ApiError, string>({
    mutationFn: async (momentoId: string) => {
      if (isDemoMode) {
        // Simula delay de rede no modo demo
        await new Promise((r) => setTimeout(r, 400));
        return DEMO_SIMULACAO_RESULT;
      }
      return api.simularMotor({ momento_id: momentoId });
    },
    onSuccess: (data) => {
      setSimulationResult(data);
    },
  });

  const handleSelectMomento = (momento: Momento) => {
    setSelectedMomento(momento);
    setSimulationResult(null);
  };

  const executeSimulation = (momentoId: string) => {
    simularMutation.mutate(momentoId);
  };

  return {
    momentos: momentosQuery.data,
    isLoadingMomentos: momentosQuery.isLoading,
    isErrorMomentos: momentosQuery.isError,
    momentosError: momentosQuery.error,
    refetchMomentos: momentosQuery.refetch,
    selectedMomento,
    setSelectedMomento: handleSelectMomento,
    executeSimulation,
    simulationResult,
    isSimulating: simularMutation.isPending,
    simulationError: simularMutation.error,
    isDemoMode,
  };
}
