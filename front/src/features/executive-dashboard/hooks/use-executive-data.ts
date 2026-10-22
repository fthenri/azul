"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDemoMode } from "@/components/providers/demo-mode-context";
import { DEMO_KPIS, DEMO_PERSONAS, DEMO_PARETO } from "@/lib/demo-data";
import { DashboardKPIs, PersonaData, ParetoData } from "@/types/api";

export function useExecutiveData() {
  const { isDemoMode } = useDemoMode();

  // Conexão de estado: chamada à API para KPIs consolidados
  const kpisQuery = useQuery<DashboardKPIs, Error>({
    queryKey: ["dashboard-kpis", isDemoMode],
    queryFn: async () => {
      if (isDemoMode) return DEMO_KPIS;
      return api.getKPIs();
    },
  });

  // Conexão de estado: chamada à API para matriz e mapa de personas
  const personasQuery = useQuery<PersonaData[], Error>({
    queryKey: ["dashboard-personas", isDemoMode],
    queryFn: async () => {
      if (isDemoMode) return DEMO_PERSONAS;
      return api.getPersonas();
    },
  });

  // Conexão de estado: chamada à API para curva de concentração de Pareto
  const paretoQuery = useQuery<ParetoData[], Error>({
    queryKey: ["dashboard-pareto", isDemoMode],
    queryFn: async () => {
      if (isDemoMode) return DEMO_PARETO;
      return api.getPareto();
    },
  });

  const isLoading =
    kpisQuery.isLoading || personasQuery.isLoading || paretoQuery.isLoading;

  const isError =
    kpisQuery.isError || personasQuery.isError || paretoQuery.isError;

  const error =
    kpisQuery.error || personasQuery.error || paretoQuery.error;

  const refetchAll = () => {
    kpisQuery.refetch();
    personasQuery.refetch();
    paretoQuery.refetch();
  };

  return {
    kpis: kpisQuery.data,
    personas: personasQuery.data,
    pareto: paretoQuery.data,
    isLoading,
    isError,
    error,
    refetchAll,
    isDemoMode,
  };
}
