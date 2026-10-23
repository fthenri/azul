"use client";

import React from "react";
import Link from "next/link";
import {
  Plane,
  AlertTriangle,
  Crown,
  Users,
  CheckCircle2,
  RefreshCw,
  Compass,
  Sparkles,
  ShieldAlert,
  Smartphone,
} from "lucide-react";
import { useCrewFlight, SeatFilter } from "../hooks/use-crew-flight";
import { CrewSeatMap } from "./crew-seat-map";
import { PassengerDrawer } from "./passenger-drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export function CrewView() {
  const {
    metadata,
    seats,
    isLoadingFlight,
    isErrorFlight,
    flightError,
    refetchFlight,
    selectedSeat,
    setSelectedSeat,
    clearSelection,
    simulationResult,
    isSimulating,
    simulationError,
    rerunInFlightAction,
    filter,
    setFilter,
    attendedSeats,
    markSeatAsAttended,
  } = useCrewFlight();

  // Contagens para os cards de resumo
  const totalAssentos = metadata?.total_assentos || seats.length;
  const totalCriticos = seats.filter((s) => s.status === "critico").length;
  const totalVips = seats.filter((s) => s.status === "vip").length;
  const totalAtendidos = attendedSeats.size;

  return (
    <div className="space-y-6">
      {/* Flight Control & Context Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between p-5 rounded-2xl bg-gradient-to-r from-[#002855] via-[#003B7A] to-[#0077C8] text-white shadow-md">
        <div className="flex items-start sm:items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center shrink-0">
            <Plane className="h-6 w-6 text-[#38BDF8]" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-[#38BDF8] font-bold">
                Voo AD 4231 • Ao Vivo
              </span>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px] font-semibold">
                Cruzeiro • FL360
              </Badge>
              {metadata && (
                <Badge className="bg-white/15 text-white border-white/25 text-[10px] font-mono">
                  {metadata.codigo}
                </Badge>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
              VCP (Campinas) ➔ REC (Recife)
            </h1>
            <p className="text-xs text-white/75 flex items-center gap-2 mt-1">
              <span>
                {metadata
                  ? `${metadata.modelo} (${metadata.fileiras} Fileiras • ${metadata.total_assentos} Passageiros • Layout ${metadata.layout.length === 6 ? "3x3" : "2x2"})`
                  : "Carregando configuração da aeronave..."}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[#38BDF8]">
                <Sparkles className="h-3 w-3" />
                Guest Service Tool Inspirada na Delta
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start lg:self-auto flex-wrap">
          <Link href="/crew-mobile">
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 bg-[#38BDF8]/20 hover:bg-[#38BDF8]/30 text-white text-xs gap-1.5 h-9 font-semibold"
            >
              <Smartphone className="h-3.5 w-3.5 text-[#38BDF8]" />
              <span>Modo Tablet Comissária</span>
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchFlight()}
            disabled={isLoadingFlight}
            className="border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs gap-1.5 h-9"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoadingFlight && "animate-spin")} />
            <span>Novo Sorteio / Atualizar</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards de Bordo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="p-4 bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total a Bordo
            </span>
            <Users className="h-4 w-4 text-[#0077C8] dark:text-[#38BDF8]" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {totalAssentos}
          </div>
          <span className="text-[10px] text-muted-foreground">
            Ocupação: 100% ({metadata?.modelo || "Frota Azul"})
          </span>
        </Card>

        <Card className="p-4 bg-card border border-border shadow-xs border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Passageiros Críticos
            </span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {totalCriticos}
          </div>
          <span className="text-[10px] text-muted-foreground">
            Risco de Evasão &gt; 60% (Requer Atenção)
          </span>
        </Card>

        <Card className="p-4 bg-card border border-border shadow-xs border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Passageiros VIP
            </span>
            <Crown className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {totalVips}
          </div>
          <span className="text-[10px] text-muted-foreground">
            Top 10% / Top 20% Receita (Pareto)
          </span>
        </Card>

        <Card className="p-4 bg-card border border-border shadow-xs border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Ações Concluídas
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {totalAtendidos}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {totalCriticos + totalVips > 0
              ? `${Math.round((totalAtendidos / (totalCriticos + totalVips)) * 100)}% das prioridades atendidas`
              : "Nenhuma prioridade"}
          </span>
        </Card>
      </div>

      {/* Barra de Filtro Rápido e Legenda de Cores */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border">
        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-muted-foreground mr-1">
            Filtro da Cabine:
          </span>
          <Button
            variant={filter === "todos" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("todos")}
            className={cn("h-7 text-xs px-2.5", filter === "todos" && "bg-[#0077C8]")}
          >
            Todos ({totalAssentos})
          </Button>
          <Button
            variant={filter === "atencao" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("atencao")}
            className={cn("h-7 text-xs px-2.5 gap-1", filter === "atencao" && "bg-[#002855] text-white")}
          >
            <Sparkles className="h-3 w-3 text-amber-400" />
            <span>Prioridades ({totalCriticos + totalVips})</span>
          </Button>
          <Button
            variant={filter === "critico" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("critico")}
            className={cn("h-7 text-xs px-2.5 gap-1", filter === "critico" && "bg-rose-600 text-white")}
          >
            <AlertTriangle className="h-3 w-3" />
            <span>Críticos ({totalCriticos})</span>
          </Button>
          <Button
            variant={filter === "vip" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("vip")}
            className={cn("h-7 text-xs px-2.5 gap-1", filter === "vip" && "bg-amber-500 text-white")}
          >
            <Crown className="h-3 w-3" />
            <span>VIPs ({totalVips})</span>
          </Button>
        </div>

        {/* Legenda Visual */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-rose-500" />
            <span>Crítico (Risco &gt; 60%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-amber-400" />
            <span>VIP (Top Pareto)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-slate-300 dark:bg-slate-700" />
            <span>Normal</span>
          </div>
        </div>
      </div>

      {/* Estado de Erro da API */}
      {isErrorFlight && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Erro ao carregar o mapa do voo</AlertTitle>
          <AlertDescription className="text-xs">
            {flightError?.message || "Não foi possível carregar o voo simulado."}
          </AlertDescription>
        </Alert>
      )}

      {/* Layout Principal: Mapa de Assentos (Esquerda) + Dossiê do Passageiro / LLM (Direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna do Mapa de Assentos da Aeronave */}
        <div className="lg:col-span-7 flex flex-col items-center">
          {isLoadingFlight ? (
            <div className="w-full max-w-xl h-[600px] rounded-3xl border border-dashed border-border flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 dark:bg-slate-900/30 animate-pulse">
              <Compass className="h-8 w-8 text-[#0077C8] animate-spin mb-3" />
              <p className="text-sm font-semibold text-foreground">
                Sorteando passageiros da Camada Gold e alocando na cabine...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Conectando ao endpoint GET /api/v1/voo-simulado
              </p>
            </div>
          ) : (
            <CrewSeatMap
              metadata={metadata}
              seats={seats}
              selectedSeat={selectedSeat}
              onSelectSeat={setSelectedSeat}
              filter={filter}
              attendedSeats={attendedSeats}
            />
          )}
        </div>

        {/* Coluna do Painel Lateral / Dossiê & Instrução do LLM */}
        <div className="lg:col-span-5 lg:sticky lg:top-4 min-h-[500px]">
          <PassengerDrawer
            seat={selectedSeat}
            simulationResult={simulationResult}
            isSimulating={isSimulating}
            simulationError={simulationError}
            onClose={clearSelection}
            onRerun={rerunInFlightAction}
            onMarkAttended={markSeatAsAttended}
            isAttended={selectedSeat ? attendedSeats.has(selectedSeat.assento) : false}
          />
        </div>
      </div>
    </div>
  );
}

