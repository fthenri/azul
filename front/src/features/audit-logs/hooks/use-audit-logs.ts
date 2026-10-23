"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDemoMode } from "@/components/providers/demo-mode-context";
import { DEMO_AUDITORIA_DECISOES } from "@/lib/demo-data";
import { DecisaoAuditoria } from "@/types/api";

export function useAuditLogs() {
  const { isDemoMode } = useDemoMode();
  const [selectedDecisao, setSelectedDecisao] = useState<DecisaoAuditoria | null>(null);

  // Conexão de estado: chamada à API para histórico de decisões de auditoria
  const auditQuery = useQuery<DecisaoAuditoria[], Error>({
    queryKey: ["auditoria-decisoes", isDemoMode],
    queryFn: async () => {
      if (isDemoMode) return DEMO_AUDITORIA_DECISOES;
      return api.getAuditoriaDecisoes();
    },
  });

  return {
    decisoes: auditQuery.data,
    isLoadingDecisoes: auditQuery.isLoading,
    isErrorDecisoes: auditQuery.isError,
    decisoesError: auditQuery.error,
    refetchDecisoes: auditQuery.refetch,
    selectedDecisao,
    setSelectedDecisao,
    isDemoMode,
  };
}
