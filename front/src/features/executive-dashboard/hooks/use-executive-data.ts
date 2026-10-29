"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DashboardKPIs, PersonaData, ParetoData } from "@/types/api";

export function useExecutiveData() {
  // Chamada à API real para KPIs consolidados (DuckDB Camada Gold)
  const kpisQuery = useQuery<DashboardKPIs, Error>({
    queryKey: ["dashboard-kpis"],
    queryFn: async () => {
      return api.getKPIs();
    },
    refetchOnWindowFocus: true,
  });

  // Chamada à API real para matriz e mapa de personas (DuckDB)
  const personasQuery = useQuery<PersonaData[], Error>({
    queryKey: ["dashboard-personas"],
    queryFn: async () => {
      return api.getPersonas();
    },
    refetchOnWindowFocus: true,
  });

  // Chamada à API real para curva de concentração de Pareto (DuckDB)
  const paretoQuery = useQuery<ParetoData[], Error>({
    queryKey: ["dashboard-pareto"],
    queryFn: async () => {
      return api.getPareto();
    },
    refetchOnWindowFocus: true,
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
  };
}
