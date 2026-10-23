"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useDemoMode } from "@/components/providers/demo-mode-context";
import { DEMO_MOMENTOS, DEMO_SIMULACAO_RESULT, DEMO_SHAP } from "@/lib/demo-data";
import { Momento, SimularResponse, ShapResponse } from "@/types/api";
import { addMission, SyncMission } from "@/lib/sync-storage";

// Mapeamento dos clientes para assentos específicos na cabine do voo canônico AD4231
const CLIENT_INFO_MAP: Record<string, { nome: string; assento: string; tier: string }> = {
  cli_123: { nome: "Carlos Eduardo Mendes", assento: "1A", tier: "Diamante" },
  cli_456: { nome: "Dra. Fernanda Lima", assento: "2C", tier: "Safira" },
  cli_789: { nome: "Marcelo & Família", assento: "4D", tier: "Safira" },
  cli_101: { nome: "Bruno Silveira", assento: "12B", tier: "Diamante" },
  cli_202: { nome: "Juliana Rocha", assento: "3B", tier: "Topázio" },
};

export function useSimulation() {
  const { isDemoMode } = useDemoMode();
  const [selectedMomento, setSelectedMomento] = useState<Momento | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimularResponse | null>(null);
  const [lastDispatchedMission, setLastDispatchedMission] = useState<SyncMission | null>(null);

  // Conexão de estado: chamada à API para consulta da fila de momentos reais
  const momentosQuery = useQuery<Momento[], Error>({
    queryKey: ["momentos", isDemoMode],
    queryFn: async () => {
      if (isDemoMode) return DEMO_MOMENTOS;
      return api.getMomentos();
    },
  });

  // Alvo para consulta de explicabilidade SHAP (cliente ou momento selecionado)
  const targetId =
    selectedMomento?.cliente_id ||
    simulationResult?.dados_cliente?.id_cliente ||
    selectedMomento?.id;

  // Conexão de estado: chamada à API para explicabilidade SHAP do evento/cliente selecionado
  const shapQuery = useQuery<ShapResponse, Error>({
    queryKey: ["shap", targetId, isDemoMode],
    queryFn: async () => {
      if (!targetId) throw new Error("Nenhum evento ou cliente selecionado");
      if (isDemoMode) return DEMO_SHAP;
      return api.getDecisaoShap(targetId);
    },
    enabled: !!targetId,
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

      // =======================================================================
      // Lado do Emissor: O Gestor
      // Ao receber o resultado positivo da simulação (Ação Arbitrada Final),
      // cria um objeto de missão e chama addMission(novaMissao) no sync-storage.
      // Dispara o evento nativo 'local-storage-update' e 'storage' cross-tab.
      // =======================================================================
      const clientId = selectedMomento?.cliente_id || data.dados_cliente?.id_cliente || "cli_123";
      const clientInfo = CLIENT_INFO_MAP[clientId] || {
        nome: selectedMomento?.persona ? `${selectedMomento.persona}` : `Passageiro ${clientId}`,
        assento: "1A",
        tier: data.dados_cliente?.tier_fidelidade || "Diamante",
      };

      const instrucao = data.decisao_final.mensagem_llm || data.decisao_final.acao_vencedora || "Abordagem com cortesia.";
      const isAtrito = (data.dados_cliente?.risco_evasao || selectedMomento?.risco_evasao_atual || 0) > 0.6;

      const novaMissao: SyncMission = {
        id: `mis_${clientInfo.assento}_${Date.now()}`,
        passageiro: clientInfo.nome,
        assento: clientInfo.assento,
        instrucao: instrucao,
        status: "pendente",
        tipo: isAtrito ? "atrito" : "vip",
        persona: selectedMomento?.persona || data.dados_cliente?.persona || "Cliente Especial",
        tier: clientInfo.tier || data.dados_cliente?.tier_fidelidade || "Diamante",
        statusBadge: isAtrito ? "Alerta de Atrito" : "Fidelização VIP",
        gatilho: selectedMomento?.descricao || "Simulação de retenção gerada pelo Gestor",
        acao: data.decisao_final.acao_vencedora,
        criadaEm: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      };

      const dispatched = addMission(novaMissao);
      setLastDispatchedMission(dispatched);
    },
  });

  const handleSelectMomento = (momento: Momento) => {
    setSelectedMomento(momento);
    setSimulationResult(null);
    setLastDispatchedMission(null);
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
    lastDispatchedMission,
    isSimulating: simularMutation.isPending,
    simulationError: simularMutation.error,
    shapData: shapQuery.data,
    isLoadingShap: shapQuery.isLoading,
    isErrorShap: shapQuery.isError,
    shapError: shapQuery.error,
    isDemoMode,
  };
}
