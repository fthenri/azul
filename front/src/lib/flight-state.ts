"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

// ============================================================================
// Interfaces do Modelo Relacional de Voos & Missões (Arquitetura B2B)
// ============================================================================

export interface Flight {
  id: string; // Identificador oficial do voo (ex: "AD4231")
  rota: string; // Trecho operacional (ex: "VCP ➔ REC")
  origem: string; // Código IATA de origem (ex: "VCP")
  destino: string; // Código IATA de destino (ex: "REC")
  status: "planejado" | "ativo" | "concluido";
  data: string; // Data da operação YYYY-MM-DD
  aeronave: string; // Modelo do equipamento (ex: "A320neo")
  matricula: string; // Prefixo da aeronave (ex: "PR-YRS")
  altitude: string; // Nível de voo ou solo (ex: "FL360")
  horarioPartida: string; // Horário estimado de partida (ex: "13:30")
  horarioChegada: string; // Horário estimado de chegada (ex: "16:45")
  totalPassageiros?: number;
}

export interface Mission {
  id: string; // Identificador único da missão (ex: "mis_1A_AD4231")
  id_voo: string; // Chave estrangeira para Flight.id
  assento: string; // Código do assento (ex: "1A")
  passageiro: string; // Nome do passageiro
  clienteNome?: string; // Alias para compatibilidade
  persona?: string; // Cluster/Persona identificada pelo modelo
  tier?: string; // Categoria do programa Azul Fidelidade
  tipo?: "atrito" | "vip";
  statusBadge?: string; // Ex: "Alerta de Atrito" | "Fidelização VIP"
  gatilho?: string; // Evento gerador (atraso, extravio, PNR alto)
  instrucao_ia: string; // Instrução operacional gerada pelo LLM + RAG
  instrucaoIA?: string; // Alias para compatibilidade
  acaoSugerida?: string; // Ação prescritiva de bordo
  status: "pendente" | "concluida";
  concluida?: boolean; // Booleano derivado: status === "concluida"
  criadaEm?: string; // Timestamp de despacho (ex: "14:10")
  concluidaEm?: string; // Timestamp de execução (ex: "14:35")
}

// Chaves de armazenamento persistente no LocalStorage
export const FLIGHTS_STORAGE_KEY = "azul_flights";
export const MISSIONS_STORAGE_KEY = "flight_missions";

// ============================================================================
// Carga Inicial do Mock de Banco Relacional (Voo Canônico do Hackathon)
// ============================================================================

export const DEFAULT_FLIGHTS: Flight[] = [
  {
    id: "AD4231",
    rota: "VCP ➔ REC",
    origem: "VCP",
    destino: "REC",
    status: "ativo",
    data: "2026-10-23",
    aeronave: "A320neo",
    matricula: "PR-YRS",
    altitude: "FL360",
    horarioPartida: "13:30",
    horarioChegada: "16:45",
    totalPassageiros: 174,
  },
  {
    id: "AD4320",
    rota: "REC ➔ VCP",
    origem: "REC",
    destino: "VCP",
    status: "planejado",
    data: "2026-10-23",
    aeronave: "A320neo",
    matricula: "PR-YRS",
    altitude: "Solo",
    horarioPartida: "17:30",
    horarioChegada: "20:45",
    totalPassageiros: 168,
  },
  {
    id: "AD2105",
    rota: "CGH ➔ SDU",
    origem: "CGH",
    destino: "SDU",
    status: "concluido",
    data: "2026-10-23",
    aeronave: "E195-E2",
    matricula: "PR-PJN",
    altitude: "Solo",
    horarioPartida: "09:00",
    horarioChegada: "10:10",
    totalPassageiros: 136,
  },
];

export const DEFAULT_MISSIONS: Mission[] = [
  {
    id: "mis_1A_AD4231",
    id_voo: "AD4231",
    assento: "1A",
    passageiro: "Carlos Eduardo Mendes",
    clienteNome: "Carlos Eduardo Mendes",
    persona: "Gestor Corporativo",
    tier: "Diamante",
    tipo: "atrito",
    statusBadge: "Alerta de Atrito",
    gatilho: "Extravio de bagagem despachada no trecho anterior (VCP)",
    instrucao_ia:
      "O cliente sofreu um extravio de bagagem recente no voo anterior. Agradeça a paciência, chame-o de Sr. Carlos, ofereça um snack premium da classe executiva e confirme que a bagagem prioritária já foi direcionada para a esteira 04 de Recife.",
    instrucaoIA:
      "O cliente sofreu um extravio de bagagem recente no voo anterior. Agradeça a paciência, chame-o de Sr. Carlos, ofereça um snack premium da classe executiva e confirme que a bagagem prioritária já foi direcionada para a esteira 04 de Recife.",
    acaoSugerida: "Snack Premium + Prioridade de Bagagem",
    status: "pendente",
    concluida: false,
    criadaEm: "14:10",
  },
  {
    id: "mis_2C_AD4231",
    id_voo: "AD4231",
    assento: "2C",
    passageiro: "Dra. Fernanda Lima",
    clienteNome: "Dra. Fernanda Lima",
    persona: "Viajante Solo Premium",
    tier: "Safira",
    tipo: "atrito",
    statusBadge: "Alerta de Atrito",
    gatilho: "Conexão apertada com atraso de 85 min em Campinas",
    instrucao_ia:
      "A passageira enfrentou conexão apertada com atraso crítico em Viracopos. Valide seu bem-estar, ofereça café espresso ou espumante de cortesia e informe que pousaremos 10 minutos antes do previsto.",
    instrucaoIA:
      "A passageira enfrentou conexão apertada com atraso crítico em Viracopos. Valide seu bem-estar, ofereça café espresso ou espumante de cortesia e informe que pousaremos 10 minutos antes do previsto.",
    acaoSugerida: "Café Espresso / Espumante de Cortesia",
    status: "pendente",
    concluida: false,
    criadaEm: "14:15",
  },
  {
    id: "mis_4D_AD4231",
    id_voo: "AD4231",
    assento: "4D",
    passageiro: "Marcelo & Família",
    clienteNome: "Marcelo & Família",
    persona: "Líder Familiar",
    tier: "Safira",
    tipo: "vip",
    statusBadge: "Fidelização VIP",
    gatilho: "Família com 5 passageiros no mesmo PNR (Férias de Julho)",
    instrucao_ia:
      "Cliente viaja com a família completa (5 pessoas). Parabenize pelo voo com a Azul, entregue o kit de entretenimento infantil para as crianças e disponibilize fones de ouvido extras sem custo.",
    instrucaoIA:
      "Cliente viaja com a família completa (5 pessoas). Parabenize pelo voo com a Azul, entregue o kit de entretenimento infantil para as crianças e disponibilize fones de ouvido extras sem custo.",
    acaoSugerida: "Kit Kids + Fones Extras Cortesia",
    status: "pendente",
    concluida: false,
    criadaEm: "14:20",
  },
  {
    id: "mis_12B_AD4231",
    id_voo: "AD4231",
    assento: "12B",
    passageiro: "Bruno Silveira",
    clienteNome: "Bruno Silveira",
    persona: "Gestor Corporativo",
    tier: "Diamante",
    tipo: "vip",
    statusBadge: "Fidelização VIP",
    gatilho: "Comemoração da marca de 100.000 pontos Azul Fidelidade",
    instrucao_ia:
      "O passageiro atingiu a marca histórica de 100k pontos no Azul Fidelidade. Reconheça a lealdade do passageiro, agradeça por voar Azul e ofereça uma taça de boas-vindas com brinde institucional.",
    instrucaoIA:
      "O passageiro atingiu a marca histórica de 100k pontos no Azul Fidelidade. Reconheça a lealdade do passageiro, agradeça por voar Azul e ofereça uma taça de boas-vindas com brinde institucional.",
    acaoSugerida: "Brinde Institucional + Taça de Boas-Vindas",
    status: "pendente",
    concluida: false,
    criadaEm: "14:25",
  },
];

// ============================================================================
// Funções Utilitárias do Banco Relacional (LocalStorage Bridge)
// Preparadas para substituição futura por chamadas REST API (/api/v1/flights)
// ============================================================================

/**
 * Recupera todos os voos cadastrados no sistema.
 */
export function getFlights(): Flight[] {
  if (typeof window === "undefined") return DEFAULT_FLIGHTS;
  try {
    const raw = localStorage.getItem(FLIGHTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(FLIGHTS_STORAGE_KEY, JSON.stringify(DEFAULT_FLIGHTS));
      return DEFAULT_FLIGHTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_FLIGHTS;
  } catch {
    return DEFAULT_FLIGHTS;
  }
}

/**
 * Persiste ou atualiza um registro de voo.
 */
export function saveFlight(flight: Flight): void {
  if (typeof window === "undefined") return;
  try {
    const flights = getFlights();
    const idx = flights.findIndex((f) => f.id === flight.id);
    let updated: Flight[];
    if (idx >= 0) {
      updated = [...flights];
      updated[idx] = flight;
    } else {
      updated = [flight, ...flights];
    }
    localStorage.setItem(FLIGHTS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("flight_state_updated"));
  } catch (e) {
    console.error("Erro ao salvar voo no flight-state:", e);
  }
}

/**
 * Obtém o voo com status 'ativo' (em operação neste momento).
 */
export function getActiveFlight(): Flight {
  const flights = getFlights();
  return flights.find((f) => f.status === "ativo") || flights[0] || DEFAULT_FLIGHTS[0];
}

/**
 * Recupera todas as missões gravadas.
 */
export function getAllMissions(): Mission[] {
  if (typeof window === "undefined") return DEFAULT_MISSIONS;
  try {
    const raw = localStorage.getItem(MISSIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(MISSIONS_STORAGE_KEY, JSON.stringify(DEFAULT_MISSIONS));
      return DEFAULT_MISSIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_MISSIONS;
  } catch {
    return DEFAULT_MISSIONS;
  }
}

/**
 * Salva a lista de missões no storage e emite evento de sincronização.
 */
export function saveMissions(missions: Mission[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MISSIONS_STORAGE_KEY, JSON.stringify(missions));
    window.dispatchEvent(new CustomEvent("flight_state_updated"));
  } catch (e) {
    console.error("Erro ao salvar missões no flight-state:", e);
  }
}

/**
 * Recupera as missões vinculadas a um ID de voo específico.
 */
export function getMissionsByFlight(flightId: string): Mission[] {
  const all = getAllMissions();
  return all
    .filter((m) => m.id_voo === flightId || !m.id_voo) // Fallback para manter legadas
    .map((m) => ({
      ...m,
      id_voo: m.id_voo || flightId,
      clienteNome: m.clienteNome || m.passageiro,
      passageiro: m.passageiro || m.clienteNome || `Passageiro ${m.assento}`,
      instrucaoIA: m.instrucaoIA || m.instrucao_ia,
      instrucao_ia: m.instrucao_ia || m.instrucaoIA || "",
      concluida: m.status === "concluida" || !!m.concluida,
    }));
}

/**
 * Atualiza o status de uma missão de voo ('pendente' | 'concluida').
 */
export function updateMissionStatus(missionId: string, status: "pendente" | "concluida"): void {
  const all = getAllMissions();
  const isDone = status === "concluida";
  const updated = all.map((m) => {
    if (m.id === missionId || m.assento === missionId) {
      return {
        ...m,
        status,
        concluida: isDone,
        concluidaEm: isDone
          ? new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
          : undefined,
      };
    }
    return m;
  });
  saveMissions(updated);
}

export type MissionInput = Partial<Mission> & { assento: string };

/**
 * Adiciona ou despacha uma nova missão gerada pelo Gestor para o voo ativo.
 */
export function addOrUpdateFlightMission(data: MissionInput): Mission {
  const all = getAllMissions();
  const flightId = data.id_voo || getActiveFlight().id;
  const missionId = data.id || `mis_${data.assento}_${flightId}`;

  const formatted: Mission = {
    id: missionId,
    id_voo: flightId,
    assento: data.assento,
    passageiro: data.passageiro || data.clienteNome || `Assento ${data.assento}`,
    clienteNome: data.clienteNome || data.passageiro,
    persona: data.persona || "Cliente Especial",
    tier: data.tier || "Diamante",
    tipo: data.tipo || "vip",
    statusBadge: data.statusBadge || (data.tipo === "atrito" ? "Alerta de Atrito" : "Fidelização VIP"),
    gatilho: data.gatilho || "Ação despachada pelo despachante de voo",
    instrucao_ia: data.instrucao_ia || data.instrucaoIA || "",
    instrucaoIA: data.instrucaoIA || data.instrucao_ia || "",
    acaoSugerida: data.acaoSugerida || "Abordagem com cortesia",
    status: data.status || "pendente",
    concluida: data.status === "concluida",
    criadaEm: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };

  const existingIdx = all.findIndex((m) => m.assento === data.assento && (m.id_voo === flightId || !m.id_voo));
  let updated: Mission[];
  if (existingIdx >= 0) {
    updated = [...all];
    updated[existingIdx] = formatted;
  } else {
    updated = [formatted, ...all];
  }

  saveMissions(updated);
  return formatted;
}

// ============================================================================
// Hook Reativo useFlightState (Sincronização B2B Gestor <-> Comissária)
// ============================================================================

export function useFlightState(selectedFlightId?: string) {
  const [flights, setFlights] = useState<Flight[]>(DEFAULT_FLIGHTS);
  const [activeFlight, setActiveFlightState] = useState<Flight>(DEFAULT_FLIGHTS[0]);
  const [missions, setMissions] = useState<Mission[]>(DEFAULT_MISSIONS);

  const currentFlightId = selectedFlightId || activeFlight?.id || "AD4231";

  const reloadData = useCallback(() => {
    const loadedFlights = getFlights();
    setFlights(loadedFlights);
    const active = loadedFlights.find((f) => f.status === "ativo") || loadedFlights[0] || DEFAULT_FLIGHTS[0];
    setActiveFlightState(active);

    const flightIdToQuery = selectedFlightId || active.id;
    const flightMissions = getMissionsByFlight(flightIdToQuery);
    setMissions(flightMissions);
  }, [selectedFlightId]);

  useEffect(() => {
    reloadData();

    // Evento de armazenamento entre abas diferentes (Cross-Tab sync)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === MISSIONS_STORAGE_KEY || e.key === FLIGHTS_STORAGE_KEY) {
        reloadData();
      }
    };

    // Evento de sincronização na mesma aba
    const handleCustomEvent = () => {
      reloadData();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("flight_state_updated", handleCustomEvent);
    window.addEventListener("flight_missions_updated", handleCustomEvent);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("flight_state_updated", handleCustomEvent);
      window.removeEventListener("flight_missions_updated", handleCustomEvent);
    };
  }, [reloadData]);

  const markComplete = useCallback(
    (missionId: string) => {
      updateMissionStatus(missionId, "concluida");
      reloadData();
    },
    [reloadData]
  );

  const markReopen = useCallback(
    (missionId: string) => {
      updateMissionStatus(missionId, "pendente");
      reloadData();
    },
    [reloadData]
  );

  const addMission = useCallback(
    (missionData: MissionInput) => {
      const result = addOrUpdateFlightMission(missionData);
      reloadData();
      return result;
    },
    [reloadData]
  );

  const pendingCount = useMemo(
    () => missions.filter((m) => m.status === "pendente" || !m.concluida).length,
    [missions]
  );

  const completedCount = useMemo(
    () => missions.filter((m) => m.status === "concluida" || m.concluida).length,
    [missions]
  );

  const vipCount = 12; // Indicador fixo do manifesto de cabine

  return {
    flights,
    activeFlight,
    currentFlightId,
    missions,
    pendingCount,
    completedCount,
    vipCount,
    markComplete,
    markReopen,
    addMission,
    reloadData,
  };
}
