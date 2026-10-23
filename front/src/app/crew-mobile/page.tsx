"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
  Crown,
  Plane,
  RotateCcw,
  Wifi,
  Battery,
  ShieldCheck,
  ChevronLeft,
  Coffee,
  Luggage,
  HeartHandshake,
  Check,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================================================
// Tipos & Interface de Missões de Bordo da IA
// ============================================================================
export interface CrewMission {
  id: string;
  assento: string;
  clienteNome: string;
  persona: string;
  tier: "Diamante" | "Safira" | "Topázio";
  tipo: "atrito" | "vip";
  statusBadge: "Alerta de Atrito" | "Fidelização VIP";
  gatilho: string;
  instrucaoIA: string;
  acaoSugerida: string;
  concluida: boolean;
  concluidaEm?: string;
}

// ============================================================================
// Array com Instruções Realistas Simulando Output do LLM (RAG + Árbitro)
// ============================================================================
const INITIAL_MISSIONS: CrewMission[] = [
  {
    id: "mis_01",
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
    concluida: false,
  },
  {
    id: "mis_02",
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
    concluida: false,
  },
  {
    id: "mis_03",
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
    concluida: false,
  },
  {
    id: "mis_04",
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
    concluida: false,
  },
];

export default function CrewMobilePage() {
  const [missions, setMissions] = useState<CrewMission[]>(INITIAL_MISSIONS);
  const [filterMode, setFilterMode] = useState<"todas" | "pendentes" | "concluidas">("todas");

  // Alterna o status de conclusão da missão
  const toggleMission = (id: string) => {
    setMissions((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const novoStatus = !m.concluida;
          return {
            ...m,
            concluida: novoStatus,
            concluidaEm: novoStatus
              ? new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
              : undefined,
          };
        }
        return m;
      })
    );
  };

  // Contadores dinâmicos de estado
  const pendingCount = missions.filter((m) => !m.concluida).length;
  const completedCount = missions.filter((m) => m.concluida).length;
  const vipCount = 12; // 12 passageiros VIPs mapeados no manifesto de voo

  // Filtra as missões a serem exibidas no feed
  const filteredMissions = missions.filter((m) => {
    if (filterMode === "pendentes") return !m.concluida;
    if (filterMode === "concluidas") return m.concluida;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950/95 py-2 sm:py-6 px-2 sm:px-4 flex items-center justify-center font-sans antialiased">
      {/* Container Estritamente Mobile-First (Simulação de Tablet / Smartphone Vertical) */}
      <div className="w-full max-w-md bg-background text-foreground rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden flex flex-col h-[94vh] max-h-[880px] relative transition-all">
        
        {/* 1. Status Bar do Tablet (Estilo PWA Corporativo) */}
        <div className="bg-[#002855] text-white/80 px-4 pt-2.5 pb-1 flex items-center justify-between text-[11px] font-semibold tracking-wide shrink-0">
          <div className="flex items-center gap-1.5">
            <Plane className="h-3.5 w-3.5 text-[#38BDF8]" />
            <span className="font-mono">AD4231</span>
            <span className="text-white/40">•</span>
            <span className="text-[#38BDF8] text-[10px]">FL360</span>
          </div>
          <div className="flex items-center gap-2.5 text-[10px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <Wifi className="h-3 w-3" />
              <span>Conectado</span>
            </span>
            <span className="flex items-center gap-1">
              <span>96%</span>
              <Battery className="h-3 w-3 text-white" />
            </span>
          </div>
        </div>

        {/* 2. Header Corporativo Oficial da Azul */}
        <header className="bg-gradient-to-r from-[#002855] via-[#003B7A] to-[#0077C8] text-white p-4 shrink-0 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Link
                href="/crew-view"
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Voltar ao mapa de assentos"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <div>
                <h1 className="text-lg font-black tracking-tight leading-none flex items-center gap-1.5">
                  <span>Azul CrewApp</span>
                  <span className="text-[10px] bg-white/20 text-[#38BDF8] px-1.5 py-0.5 rounded font-mono font-semibold">
                    Tablet
                  </span>
                </h1>
                <p className="text-xs text-white/80 font-medium mt-0.5">
                  Voo AD4231 (VCP ➔ REC)
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="block text-[10px] uppercase font-bold text-[#38BDF8] tracking-wider">
                Aeronave
              </span>
              <span className="text-xs font-mono font-bold text-white">
                A320neo • PR-YRS
              </span>
            </div>
          </div>

          {/* 3. Cards Pequenos de Resumo no Topo */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 p-2">
              <span className="block text-[10px] text-white/70 font-semibold uppercase leading-tight">
                Pendentes
              </span>
              <span className="text-lg font-black text-[#38BDF8] leading-tight">
                {pendingCount}
              </span>
            </div>

            <div className="rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 p-2">
              <span className="block text-[10px] text-white/70 font-semibold uppercase leading-tight">
                VIPs a Bordo
              </span>
              <span className="text-lg font-black text-amber-300 leading-tight">
                {vipCount}
              </span>
            </div>

            <div className="rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 p-2">
              <span className="block text-[10px] text-white/70 font-semibold uppercase leading-tight">
                Concluídas
              </span>
              <span className="text-lg font-black text-emerald-300 leading-tight">
                {completedCount}
              </span>
            </div>
          </div>
        </header>

        {/* 4. Barra de Filtro Rápido */}
        <div className="bg-muted/40 border-b border-border px-3 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
            <Filter className="h-3 w-3" />
            <span>Missões de IA:</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilterMode("todas")}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-bold transition-all",
                filterMode === "todas"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              Todas ({missions.length})
            </button>
            <button
              onClick={() => setFilterMode("pendentes")}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-bold transition-all",
                filterMode === "pendentes"
                  ? "bg-azul-warning text-white shadow-xs"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              Pendentes ({pendingCount})
            </button>
            <button
              onClick={() => setFilterMode("concluidas")}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-bold transition-all",
                filterMode === "concluidas"
                  ? "bg-azul-success text-white shadow-xs"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              Feitas ({completedCount})
            </button>
          </div>
        </div>

        {/* 5. Feed de Missões (A Lista de Tarefas Mobile) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/20">
          {filteredMissions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 opacity-60" />
              <h4 className="font-bold text-foreground text-sm">Nenhuma missão neste filtro</h4>
              <p className="text-xs max-w-xs">
                Todas as tarefas selecionadas já foram processadas pela equipe de bordo.
              </p>
            </div>
          ) : (
            filteredMissions.map((missao) => {
              const isAtrito = missao.tipo === "atrito";
              return (
                <div
                  key={missao.id}
                  className={cn(
                    "rounded-2xl border transition-all duration-300 p-3.5 flex flex-col gap-2.5 shadow-xs",
                    missao.concluida
                      ? "bg-emerald-500/10 border-emerald-500/30 text-muted-foreground"
                      : isAtrito
                      ? "bg-card border-red-500/30 hover:border-red-500/50"
                      : "bg-card border-amber-500/30 hover:border-amber-500/50"
                  )}
                >
                  {/* Cabeçalho do Card: Assento, Nome e Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-azul-navy text-white font-mono font-bold text-xs shadow-xs">
                        {missao.assento}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3
                            className={cn(
                              "text-sm font-bold leading-tight",
                              missao.concluida ? "line-through text-muted-foreground" : "text-foreground"
                            )}
                          >
                            {missao.clienteNome}
                          </h3>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          {missao.persona} •{" "}
                          <span className="font-semibold text-azul-sky dark:text-[#38BDF8]">
                            {missao.tier}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Badge de Status */}
                    <div className="shrink-0">
                      {missao.concluida ? (
                        <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                          Concluído ✓
                        </Badge>
                      ) : isAtrito ? (
                        <Badge
                          variant="destructive"
                          className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-[10px] font-bold flex items-center gap-1"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          <span>{missao.statusBadge}</span>
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          <span>{missao.statusBadge}</span>
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Instrução da IA (LLM + RAG) */}
                  <div
                    className={cn(
                      "rounded-xl p-2.5 text-xs leading-relaxed border transition-colors",
                      missao.concluida
                        ? "bg-muted/40 border-border text-muted-foreground/80"
                        : "bg-[#EAF4FC] dark:bg-[#003B7A]/20 border-[#0077C8]/20 text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider text-azul-sky dark:text-[#38BDF8] mb-1">
                      <Sparkles className="h-3 w-3" />
                      <span>Instrução da IA (Copiloto de Bordo)</span>
                    </div>
                    <p className="italic text-[11px] text-[#243447] dark:text-slate-200">
                      &quot;{missao.instrucaoIA}&quot;
                    </p>
                  </div>

                  {/* Ação Operacional Recomendada & Horário */}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
                    <span className="font-semibold text-azul-navy dark:text-slate-300">
                      Ação: <strong>{missao.acaoSugerida}</strong>
                    </span>
                    {missao.concluida && missao.concluidaEm && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                        Concluído às {missao.concluidaEm}
                      </span>
                    )}
                  </div>

                  {/* Botão de Ação Primária */}
                  <div className="pt-1">
                    {missao.concluida ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="flex-1 h-9 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 text-xs font-bold gap-1.5 cursor-default"
                        >
                          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Missão Concluída a Bordo</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleMission(missao.id)}
                          className="h-9 px-2.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="Reabrir Missão"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => toggleMission(missao.id)}
                        className={cn(
                          "w-full h-9 text-xs font-bold gap-1.5 transition-all shadow-xs",
                          isAtrito
                            ? "bg-[#0077C8] hover:bg-[#005B99] text-white"
                            : "bg-azul-navy hover:bg-[#002855] text-white"
                        )}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Marcar como Concluído</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 6. Footer Corporativo de Bordo PWA */}
        <footer className="bg-card border-t border-border p-2.5 px-4 shrink-0 flex items-center justify-between text-xs text-muted-foreground">
          <Link
            href="/crew-view"
            className="flex items-center gap-1.5 text-azul-sky dark:text-[#38BDF8] font-bold hover:underline"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Voltar ao Mapa de Assentos</span>
          </Link>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Sync IA Ativo</span>
          </div>
        </footer>

      </div>
    </div>
  );
}

