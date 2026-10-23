"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useDemoMode } from "@/components/providers/demo-mode-context";
import { DEMO_VOO_SIMULADO, getDemoSimularBordo } from "@/lib/demo-data";
import { AssentoVoo, SimularBordoPayload, SimularBordoResponse } from "@/types/api";

export type SeatFilter = "todos" | "atencao" | "critico" | "vip";

export function useCrewFlight() {
  const { isDemoMode } = useDemoMode();
  const [selectedSeat, setSelectedSeatState] = useState<AssentoVoo | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimularBordoResponse | null>(null);
  const [filter, setFilter] = useState<SeatFilter>("todos");
  const [attendedSeats, setAttendedSeats] = useState<Set<string>>(new Set());

  // Consulta do mapa de assentos do voo simulado
  const flightQuery = useQuery<AssentoVoo[], Error>({
    queryKey: ["voo-simulado", isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        return DEMO_VOO_SIMULADO;
      }
      return api.getVooSimulado();
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de cache para estabilidade da cabine
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
      setSimulationResult(data);
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
  };

  const rerunInFlightAction = (seat: AssentoVoo) => {
    simularBordoMutation.mutate({
      assento: seat.assento,
      id_cliente: seat.dados_cliente.id_cliente,
    });
  };

  return {
    seats: flightQuery.data || [],
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

