"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useDemoMode } from "@/components/providers/demo-mode-context";
import { DEMO_VOO_SIMULADO, getDemoSimularBordo, getDemoVooSimulado } from "@/lib/demo-data";
import { addOrUpdateMission, setMissionStatus } from "@/lib/missions-storage";
import { addMission as addSyncMission } from "@/lib/sync-storage";
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
    onSuccess: (data) => {
      // Salva apenas o resultado da análise para visualização do gestor (sem sincronizar prematuramente com a cabine)
      setSimulationResult(data);
    },
  });

  const handleSelectSeat = (seat: AssentoVoo) => {
    // Inspeção de passageiro: Seleciona o assento sem acionar simulação nem sincronização automática
    setSelectedSeatState(seat);
    setSimulationResult(null);
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

