"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useDemoMode } from "@/components/providers/demo-mode-context";
import { DEMO_VOO_SIMULADO, getDemoSimularBordo, getDemoVooSimulado } from "@/lib/demo-data";
import { addOrUpdateMission, setMissionStatus } from "@/lib/missions-storage";
import {
  AssentoVoo,
  MetadataAeronave,
  SimularBordoPayload,
  SimularBordoResponse,
  VooSimuladoResponse,
} from "@/types/api";

export type SeatFilter = "todos" | "atencao" | "critico" | "vip";

export function useCrewFlight() {
  const { isDemoMode } = useDemoMode();
  const [selectedSeat, setSelectedSeatState] = useState<AssentoVoo | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimularBordoResponse | null>(null);
  const [filter, setFilter] = useState<SeatFilter>("todos");
  const [attendedSeats, setAttendedSeats] = useState<Set<string>>(new Set());

  // Consulta do mapa de assentos do voo simulado com metadados dinâmicos da frota
  const flightQuery = useQuery<VooSimuladoResponse, Error>({
    queryKey: ["voo-simulado", isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        return getDemoVooSimulado();
      }
      return api.getVooSimulado();
    },
    staleTime: 0, // Permite novo sorteio de aeronave a cada acionamento manual
  });

  // Mutação para simulação e geração da instrução da tripulação de bordo
  const simularBordoMutation = useMutation<SimularBordoResponse, ApiError, SimularBordoPayload>({
    mutationFn: async (payload: SimularBordoPayload) => {
      if (isDemoMode) {
        await new Promise((r) => setTimeout(r, 450));
        return getDemoSimularBordo(payload.assento, payload.id_cliente);
      }
      return api.simularBordo(payload);
    },
    onSuccess: (data, variables) => {
      setSimulationResult(data);

      // Ponte de Comunicação: Despacha a missão gerada pela IA para a comissária (/crew) via localStorage
      const activeSeat = selectedSeat?.assento === variables.assento ? selectedSeat : null;
      const passengerName = activeSeat?.dados_cliente?.nome || `Passageiro Assento ${variables.assento}`;
      addOrUpdateMission({
        id: `mis_${variables.assento}_AD4231`,
        id_voo: "AD4231",
        assento: variables.assento,
        passageiro: passengerName,
        clienteNome: passengerName,
        persona: activeSeat?.dados_cliente?.persona || "Cliente Especial",
        tier: activeSeat?.dados_cliente?.tier_fidelidade || "Diamante",
        tipo: activeSeat?.status === "critico" ? "atrito" : "vip",
        statusBadge: activeSeat?.status === "critico" ? "Alerta de Atrito" : "Fidelização VIP",
        gatilho: activeSeat?.status === "critico"
          ? `Score de atrito elevado (${activeSeat.dados_cliente.score_atrito_acumulado}) • Risco ${Math.round(activeSeat.dados_cliente.risco_evasao * 100)}%`
          : `Cliente de Alto Valor • Faixa Pareto ${activeSeat?.dados_cliente.faixa_pareto || "Top 10%"}`,
        instrucao_ia: data.instrucao_comissario,
        instrucaoIA: data.instrucao_comissario,
        acaoSugerida: data.acao_sugerida,
        status: "pendente",
      });
    },
  });

  const handleSelectSeat = (seat: AssentoVoo) => {
    setSelectedSeatState(seat);
    setSimulationResult(null);

    // Conforme especificação: ao selecionar assento crítico ou vip, aciona o motor de bordo
    if (seat.status === "critico" || seat.status === "vip") {
      simularBordoMutation.mutate({
        assento: seat.assento,
        id_cliente: seat.dados_cliente.id_cliente,
      });
    }
  };

  const clearSelection = () => {
    setSelectedSeatState(null);
    setSimulationResult(null);
  };

  const markSeatAsAttended = (assento: string) => {
    setAttendedSeats((prev) => {
      const next = new Set(prev);
      next.add(assento);
      return next;
    });
    setMissionStatus(assento, "concluida");
  };

  const rerunInFlightAction = (seat: AssentoVoo) => {
    simularBordoMutation.mutate({
      assento: seat.assento,
      id_cliente: seat.dados_cliente.id_cliente,
    });
  };

  return {
    flightData: flightQuery.data || null,
    metadata: flightQuery.data?.metadata_aeronave || null,
    seats: flightQuery.data?.assentos || [],
    isLoadingFlight: flightQuery.isLoading,
    isErrorFlight: flightQuery.isError,
    flightError: flightQuery.error,
    refetchFlight: flightQuery.refetch,

    selectedSeat,
    setSelectedSeat: handleSelectSeat,
    clearSelection,

    simulationResult,
    isSimulating: simularBordoMutation.isPending,
    simulationError: simularBordoMutation.error,
    rerunInFlightAction,

    filter,
    setFilter,

    attendedSeats,
    markSeatAsAttended,
    isDemoMode,
  };
}

