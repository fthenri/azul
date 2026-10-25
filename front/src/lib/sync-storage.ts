"use client";

/**
 * ============================================================================
 * Serviço de Estado Global e Sincronização Cross-Tab em Tempo Real (B2B RBAC)
 * Chave de Missões: azul_active_missions
 * Chave de Voo Ativo / Despacho: azul_active_flight
 * Evento Nativo de Sincronização: local-storage-update
 * ============================================================================
 */

import { AssentoVoo, MetadataAeronave } from "@/types/api";

export const STORAGE_KEY = "azul_active_missions";
export const FLIGHT_STORAGE_KEY = "azul_active_flight";
export const SYNC_EVENT_NAME = "local-storage-update";

export interface ActiveFlight {
  id: string; // Ex: "AD4231"
  rota: string; // Ex: "VCP ➔ REC"
  status: "planejado" | "ativo" | "concluido";
  despachado: boolean;
  despachadoEm?: string;
  origem?: string;
  destino?: string;
  aeronave?: string; // Ex: "Embraer E195-E2"
  totalPassageiros?: number;
  // Metadados enriquecidos para sincronização exata da planta da aeronave
  aircraft_model?: string; // Ex: "Embraer E195-E2"
  layout?: string | string[]; // Ex: "2x2" ou "3x3" ou ["A", "B", "C", "D"]
  total_rows?: number; // Ex: 29
  fileiras?: number;
  assentos?: AssentoVoo[];
  metadata?: {
    aircraft_model?: string;
    layout?: string | string[];
    [key: string]: any;
  } | MetadataAeronave | null;
  missions?: SyncMission[];
}

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

// ============================================================================
// 1. GESTÃO DE ESTADO DO VOO E DESPACHO (Torre de Controle <-> Tripulação)
// ============================================================================

/**
 * Recupera o registro do voo ativo despachado no localStorage.
 * Retorna null se nenhum voo tiver sido despachado ainda pelo gestor.
 */
export function getActiveFlight(): ActiveFlight | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(FLIGHT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.despachado) {
      return parsed as ActiveFlight;
    }
    return null;
  } catch (error) {
    console.error("Erro ao carregar azul_active_flight:", error);
    return null;
  }
}

/**
 * Despacha formalmente um voo pelo Gestor na Torre de Controle.
 * Grava na chave azul_active_flight e emite o evento de sincronização cross-tab.
 */
export function dispatchFlight(flightData?: Partial<ActiveFlight>): ActiveFlight {
  const model = flightData?.aircraft_model || flightData?.aeronave || "Embraer E195-E2";
  const layout = flightData?.layout || (flightData?.metadata?.layout?.length === 4 ? "2x2" : "3x3");
  const totalRows = flightData?.total_rows || flightData?.metadata?.fileiras || 29;

  const flight: ActiveFlight = {
    id: flightData?.id || "AD4231",
    rota: flightData?.rota || "VCP ➔ REC",
    origem: flightData?.origem || "VCP",
    destino: flightData?.destino || "REC",
    status: "ativo",
    despachado: true,
    despachadoEm:
      flightData?.despachadoEm ||
      new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    aeronave: model,
    aircraft_model: model,
    layout: layout,
    total_rows: totalRows,
    fileiras: totalRows,
    totalPassageiros: flightData?.totalPassageiros || (layout === "2x2" ? 116 : 174),
    ...flightData,
    assentos: flightData?.assentos || [],
    metadata: {
      ...((flightData?.metadata as any) || {}),
      aircraft_model: (flightData?.metadata as any)?.aircraft_model || model,
      layout: (flightData?.metadata as any)?.layout || layout,
      modelo: (flightData?.metadata as any)?.modelo || model,
      codigo: (flightData?.metadata as any)?.codigo || "E195-E2",
      fileiras: (flightData?.metadata as any)?.fileiras || totalRows,
      total_assentos: (flightData?.metadata as any)?.total_assentos || (layout === "2x2" ? 116 : 174),
    },
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(FLIGHT_STORAGE_KEY, JSON.stringify(flight));
      window.dispatchEvent(new Event("azul_flight_updated"));
    } catch (e) {
      console.error("Erro ao salvar azul_active_flight no localStorage:", e);
    }
    emitLocalStorageUpdate();
  }

  return flight;
}

/**
 * Reseta o despacho de voo (para testes ou reinicialização).
 */
export function resetFlightDispatch(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(FLIGHT_STORAGE_KEY);
    } catch (e) {
      console.error("Erro ao remover azul_active_flight:", e);
    }
    emitLocalStorageUpdate();
  }
}

// ============================================================================
// 2. GESTÃO DE MISSÕES IA (Emissão do Gestor <-> Recepção da Comissária)
// ============================================================================

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
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Fallback: busca dentro de azul_active_flight.missions se existir
    const flightRaw = localStorage.getItem(FLIGHT_STORAGE_KEY);
    if (flightRaw) {
      const flightParsed = JSON.parse(flightRaw);
      if (Array.isArray(flightParsed?.missions) && flightParsed.missions.length > 0) {
        return flightParsed.missions;
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
 * Persiste no localStorage sob azul_active_missions e azul_active_flight,
 * e dispara o evento 'local-storage-update'.
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

      // Sincroniza também dentro da chave azul_active_flight
      const flightRaw = localStorage.getItem(FLIGHT_STORAGE_KEY);
      if (flightRaw) {
        const flightParsed = JSON.parse(flightRaw);
        flightParsed.missions = updated;
        localStorage.setItem(FLIGHT_STORAGE_KEY, JSON.stringify(flightParsed));
        window.dispatchEvent(new Event("azul_flight_updated"));
      }
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

      // Sincroniza também dentro da chave azul_active_flight
      const flightRaw = localStorage.getItem(FLIGHT_STORAGE_KEY);
      if (flightRaw) {
        const flightParsed = JSON.parse(flightRaw);
        flightParsed.missions = updated;
        localStorage.setItem(FLIGHT_STORAGE_KEY, JSON.stringify(flightParsed));
        window.dispatchEvent(new Event("azul_flight_updated"));
      }
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

/**
 * Despacha formalmente em lote um voo e suas missões para a cabine (/crew).
 * Grava atomicamente em azul_active_flight e azul_active_missions, disparando
 * eventos de sincronização cross-tab e locais.
 */
export function dispatchBatchFlightAndMissions(
  flightData: Partial<ActiveFlight>,
  missions: Partial<SyncMission>[]
): { flight: ActiveFlight; missions: SyncMission[] } {
  const formattedMissions: SyncMission[] = missions.map((m, idx) => ({
    id: m.id || `mis_${m.assento || idx}_${Date.now()}`,
    assento: m.assento || "1A",
    passageiro: m.passageiro || `Passageiro Assento ${m.assento}`,
    instrucao: m.instrucao || "Instrução de atendimento tático gerada pela IA.",
    status: (m.status as "pendente" | "concluida") || "pendente",
    tipo: (m.tipo as "atrito" | "vip") || "vip",
    persona: m.persona || "Cliente Especial",
    tier: m.tier || "Diamante",
    statusBadge: m.statusBadge || (m.tipo === "atrito" ? "Alerta de Atrito" : "Fidelização VIP"),
    gatilho: m.gatilho || "Ação despachada pelo simulador de decisões",
    acao: m.acao || "Abordagem com Cortesia",
    criadaEm: m.criadaEm || new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  }));

  const flight = dispatchFlight({
    ...flightData,
    missions: formattedMissions,
  });

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formattedMissions));
    } catch (e) {
      console.error("Erro ao salvar lote de missões no localStorage:", e);
    }
    emitLocalStorageUpdate();
  }

  return { flight, missions: formattedMissions };
}
