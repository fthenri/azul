"use client";

/**
 * ============================================================================
 * Serviço de Estado Global e Sincronização Cross-Tab em Tempo Real
 * Chave de Armazenamento: azul_active_missions
 * Evento Nativo de Sincronização: local-storage-update
 * ============================================================================
 */

export const STORAGE_KEY = "azul_active_missions";
export const SYNC_EVENT_NAME = "local-storage-update";

export interface SyncMission {
  id: string;
  passageiro: string;
  assento: string;
  instrucao: string;
  status: "pendente" | "concluida";
  // Campos complementares para enriquecimento visual do card
  tipo?: "atrito" | "vip";
  persona?: string;
  tier?: string;
  statusBadge?: string;
  gatilho?: string;
  acao?: string;
  criadaEm?: string;
  concluidaEm?: string;
}

/**
 * Dispara evento nativo no objeto window para sincronização na mesma aba.
 * O localStorage nativo já dispara o evento 'storage' para abas paralelas.
 */
function emitLocalStorageUpdate(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SYNC_EVENT_NAME));
  }
}

/**
 * Recupera todas as missões ativas salvas no localStorage.
 * Retorna array vazio caso não haja missões (sem dados mockados hardcoded).
 */
export function getMissions(): SyncMission[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.error("Erro ao carregar azul_active_missions:", error);
    return [];
  }
}

/**
 * Adiciona uma nova missão ou atualiza se já existir com o mesmo ID ou assento.
 * Persiste no localStorage e dispara o evento 'local-storage-update'.
 */
export function addMission(mission: Partial<SyncMission> & { assento: string }): SyncMission {
  const current = getMissions();
  const missionId = mission.id || `mis_${mission.assento}_${Date.now()}`;
  const status = mission.status || "pendente";

  const formatted: SyncMission = {
    id: missionId,
    assento: mission.assento,
    passageiro: mission.passageiro || `Passageiro Assento ${mission.assento}`,
    instrucao: mission.instrucao || "Instrução de atendimento gerada pela IA.",
    status,
    tipo: mission.tipo || "vip",
    persona: mission.persona || "Cliente Especial",
    tier: mission.tier || "Diamante",
    statusBadge: mission.statusBadge || (mission.tipo === "atrito" ? "Alerta de Atrito" : "Fidelização VIP"),
    gatilho: mission.gatilho || "Ação despachada pelo simulador de decisões",
    acao: mission.acao || "Abordagem com Cortesia",
    criadaEm: mission.criadaEm || new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    concluidaEm: status === "concluida" ? new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : undefined,
  };

  // Se já existir missão com o mesmo id ou assento, atualiza o registro
  const existingIndex = current.findIndex((m) => m.id === formatted.id || m.assento === formatted.assento);
  let updated: SyncMission[];

  if (existingIndex >= 0) {
    updated = [...current];
    updated[existingIndex] = formatted;
  } else {
    // Insere no topo da fila de atendimento
    updated = [formatted, ...current];
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Erro ao salvar missão no localStorage:", e);
    }
    emitLocalStorageUpdate();
  }

  return formatted;
}

/**
 * Atualiza o status de uma missão ('pendente' | 'concluida') pelo ID ou assento.
 * Persiste no localStorage e dispara o evento 'local-storage-update'.
 */
export function updateMissionStatus(id: string, status: "pendente" | "concluida"): void {
  const current = getMissions();
  const isDone = status === "concluida";

  const updated = current.map((m) => {
    if (m.id === id || m.assento === id) {
      return {
        ...m,
        status,
        concluidaEm: isDone
          ? new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
          : undefined,
      };
    }
    return m;
  });

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Erro ao atualizar status da missão no localStorage:", e);
    }
    emitLocalStorageUpdate();
  }
}

/**
 * Utilitário para limpar todas as missões (útil para testes ou reinicialização de voo).
 */
export function clearMissions(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Erro ao limpar missões no localStorage:", e);
    }
    emitLocalStorageUpdate();
  }
}

