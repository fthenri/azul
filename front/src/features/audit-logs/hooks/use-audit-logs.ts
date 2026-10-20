"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDemoMode } from "@/components/providers/demo-mode-context";
import { DEMO_AUDITORIA_DECISOES, DEMO_SHAP } from "@/lib/demo-data";
import { DecisaoAuditoria, ShapResponse } from "@/types/api";

export function useAuditLogs() {
  const { isDemoMode } = useDemoMode();
  const [selectedDecisao, setSelectedDecisao] = useState<DecisaoAuditoria | null>(null);

  // Lista de decisões de auditoria
  const auditQuery = useQuery<DecisaoAuditoria[], Error>({
    queryKey: ["auditoria-decisoes", isDemoMode],
    queryFn: async () => {
      if (isDemoMode) return DEMO_AUDITORIA_DECISOES;
      return api.getAuditoriaDecisoes();
    },
  });

  // Fatores SHAP da decisão selecionada
  const shapQuery = useQuery<ShapResponse, Error>({
    queryKey: ["auditoria-shap", selectedDecisao?.decisao_id, isDemoMode],
    queryFn: async () => {
      if (!selectedDecisao) throw new Error("Nenhuma decisão selecionada");
      if (isDemoMode) return DEMO_SHAP;
      return api.getDecisaoShap(selectedDecisao.decisao_id);
    },
    enabled: !!selectedDecisao,
  });

  return {
    decisoes: auditQuery.data,
    isLoadingDecisoes: auditQuery.isLoading,
    isErrorDecisoes: auditQuery.isError,
    decisoesError: auditQuery.error,
    refetchDecisoes: auditQuery.refetch,
    selectedDecisao,
    setSelectedDecisao,
    shapData: shapQuery.data,
    isLoadingShap: shapQuery.isLoading,
    isErrorShap: shapQuery.isError,
    shapError: shapQuery.error,
    isDemoMode,
  };
}
