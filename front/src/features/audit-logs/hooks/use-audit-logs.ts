"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDemoMode } from "@/components/providers/demo-mode-context";
import { DEMO_AUDITORIA_DECISOES, DEMO_SHAP } from "@/lib/demo-data";
import { DecisaoAuditoria, ShapResponse } from "@/types/api";

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

  const decisoes = useMemo(() => auditQuery.data || [], [auditQuery.data]);

  // Consulta de explicabilidade SHAP para a decisão ou cliente atualmente selecionado
  const targetId = selectedDecisao?.decisao_id || selectedDecisao?.cliente_id;

  const shapQuery = useQuery<ShapResponse, Error>({
    queryKey: ["auditoria-shap", targetId, isDemoMode],
    queryFn: async () => {
      if (!targetId) throw new Error("Nenhuma decisão selecionada");
      if (isDemoMode) {
        // No modo demo, se for dec_456 ou cliente mapeado, retorna DEMO_SHAP
        return DEMO_SHAP;
      }
      return api.getDecisaoShap(targetId);
    },
    enabled: !!targetId,
  });

  // Navegação sequencial entre decisões
  const currentIndex = selectedDecisao
    ? decisoes.findIndex((d) => d.decisao_id === selectedDecisao.decisao_id)
    : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < decisoes.length - 1;

  const handleSelectPrev = useCallback(() => {
    if (hasPrev && decisoes[currentIndex - 1]) {
      setSelectedDecisao(decisoes[currentIndex - 1]);
    }
  }, [hasPrev, decisoes, currentIndex]);

  const handleSelectNext = useCallback(() => {
    if (hasNext && decisoes[currentIndex + 1]) {
      setSelectedDecisao(decisoes[currentIndex + 1]);
    }
  }, [hasNext, decisoes, currentIndex]);

  return {
    decisoes,
    isLoadingDecisoes: auditQuery.isLoading,
    isErrorDecisoes: auditQuery.isError,
    decisoesError: auditQuery.error,
    refetchDecisoes: auditQuery.refetch,
    selectedDecisao,
    setSelectedDecisao,
    shapData: shapQuery.data,
    isLoadingShap: shapQuery.isLoading,
    currentIndex,
    totalCount: decisoes.length,
    hasPrev,
    hasNext,
    handleSelectPrev,
    handleSelectNext,
    isDemoMode,
  };
}
