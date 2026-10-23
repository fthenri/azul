"use client";

/**
 * Módulo de compatibilidade e ponte para o novo gerenciador relacional de voos (flight-state.ts)
 */

export * from "./flight-state";
export type { Mission as FlightMission } from "./flight-state";
export {
  useFlightState as useFlightMissions,
  updateMissionStatus as setMissionStatus,
  addOrUpdateFlightMission as addOrUpdateMission,
} from "./flight-state";
