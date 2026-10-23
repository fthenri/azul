"use client";

import { useEffect, useState, useCallback } from "react";

export const FLIGHT_MISSIONS_KEY = "flight_missions";

export interface FlightMission {
  id: string;
  assento: string;
  clienteNome: string;
  persona: string;
  tier: "Diamante" | "Safira" | "Topázio" | string;
  tipo: "atrito" | "vip";
  statusBadge: string;
  gatilho: string;
  instrucaoIA: string;
  acaoSugerida: string;
  status: "pendente" | "concluida";
  concluida: boolean;
  criadaEm: string;
  concluidaEm?: string;
}

// 4 Missões iniciais do voo AD4231 para que o MVP já inicie rico e pronto para teste
export const INITIAL_FLIGHT_MISSIONS: FlightMission[] = [
  {
    id: "mis_1A",
    assento: "1A",
    clienteNome: "Carlos Eduardo Mendes",
    persona: "Gestor Corporativo",
    tier: "Diamante",
    tipo: "atrito",
    statusBadge: "Alerta de Atrito",
    gatilho: "Extravio de bagagem despachada no trecho anterior (VCP)",
    instrucaoIA:
      "O cliente sofreu um extravio de bagagem recente no voo anterior. Agradeça a paciência, chame-o de Sr. Carlos, ofereça um snack premium da classe executiva e confirme que a bagagem prioritária já foi direcionada para a esteira 04 de Recife.",
    acaoSugerida: "Snack Premium + Prioridade de Bagagem",
    status: "pendente",
    concluida: false,
    criadaEm: "14:10",
  },
  {
    id: "mis_2C",
    assento: "2C",
    clienteNome: "Dra. Fernanda Lima",
    persona: "Viajante Solo Premium",
    tier: "Safira",
    tipo: "atrito",
    statusBadge: "Alerta de Atrito",
    gatilho: "Conexão apertada com atraso de 85 min em Campinas",
    instrucaoIA:
      "A passageira enfrentou conexão apertada com atraso crítico em Viracopos. Valide seu bem-estar, ofereça café espresso ou espumante de cortesia e informe que pousaremos 10 minutos antes do previsto.",
    acaoSugerida: "Café Espresso / Espumante de Cortesia",
    status: "pendente",
    concluida: false,
    criadaEm: "14:15",
  },
  {
    id: "mis_4D",
    assento: "4D",
    clienteNome: "Marcelo & Família",
    persona: "Líder Familiar",
    tier: "Safira",
    tipo: "vip",
    statusBadge: "Fidelização VIP",
    gatilho: "Família com 5 passageiros no mesmo PNR (Férias de Julho)",
    instrucaoIA:
      "Cliente viaja com a família completa (5 pessoas). Parabenize pelo voo com a Azul, entregue o kit de entretenimento infantil para as crianças e disponibilize fones de ouvido extras sem custo.",
    acaoSugerida: "Kit Kids + Fones Extras Cortesia",
    status: "pendente",
    concluida: false,
    criadaEm: "14:20",
  },
  {
    id: "mis_12B",
    assento: "12B",
    clienteNome: "Bruno Silveira",
    persona: "Gestor Corporativo",
    tier: "Diamante",
    tipo: "vip",
    statusBadge: "Fidelização VIP",
    gatilho: "Comemoração da marca de 100.000 pontos Azul Fidelidade",
    instrucaoIA:
      "O passageiro atingiu a marca histórica de 100k pontos no Azul Fidelidade. Reconheça a lealdade do passageiro, agradeça por voar Azul e ofereça uma taça de boas-vindas com brinde institucional.",
    acaoSugerida: "Brinde Institucional + Taça de Boas-Vindas",
    status: "pendente",
    concluida: false,
    criadaEm: "14:25",
  },
];

export function getStoredMissions(): FlightMission[] {
  if (typeof window === "undefined") return INITIAL_FLIGHT_MISSIONS;
  try {
    const raw = localStorage.getItem(FLIGHT_MISSIONS_KEY);
    if (!raw) {
      localStorage.setItem(FLIGHT_MISSIONS_KEY, JSON.stringify(INITIAL_FLIGHT_MISSIONS));
      return INITIAL_FLIGHT_MISSIONS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_FLIGHT_MISSIONS;
  } catch {
    return INITIAL_FLIGHT_MISSIONS;
  }
}

export function saveStoredMissions(missions: FlightMission[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FLIGHT_MISSIONS_KEY, JSON.stringify(missions));
    // Dispara evento customizado para sincronização dentro da mesma aba/janela
    window.dispatchEvent(new CustomEvent("flight_missions_updated"));
  } catch (e) {
    console.error("Erro ao salvar flight_missions no localStorage:", e);
  }
}

export function addOrUpdateMission(
  newMission: Omit<FlightMission, "id" | "criadaEm" | "status" | "concluida"> & { id?: string }
): FlightMission {
  const current = getStoredMissions();
  const existingIdx = current.findIndex((m) => m.assento === newMission.assento);

  const formatted: FlightMission = {
    id: newMission.id || `mis_${newMission.assento}_${Date.now()}`,
    assento: newMission.assento,
    clienteNome: newMission.clienteNome,
    persona: newMission.persona,
    tier: newMission.tier,
    tipo: newMission.tipo,
    statusBadge: newMission.statusBadge,
    gatilho: newMission.gatilho,
    instrucaoIA: newMission.instrucaoIA,
    acaoSugerida: newMission.acaoSugerida,
    status: "pendente",
    concluida: false,
    criadaEm: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };

  let updated: FlightMission[];
  if (existingIdx >= 0) {
    // Atualiza a missão existente para o assento com a nova instrução e reabre como pendente
    updated = [...current];
    updated[existingIdx] = formatted;
  } else {
    // Insere no topo
    updated = [formatted, ...current];
  }

  saveStoredMissions(updated);
  return formatted;
}

export function setMissionStatus(id: string, status: "pendente" | "concluida"): void {
  const current = getStoredMissions();
  const updated = current.map((m) => {
    if (m.id === id || m.assento === id) {
      const isDone = status === "concluida";
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
  saveStoredMissions(updated);
}

// Hook reativo para sincronização em tempo real (cross-tab via storage event e same-tab via custom event)
export function useFlightMissions() {
  const [missions, setMissions] = useState<FlightMission[]>(INITIAL_FLIGHT_MISSIONS);

  const reload = useCallback(() => {
    setMissions(getStoredMissions());
  }, []);

  useEffect(() => {
    reload();

    // Evento nativo do navegador: acionado quando outra aba altera o localStorage
    const handleStorage = (e: StorageEvent) => {
      if (e.key === FLIGHT_MISSIONS_KEY) {
        reload();
      }
    };

    // Evento customizado: acionado quando a mesma aba altera o localStorage
    const handleCustom = () => {
      reload();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("flight_missions_updated", handleCustom);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("flight_missions_updated", handleCustom);
    };
  }, [reload]);

  const completeMission = useCallback(
    (id: string) => {
      setMissionStatus(id, "concluida");
      reload();
    },
    [reload]
  );

  const reopenMission = useCallback(
    (id: string) => {
      setMissionStatus(id, "pendente");
      reload();
    },
    [reload]
  );

  const addMission = useCallback(
    (mission: Omit<FlightMission, "id" | "criadaEm" | "status" | "concluida"> & { id?: string }) => {
      const result = addOrUpdateMission(mission);
      reload();
      return result;
    },
    [reload]
  );

  const pendingCount = missions.filter((m) => m.status === "pendente" || !m.concluida).length;
  const completedCount = missions.filter((m) => m.status === "concluida" || m.concluida).length;

  return {
    missions,
    pendingCount,
    completedCount,
    completeMission,
    reopenMission,
    addMission,
    reload,
  };
}

