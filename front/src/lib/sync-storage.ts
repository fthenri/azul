"use client";

/**
 * ============================================================================
 * Serviço de Estado Global e Sincronização de Missões (Torre de Decisões)
 * Chave de Missões: azul_active_missions
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
 */
export function getMissions(): SyncMission[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    return [];
  } catch (error) {
    console.error("Erro ao carregar azul_active_missions:", error);
    return [];
  }
}

/**
 * Adiciona uma nova missão ou atualiza se já existir com o mesmo ID ou assento.
 * Persiste no localStorage sob azul_active_missions e dispara o evento 'local-storage-update'.
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
    concluidaEm:
      status === "concluida"
        ? new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        : undefined,
  };

  const existingIndex = current.findIndex((m) => m.id === formatted.id || m.assento === formatted.assento);
  let updated: SyncMission[];

  if (existingIndex >= 0) {
    updated = [...current];
    updated[existingIndex] = formatted;
  } else {
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
 * Utilitário para limpar todas as missões (útil para testes ou reinicialização).
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
