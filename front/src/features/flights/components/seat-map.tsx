"use client";

import React, { useMemo } from "react";
import {
  AlertTriangle,
  Crown,
  CheckCircle2,
  User,
  Users,
  Sparkles,
  Plane,
} from "lucide-react";
import { AssentoVoo } from "@/types/api";
import { Mission } from "@/lib/flight-state";
import { SyncMission } from "@/lib/sync-storage";
import { cn } from "@/lib/utils";
import { getTierConfig } from "@/lib/tier-colors";

export type SeatFilter = "todos" | "atencao" | "critico" | "vip";
export type SeatMapRole = "gestor" | "crew";

export interface SeatMapProps {
  metadata: any;
  seats: AssentoVoo[];
  selectedSeat: AssentoVoo | null;
  onSelectSeat: (seat: AssentoVoo) => void;
  filter?: SeatFilter;
  attendedSeats?: Set<string>;
  role?: SeatMapRole;
  missions?: (SyncMission | Mission)[];
  onSelectMissionSeat?: (mission: SyncMission | Mission, seat: AssentoVoo) => void;
  layout?: string | string[];
  aircraftModel?: string;
  isDirectionalOnly?: boolean;
  missionSeatMap?: Map<string, SyncMission | Mission>;
}

export function SeatMap({
  metadata,
  seats,
  selectedSeat,
  onSelectSeat,
  filter = "todos",
  attendedSeats = new Set(),
  layout: layoutProp,
  aircraftModel,
}: SeatMapProps) {
  // Indexa assentos por código (ex: "1A", "34D") para acesso O(1)
  const seatMap = useMemo(() => {
    const map = new Map<string, AssentoVoo>();
    seats.forEach((s) => map.set(s.assento, s));
    return map;
  }, [seats]);

  // Determina o layout exato a partir da prop layout recebida do storage ou do metadata
  const effectiveLayout = useMemo(() => {
    if (typeof layoutProp === "string") {
      if (layoutProp === "2x2" || layoutProp.includes("2x2")) {
        return ["A", "B", "C", "D"];
      }
      if (layoutProp === "3x3" || layoutProp.includes("3x3")) {
        return ["A", "B", "C", "D", "E", "F"];
      }
    }
    if (Array.isArray(layoutProp) && layoutProp.length > 0) {
      return layoutProp;
    }
    if (metadata?.layout && Array.isArray(metadata.layout) && metadata.layout.length > 0) {
      return metadata.layout;
    }
    return ["A", "B", "C", "D"]; // Default dinâmico (2x2 para E195-E2 / ATR)
  }, [layoutProp, metadata?.layout]);

  const numFileiras = metadata?.fileiras || 29;
  const is6Seats = effectiveLayout.length === 6;

  // Divisão dinâmica das colunas: 3x3 para A320 ou 2x2 para E195 e ATR
  const leftCols = is6Seats ? ["A", "B", "C"] : ["A", "B"];
  const rightCols = is6Seats ? ["D", "E", "F"] : ["C", "D"];

  // Extrai o PNR ativo de grupo familiar a partir do assento selecionado
  const activePnr = useMemo(() => {
    if (!selectedSeat) return null;
    const pnr = (selectedSeat.dados_cliente?.pnr || (selectedSeat as any).pnr || "").trim();
    const isGroup = Boolean(selectedSeat.dados_cliente?.is_grupo_familiar ?? (selectedSeat as any).is_grupo_familiar);
    if (!pnr || pnr === "SOLO" || !isGroup) return null;
    return pnr;
  }, [selectedSeat]);

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
    if (filter === "vip") {
      const tier = seat.dados_cliente?.tier_fidelidade || "";
      return seat.status === "vip" || tier === "Diamante" || tier === "Safira";
    }
    return true;
  };

  const renderSeat = (row: number, col: string) => {
    const seatCode = `${row}${col}`;
    const seat = seatMap.get(seatCode);

    const isSelected = selectedSeat?.assento === seat?.assento;
    const hasSelection = Boolean(selectedSeat);

    if (!seat) {
      return (
        <div
          key={seatCode}
          className={cn(
            "h-14 w-11 sm:w-13 md:w-14 rounded-xl border border-dashed border-border/60 bg-muted/20 flex items-center justify-center text-[10px] text-muted-foreground transition-all duration-300 font-mono",
            hasSelection ? "opacity-30" : "opacity-40"
          )}
        >
          {seatCode}
        </div>
      );
    }

    const isAttended = attendedSeats.has(seat.assento);
    const highlighted = isSeatHighlighted(seat);
    const isEspacoAzul = metadata?.codigo === "ATR 72-600" ? row <= 2 : row <= 4;

    const seatPnr = (seat.dados_cliente?.pnr || (seat as any).pnr || "SOLO").trim();
    const isFamily = Boolean(seat.dados_cliente?.is_grupo_familiar ?? (seat as any).is_grupo_familiar);

    const isGroupMember = Boolean(
      activePnr &&
      activePnr === seatPnr &&
      seatPnr !== "SOLO" &&
      isFamily
    );

    const belongsToSelection = isSelected || isGroupMember;
    const isDimmed = hasSelection && !belongsToSelection;

    const tierConfig = getTierConfig(seat.dados_cliente?.tier_fidelidade);
    let statusStyles = "";
    let indicatorIcon = null;

    if (seat.status === "critico") {
      statusStyles = cn(
        "bg-rose-500/10 text-rose-950 dark:text-rose-100 border-rose-500/40 hover:bg-rose-500/20 shadow-xs",
        isSelected && "ring-2 ring-rose-500 ring-offset-2 ring-offset-background"
      );
      indicatorIcon = (
        <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400 shrink-0" />
      );
    } else {
      statusStyles = cn(
        tierConfig.seat,
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      );
      if (tierConfig.key === "diamante") {
        indicatorIcon = (
          <Crown className="h-3 w-3 text-white dark:text-indigo-200 shrink-0" />
        );
      } else if (tierConfig.key === "safira") {
        indicatorIcon = (
          <Crown className="h-3 w-3 text-blue-900 dark:text-blue-200 shrink-0" />
        );
      } else if (tierConfig.key === "topazio") {
        indicatorIcon = (
          <Sparkles className="h-2.5 w-2.5 text-cyan-900 dark:text-cyan-300 shrink-0" />
        );
      } else {
        indicatorIcon = (
          <User className="h-2.5 w-2.5 text-sky-900 dark:text-sky-300 shrink-0" />
        );
      }
    }

    return (
      <button
        key={seatCode}
        type="button"
        onClick={() => onSelectSeat(seat)}
        className={cn(
          "relative group flex flex-col items-center justify-between p-1 sm:p-1.5 h-14 w-11 sm:w-13 md:w-14 rounded-xl border text-left transition-all duration-200 cursor-pointer",
          statusStyles,
          isFamily && !isGroupMember && "ring-1 ring-primary/40",
          isGroupMember &&
            "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 z-10 bg-primary/10 shadow-sm",
          isSelected &&
            "scale-105 z-20 shadow-lg ring-2 ring-primary ring-offset-2 ring-offset-background",
          isDimmed && "opacity-60 hover:opacity-100",
          !highlighted && "opacity-25 hover:opacity-100 scale-95",
          highlighted && !isDimmed && "hover:scale-105 active:scale-95"
        )}
        title={`${seatCode}: ${seat.dados_cliente.nome} (${seat.status === "critico" ? "CRÍTICO" : tierConfig.name}) - ${seat.dados_cliente.tier_fidelidade}${isFamily ? ` [Grupo Familiar / PNR ${seatPnr}: ${seat.dados_cliente.tamanho_grupo || 2} pax]` : ""}`}
      >
        {/* Header do Assento: Código + Ícone de Grupo/Status */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-0.5">
            <span className="font-mono text-[11px] sm:text-xs font-black tracking-tight font-sans">
              {seatCode}
            </span>
            {isFamily && (
              <Users
                className={cn(
                  "h-2.5 w-2.5 shrink-0 transition-colors duration-200",
                  isGroupMember
                    ? "text-primary font-bold animate-pulse"
                    : tierConfig.key === "diamante"
                    ? "text-indigo-200 dark:text-indigo-300"
                    : "text-primary"
                )}
              />
            )}
          </div>
          {indicatorIcon}
        </div>

        {/* Nome Resumido */}
        <div className="w-full truncate text-[9px] sm:text-[10px] font-semibold leading-tight">
          {seat.dados_cliente.nome.split(" ")[0]}
        </div>

        {/* Rodapé do Assento: Tier ou Selo de Atendido */}
        <div className="flex items-center justify-between w-full text-[8px] opacity-80 font-bold uppercase">
          <span className="truncate">
            {seat.dados_cliente.tier_fidelidade.slice(0, 3)}
          </span>
          {isAttended ? (
            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400 ml-0.5" />
          ) : seat.status === "critico" ? (
            <span className="text-[8px] font-black text-rose-600 dark:text-rose-400 font-sans">
              {Math.round(seat.dados_cliente.risco_evasao * 100)}%
            </span>
          ) : isEspacoAzul ? (
            <span
              className={cn(
                "text-[7px] font-bold",
                tierConfig.key === "diamante"
                  ? "text-indigo-200 dark:text-indigo-300"
                  : "text-primary"
              )}
            >
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
                seat.status === "critico" ? "bg-rose-400" : "bg-primary"
              )}
            />
            <span
              className={cn(
                "relative inline-flex rounded-full h-2.5 w-2.5",
                seat.status === "critico" ? "bg-rose-500" : "bg-primary"
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
      {/* Fuselagem Dinâmica da Aeronave com Pulso Glassmorphism */}
      <div
        className={cn(
          "relative w-full bg-card/80 backdrop-blur-xl border border-border/80 rounded-3xl p-4 sm:p-6 shadow-xs overflow-hidden transition-all duration-200",
          is6Seats ? "max-w-xl" : "max-w-md sm:max-w-lg"
        )}
      >
        {/* Cabine de Comando (Cockpit) */}
        <div className="relative mx-auto -mt-2 mb-6 flex flex-col items-center">
          <div className="h-7 w-32 bg-gradient-to-b from-primary/20 to-transparent rounded-t-full border-t border-primary/30 flex items-center justify-center gap-1.5">
            <Plane className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-mono tracking-widest text-primary font-bold uppercase">
              COCKPIT
            </span>
          </div>
          <div className="w-full flex items-center justify-between text-[10px] text-muted-foreground px-4 pt-1 border-b border-border/80 pb-2">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span>Porta 1L / Galley Dianteira</span>
            </div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
              {aircraftModel || metadata?.modelo || (is6Seats ? "Airbus A320neo" : "Embraer E195-E2")}
            </div>
          </div>
        </div>

        {/* Indicadores Dinâmicos de Coluna */}
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

        {/* Fileiras de Assentos */}
        <div className="space-y-2">
          {rows.map((row) => {
            const isEspaco = row <= espacoAzulLimit;
            const isEmergency = row === emergencyRow || row === emergencyRow + 1;

            return (
              <React.Fragment key={row}>
                {/* Divisor de Saída de Emergência */}
                {row === emergencyRow && (
                  <div className="py-1 text-center my-1 border-y border-dashed border-rose-500/30 bg-rose-500/5 rounded-md">
                    <span className="text-[9px] font-mono font-bold tracking-wider text-rose-600 dark:text-rose-400 uppercase">
                      ⚠️ Saída de Emergência (Asas)
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
                  {/* Assentos Lado Esquerdo */}
                  <div
                    className={cn(
                      "grid gap-1.5 sm:gap-2",
                      is6Seats ? "grid-cols-3" : "grid-cols-2"
                    )}
                  >
                    {leftCols.map((col) => renderSeat(row, col))}
                  </div>

                  {/* Número da Fileira Central */}
                  <div className="w-8 sm:w-10 flex flex-col items-center justify-center">
                    <span className="font-mono text-xs font-bold text-muted-foreground">
                      {row}
                    </span>
                    {isEspaco && (
                      <span className="text-[7px] font-bold text-primary font-mono leading-none mt-0.5">
                        ESP
                      </span>
                    )}
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
        <div className="mt-6 pt-3 border-t border-border/80 flex items-center justify-between text-[10px] text-muted-foreground px-4">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            <span>Galley Traseira / Lavatórios</span>
          </div>
          <span className="font-mono text-[9px] uppercase">Fim da Cabine</span>
        </div>
      </div>
    </div>
  );
}
