"use client";

import React, { useMemo } from "react";
import {
  AlertTriangle,
  Crown,
  CheckCircle2,
  User,
  ShieldAlert,
  Sparkles,
  Plane,
} from "lucide-react";
import { AssentoVoo, MetadataAeronave } from "@/types/api";
import { SeatFilter } from "../hooks/use-crew-flight";
import { Mission } from "@/lib/flight-state";
import { SyncMission } from "@/lib/sync-storage";
import { cn } from "@/lib/utils";

export type SeatMapRole = "gestor" | "crew";

export interface CrewSeatMapProps {
  metadata: MetadataAeronave | null;
  seats: AssentoVoo[];
  selectedSeat: AssentoVoo | null;
  onSelectSeat: (seat: AssentoVoo) => void;
  filter?: SeatFilter;
  attendedSeats?: Set<string>;
  // RBAC Prop
  role?: SeatMapRole;
  missions?: (SyncMission | Mission)[];
  onSelectMissionSeat?: (mission: SyncMission | Mission, seat: AssentoVoo) => void;
  // Compatibilidade retroativa com código existente
  isDirectionalOnly?: boolean;
  missionSeatMap?: Map<string, SyncMission | Mission>;
}

export function CrewSeatMap({
  metadata,
  seats,
  selectedSeat,
  onSelectSeat,
  filter = "todos",
  attendedSeats = new Set(),
  role = "gestor",
  missions = [],
  onSelectMissionSeat,
  isDirectionalOnly = false,
  missionSeatMap,
}: CrewSeatMapProps) {
  // Indexa assentos por código (ex: "1A", "34D") para acesso O(1)
  const seatMap = useMemo(() => {
    const map = new Map<string, AssentoVoo>();
    seats.forEach((s) => map.set(s.assento, s));
    return map;
  }, [seats]);

  // Indexa missões por assento para o modo crew (RBAC)
  const activeMissionMap = useMemo(() => {
    const map = new Map<string, SyncMission | Mission>();
    if (Array.isArray(missions)) {
      missions.forEach((m) => map.set(m.assento, m));
    }
    if (missionSeatMap) {
      missionSeatMap.forEach((m, k) => map.set(k, m));
    }
    return map;
  }, [missions, missionSeatMap]);

  const numFileiras = metadata?.fileiras || 29;
  const layout = metadata?.layout || ["A", "B", "C", "D", "E", "F"];
  const is6Seats = layout.length === 6;

  // Divisão dinâmica das colunas: 3x3 para A320 ou 2x2 para E195 e ATR
  const leftCols = is6Seats ? ["A", "B", "C"] : ["A", "B"];
  const rightCols = is6Seats ? ["D", "E", "F"] : ["C", "D"];

  const rows = useMemo(() => {
    const list: number[] = [];
    for (let r = 1; r <= numFileiras; r++) {
      list.push(r);
    }
    return list;
  }, [numFileiras]);

  const isSeatHighlighted = (seat: AssentoVoo): boolean => {
    if (filter === "todos") return true;
    if (filter === "atencao") return seat.status === "critico" || seat.status === "vip";
    if (filter === "critico") return seat.status === "critico";
    if (filter === "vip") return seat.status === "vip";
    return true;
  };

  const renderSeat = (row: number, col: string) => {
    const seatCode = `${row}${col}`;
    const seat = seatMap.get(seatCode);

    if (!seat) {
      return (
        <div
          key={seatCode}
          className="h-14 w-11 sm:w-13 md:w-14 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-center opacity-40 text-[10px] text-muted-foreground"
        >
          {seatCode}
        </div>
      );
    }

    const isSelected = selectedSeat?.assento === seat.assento;
    const isAttended = attendedSeats.has(seat.assento);
    const highlighted = isSeatHighlighted(seat);
    const isEspacoAzul = metadata?.codigo === "ATR 72-600" ? row <= 2 : row <= 4;

    // =========================================================================
    // RBAC: MODO TRIPULAÇÃO (role === 'crew' ou isDirectionalOnly)
    // Se role === 'crew': O componente varre o array de missions.
    // Se o assento TEM uma missão associada, ele fica destacado (ativo) e clicável.
    // Se o assento NÃO TEM missão, ele recebe classes como opacity-40 cursor-not-allowed grayscale
    // e o clique é desabilitado.
    // =========================================================================
    const isCrewMode = role === "crew" || isDirectionalOnly;

    if (isCrewMode) {
      const mission = activeMissionMap.get(seatCode);

      // Assento SEM missão vinculada no modo tripulação:
      // opacity-40 cursor-not-allowed grayscale e sem eventos de clique
      if (!mission) {
        return (
          <div
            key={seatCode}
            aria-disabled="true"
            className="relative flex flex-col items-center justify-between p-1 sm:p-1.5 h-14 w-11 sm:w-13 md:w-14 rounded-lg border border-slate-200/50 dark:border-slate-800/40 bg-slate-100/30 dark:bg-slate-900/30 text-slate-400 dark:text-slate-600 opacity-40 cursor-not-allowed grayscale select-none"
            title={`${seatCode}: Sem missão operacional associada`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-mono text-[11px] font-bold text-slate-400 dark:text-slate-600">
                {seatCode}
              </span>
            </div>
            <span className="text-[9px] text-muted-foreground/50 font-medium truncate max-w-full">
              {seat.dados_cliente?.nome ? seat.dados_cliente.nome.split(" ")[0] : "Livre"}
            </span>
            <span className="text-[8px] opacity-30 font-mono">
              {seat.dados_cliente?.tier_fidelidade ? seat.dados_cliente.tier_fidelidade.slice(0, 3) : "STD"}
            </span>
          </div>
        );
      }

      // Assento COM missão no modo tripulação:
      // Destacado (ativo), colorido com pulso ou check de concluído, e clicável
      const isDone = mission.status === "concluida" || (mission as any).concluida;
      const isAtrito = mission.tipo === "atrito";

      return (
        <button
          key={seatCode}
          type="button"
          onClick={() => {
            if (onSelectMissionSeat) {
              onSelectMissionSeat(mission, seat);
            } else {
              onSelectSeat(seat);
            }
          }}
          className={cn(
            "relative group flex flex-col items-center justify-between p-1 sm:p-1.5 h-14 w-11 sm:w-13 md:w-14 rounded-lg border text-left transition-all duration-200 cursor-pointer shadow-md",
            isDone
              ? "bg-emerald-50 text-emerald-950 border-emerald-400 dark:bg-emerald-950/70 dark:text-emerald-100 dark:border-emerald-500 ring-2 ring-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/70"
              : isAtrito
              ? "bg-rose-50 text-rose-950 border-rose-400 dark:bg-rose-950/70 dark:text-rose-100 dark:border-rose-500 ring-2 ring-rose-500 ring-offset-2 hover:bg-rose-100 dark:hover:bg-rose-900/70 animate-pulse"
              : "bg-amber-50 text-amber-950 border-amber-400 dark:bg-amber-950/70 dark:text-amber-100 dark:border-amber-400 ring-2 ring-amber-400 ring-offset-2 hover:bg-amber-100 dark:hover:bg-amber-900/70 animate-pulse",
            isSelected && "scale-105 ring-4 z-20 shadow-lg"
          )}
          title={`Missão IA: ${seatCode} - ${mission.passageiro || seat.dados_cliente?.nome} (${isDone ? "Concluída" : "Pendente"})`}
        >
          {/* Header do Assento com Missão */}
          <div className="flex items-center justify-between w-full">
            <span className="font-mono text-[11px] sm:text-xs font-black tracking-tight">
              {seatCode}
            </span>
            {isDone ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : isAtrito ? (
              <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400 shrink-0" />
            ) : (
              <Sparkles className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
          </div>

          {/* Nome do Passageiro da Missão */}
          <div className="w-full truncate text-[9px] sm:text-[10px] font-bold leading-tight">
            {(mission.passageiro || seat.dados_cliente?.nome || "").split(" ")[0]}
          </div>

          {/* Rodapé: Tier e Badge de IA */}
          <div className="flex items-center justify-between w-full text-[8px] font-black uppercase">
            <span className="truncate">
              {mission.tier?.slice(0, 3) || seat.dados_cliente?.tier_fidelidade?.slice(0, 3) || "VIP"}
            </span>
            <span
              className={cn(
                "rounded px-1 text-[7px] font-bold",
                isDone
                  ? "bg-emerald-600 text-white"
                  : isAtrito
                  ? "bg-rose-600 text-white"
                  : "bg-amber-600 text-white"
              )}
            >
              {isDone ? "OK" : "MISSÃO"}
            </span>
          </div>

          {/* Marcador Ping se Pendente */}
          {!isDone && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span
                className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  isAtrito ? "bg-rose-400" : "bg-amber-400"
                )}
              />
              <span
                className={cn(
                  "relative inline-flex rounded-full h-2.5 w-2.5",
                  isAtrito ? "bg-rose-500" : "bg-amber-500"
                )}
              />
            </span>
          )}
        </button>
      );
    }

    // =========================================================================
    // RBAC: MODO GESTOR (role === 'gestor')
    // Se role === 'gestor': Todos os assentos são renderizados normalmente.
    // O clique no assento abre o modal/agente LLM para gerar a missão.
    // =========================================================================
    let statusStyles = "";
    let indicatorIcon = null;

    if (seat.status === "critico") {
      statusStyles = cn(
        "bg-rose-50 text-rose-950 border-rose-400 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-600 dark:hover:bg-rose-900/50 shadow-xs",
        isSelected && "ring-2 ring-rose-500 ring-offset-2 dark:ring-offset-slate-950"
      );
      indicatorIcon = (
        <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400 shrink-0" />
      );
    } else if (seat.status === "vip") {
      statusStyles = cn(
        "bg-amber-50/90 text-amber-950 border-amber-400 hover:bg-amber-100/90 dark:bg-[#002855] dark:text-amber-200 dark:border-amber-400/80 dark:hover:bg-[#003B7A] shadow-xs",
        isSelected && "ring-2 ring-amber-400 ring-offset-2 dark:ring-offset-slate-950"
      );
      indicatorIcon = (
        <Crown className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
      );
    } else {
      statusStyles = cn(
        "bg-slate-100/90 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700/60",
        isSelected && "ring-2 ring-[#0077C8] ring-offset-2 dark:ring-offset-slate-950"
      );
      indicatorIcon = (
        <User className="h-2.5 w-2.5 text-slate-400 dark:text-slate-500 shrink-0" />
      );
    }

    return (
      <button
        key={seatCode}
        type="button"
        onClick={() => onSelectSeat(seat)}
        className={cn(
          "relative group flex flex-col items-center justify-between p-1 sm:p-1.5 h-14 w-11 sm:w-13 md:w-14 rounded-lg border text-left transition-all duration-150 cursor-pointer",
          statusStyles,
          !highlighted && "opacity-25 hover:opacity-100 scale-95",
          highlighted && "hover:scale-105 active:scale-95",
          isSelected && "scale-105 shadow-md z-10"
        )}
        title={`${seatCode}: ${seat.dados_cliente.nome} (${seat.status.toUpperCase()}) - ${seat.dados_cliente.tier_fidelidade}`}
      >
        {/* Header do Assento: Código + Ícone de Status */}
        <div className="flex items-center justify-between w-full">
          <span className="font-mono text-[11px] sm:text-xs font-black tracking-tight">
            {seatCode}
          </span>
          {indicatorIcon}
        </div>

        {/* Nome Resumido / Iniciais */}
        <div className="w-full truncate text-[9px] sm:text-[10px] font-medium leading-tight">
          {seat.dados_cliente.nome.split(" ")[0]}
        </div>

        {/* Rodapé do Assento: Tier ou Selo de Atendido */}
        <div className="flex items-center justify-between w-full text-[8px] opacity-80 font-semibold uppercase">
          <span className="truncate">
            {seat.dados_cliente.tier_fidelidade.slice(0, 3)}
          </span>

          {isAttended ? (
            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400 ml-0.5" />
          ) : seat.status === "critico" ? (
            <span className="text-[8px] font-bold text-rose-600 dark:text-rose-400">
              {Math.round(seat.dados_cliente.risco_evasao * 100)}%
            </span>
          ) : isEspacoAzul ? (
            <span className="text-[7px] text-[#0077C8] dark:text-[#38BDF8] font-bold">
              ESP
            </span>
          ) : null}
        </div>

        {/* Marcador de Assento com Ação Pendente */}
        {(seat.status === "critico" || seat.status === "vip") && !isAttended && (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span
              className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                seat.status === "critico" ? "bg-rose-400" : "bg-amber-400"
              )}
            />
            <span
              className={cn(
                "relative inline-flex rounded-full h-2.5 w-2.5",
                seat.status === "critico" ? "bg-rose-500" : "bg-amber-500"
              )}
            />
          </span>
        )}
      </button>
    );
  };

  const getEmergencyRow = () => {
    if (metadata?.codigo === "A320neo") return 11;
    if (metadata?.codigo === "E195-E2") return 14;
    return 1;
  };

  const emergencyRow = getEmergencyRow();
  const espacoAzulLimit = metadata?.codigo === "ATR 72-600" ? 2 : 4;

  return (
    <div className="flex flex-col items-center w-full">
      {/* Fuselagem Dinâmica da Aeronave */}
      <div
        className={cn(
          "relative w-full bg-white dark:bg-[#071324] border border-border rounded-3xl p-4 sm:p-6 shadow-sm overflow-hidden transition-all duration-200",
          is6Seats ? "max-w-xl" : "max-w-md sm:max-w-lg"
        )}
      >
        {/* Cabine de Comando (Cockpit) */}
        <div className="relative mx-auto -mt-2 mb-6 flex flex-col items-center">
          <div className="h-6 w-28 bg-gradient-to-b from-sky-500/20 to-transparent rounded-t-full border-t border-sky-400/30 flex items-center justify-center gap-1.5">
            <Plane className="h-3 w-3 text-sky-600 dark:text-sky-300" />
            <span className="text-[9px] font-mono tracking-widest text-sky-700 dark:text-sky-300 font-bold uppercase">
              COCKPIT
            </span>
          </div>
          <div className="w-full flex items-center justify-between text-[10px] text-muted-foreground px-4 pt-1 border-b border-border/60 pb-2">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Porta 1L / Galley Dianteira</span>
            </div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
              {metadata?.modelo || "Airbus A320neo"}
            </div>
          </div>
        </div>

        {/* Indicadores Dinâmicos de Coluna (A B C | Corredor | D E F) ou (A B | Corredor | C D) */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 mb-3 px-2">
          {/* Lado Esquerdo */}
          <div
            className={cn(
              "grid gap-1.5 sm:gap-2 text-center text-xs font-bold text-muted-foreground",
              is6Seats ? "grid-cols-3" : "grid-cols-2"
            )}
          >
            {leftCols.map((col, idx) => (
              <span key={col}>
                {col} {idx === 0 ? "(Janela)" : is6Seats && idx === 1 ? "(Meio)" : "(Corredor)"}
              </span>
            ))}
          </div>

          {/* Corredor Central */}
          <div className="w-8 sm:w-10 text-center font-mono text-[10px] text-muted-foreground uppercase font-bold">
            Fila
          </div>

          {/* Lado Direito */}
          <div
            className={cn(
              "grid gap-1.5 sm:gap-2 text-center text-xs font-bold text-muted-foreground",
              is6Seats ? "grid-cols-3" : "grid-cols-2"
            )}
          >
            {rightCols.map((col, idx) => (
              <span key={col}>
                {col} {idx === rightCols.length - 1 ? "(Janela)" : is6Seats && idx === 1 ? "(Meio)" : "(Corredor)"}
              </span>
            ))}
          </div>
        </div>

        {/* Separador Espaço Azul */}
        <div className="mb-3 px-2 py-1 rounded-md bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/60 flex items-center justify-between text-[11px] text-[#002855] dark:text-blue-200 font-semibold">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#0077C8] dark:text-[#38BDF8]" />
            <span>Espaço Azul Premium (Fileiras 1 a {espacoAzulLimit}) - Prioridade de Bordo</span>
          </div>
          <span className="text-[10px] opacity-75 uppercase tracking-wide">
            {is6Seats ? "Pitch 86cm (3x3)" : "Pitch 84cm (2x2)"}
          </span>
        </div>

        {/* Fileiras de Assentos com Altura Confortável */}
        <div className="space-y-2 max-h-[750px] overflow-y-auto pr-1">
          {rows.map((row) => {
            const isMainCabinStart = row === espacoAzulLimit + 1;
            const isEmergency = row === emergencyRow;

            return (
              <React.Fragment key={row}>
                {isMainCabinStart && (
                  <div className="my-3 px-2 py-1 rounded-md bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-[10px] font-semibold text-muted-foreground text-center uppercase tracking-wider">
                    Cabine Principal (Fileiras {isMainCabinStart ? espacoAzulLimit + 1 : row} a {numFileiras})
                  </div>
                )}

                {isEmergency && (
                  <div className="px-2 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                    <ShieldAlert className="h-3 w-3" />
                    <span>Saída de Emergência Sobre as Asas (Fileira {emergencyRow})</span>
                  </div>
                )}

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 px-1 sm:px-2">
                  {/* Assentos Lado Esquerdo */}
                  <div
                    className={cn(
                      "grid gap-1.5 sm:gap-2",
                      is6Seats ? "grid-cols-3" : "grid-cols-2"
                    )}
                  >
                    {leftCols.map((col) => renderSeat(row, col))}
                  </div>

                  {/* Corredor Central com Número da Fileira */}
                  <div className="w-8 sm:w-10 h-14 flex items-center justify-center">
                    <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-border flex items-center justify-center font-mono text-xs font-bold text-muted-foreground shadow-xs">
                      {row}
                    </div>
                  </div>

                  {/* Assentos Lado Direito */}
                  <div
                    className={cn(
                      "grid gap-1.5 sm:gap-2",
                      is6Seats ? "grid-cols-3" : "grid-cols-2"
                    )}
                  >
                    {rightCols.map((col) => renderSeat(row, col))}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Galley Traseira */}
        <div className="mt-6 pt-3 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground px-4">
          <span>Galley Traseira / Toaletes L e R</span>
          <span>Saída Traseira 2L / 2R</span>
        </div>
      </div>
    </div>
  );
}
