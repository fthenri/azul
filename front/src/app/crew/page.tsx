"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
  Crown,
  Plane,
  RotateCcw,
  Wifi,
  ShieldCheck,
  Search,
  Check,
  Filter,
  LogOut,
  Coffee,
  Luggage,
  Users,
  Compass,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useFlightMissions, FlightMission } from "@/lib/missions-storage";

export default function CrewPage() {
  // Consome reativamente as missões sincronizadas com o Gestor via localStorage ('flight_missions')
  const {
    missions,
    pendingCount,
    completedCount,
    completeMission,
    reopenMission,
  } = useFlightMissions();

  const [filterMode, setFilterMode] = useState<"todas" | "pendentes" | "concluidas">("todas");
  const [searchTerm, setSearchTerm] = useState("");
  const vipCount = 12; // 12 passageiros VIPs mapeados no voo

  // Helper para verificar status de conclusão
  const isMissionDone = (m: FlightMission) => m.status === "concluida" || m.concluida;

  // Filtra as missões a serem exibidas no grid responsivo
  const filteredMissions = useMemo(() => {
    return missions.filter((m) => {
      // Filtro de status
      if (filterMode === "pendentes" && isMissionDone(m)) return false;
      if (filterMode === "concluidas" && !isMissionDone(m)) return false;

      // Filtro de busca textual (assento ou nome)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesSeat = m.assento.toLowerCase().includes(query);
        const matchesName = m.clienteNome.toLowerCase().includes(query);
        const matchesPersona = m.persona.toLowerCase().includes(query);
        if (!matchesSeat && !matchesName && !matchesPersona) return false;
      }

      return true;
    });
  }, [missions, filterMode, searchTerm]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased">
      {/* 1. Header Superior Escuro Corporativo (Sem Sidebar do Gestor) */}
      <header className="bg-slate-950 border-b border-slate-800 text-white px-4 sm:px-8 py-3.5 shadow-md shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Lado Esquerdo: Identidade Visual e Informações do Voo */}
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-24 sm:w-28 flex items-center shrink-0">
              <Image
                src="/logo.png"
                alt="Azul Linhas Aéreas"
                width={112}
                height={36}
                className="object-contain filter brightness-110"
                priority
              />
            </div>
            <div className="h-7 w-px bg-slate-800 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
                  Guest Service Tool
                </h1>
                <Badge className="bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8]/30 text-[10px] font-mono font-bold">
                  Tripulação
                </Badge>
              </div>
              <p className="text-xs text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                <span className="font-semibold text-slate-200">Voo AD4231</span>
                <span>•</span>
                <span>VCP ➔ REC</span>
                <span>•</span>
                <span className="text-[#38BDF8] text-[11px]">A320neo (FL360)</span>
              </p>
            </div>
          </div>

          {/* Lado Direito: Status de Conexão e Botão para Trocar de Perfil */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <Wifi className="h-3.5 w-3.5 animate-pulse" />
              <span className="hidden sm:inline">Wi-Fi de Bordo Conectado</span>
              <span className="sm:hidden">Online</span>
            </div>

            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white text-xs gap-1.5 h-8"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Trocar Perfil</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Conteúdo Principal Responsivo (container mx-auto p-4 w-full) */}
      <main className="container mx-auto p-4 sm:p-6 w-full max-w-7xl flex-1 space-y-6">
        {/* Banner Tático Inspirado no Delta Guest Service Tool */}
        <div className="rounded-2xl bg-gradient-to-r from-[#002855] via-[#003B7A] to-[#0077C8] text-white p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#38BDF8]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#38BDF8]">
                Copiloto de Cabine em Tempo Real
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black">
              Missões Táticas da Comissária
            </h2>
            <p className="text-xs sm:text-sm text-white/80 max-w-2xl leading-relaxed">
              A IA analisa os dados de atrito recente, conexões e fidelidade dos passageiros a bordo para gerar missões de atendimento direto. Realize a ação e marque como concluído.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge className="bg-white/15 text-white border-white/25 text-xs py-1 px-3">
              <Compass className="h-3.5 w-3.5 mr-1 text-[#38BDF8]" />
              Tempo Restante de Voo: 01h 45m
            </Badge>
          </div>
        </div>

        {/* 3. Cards de Estatísticas em Linha Horizontal no Desktop (grid-cols-1 sm:grid-cols-3) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card Pendentes */}
          <Card className="border border-border bg-card shadow-xs">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Missões Pendentes
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-azul-sky/15 text-azul-sky flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-foreground">
                  {pendingCount}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  de {missions.length} no voo
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card VIPs a Bordo */}
          <Card className="border border-border bg-card shadow-xs">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                VIPs Mapeados a Bordo
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Crown className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
                  {vipCount}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  Diamante & Safira
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card Concluídas */}
          <Card className="border border-border bg-card shadow-xs">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Ações Concluídas
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {completedCount}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {Math.round((completedCount / missions.length) * 100)}% de conclusão
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 4. Barra de Filtros e Busca */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          {/* Filtros em Abas Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border w-fit">
            <button
              onClick={() => setFilterMode("todas")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                filterMode === "todas"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Todas ({missions.length})
            </button>
            <button
              onClick={() => setFilterMode("pendentes")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                filterMode === "pendentes"
                  ? "bg-azul-warning text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Pendentes ({pendingCount})
            </button>
            <button
              onClick={() => setFilterMode("concluidas")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                filterMode === "concluidas"
                  ? "bg-azul-success text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Concluídas ({completedCount})
            </button>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar assento ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full rounded-xl border border-input pl-9 pr-3 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* 5. Feed de Missões: Grid Responsivo (grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4) */}
        {filteredMissions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground space-y-2">
            <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 opacity-60 mb-2" />
            <h3 className="font-bold text-foreground text-sm">Nenhuma missão localizada</h3>
            <p className="text-xs max-w-sm mx-auto">
              Não há tarefas pendentes correspondentes ao filtro ou busca selecionada no momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMissions.map((missao) => {
              const isAtrito = missao.tipo === "atrito";
              const isDone = isMissionDone(missao);
              return (
                <Card
                  key={missao.id}
                  className={cn(
                    "flex flex-col justify-between transition-all duration-300 shadow-xs border",
                    isDone
                      ? "bg-emerald-500/10 border-emerald-500/30 text-muted-foreground"
                      : isAtrito
                      ? "bg-card border-red-500/30 hover:border-red-500/50 hover:shadow-md"
                      : "bg-card border-amber-500/30 hover:border-amber-500/50 hover:shadow-md"
                  )}
                >
                  <CardHeader className="pb-3">
                    {/* Top Row: Assento, Nome, Persona e Badge de Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-azul-navy text-white font-mono font-bold text-xs shadow-xs">
                          {missao.assento}
                        </span>
                        <div>
                          <h3
                            className={cn(
                              "text-sm font-bold leading-tight",
                              isDone ? "line-through text-muted-foreground" : "text-foreground"
                            )}
                          >
                            {missao.clienteNome}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                            {missao.persona} •{" "}
                            <span className="font-semibold text-azul-sky dark:text-[#38BDF8]">
                              {missao.tier}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Badge de Status */}
                      <div className="shrink-0">
                        {isDone ? (
                          <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold">
                            Concluído ✓
                          </Badge>
                        ) : isAtrito ? (
                          <Badge
                            variant="destructive"
                            className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-xs font-bold flex items-center gap-1"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            <span>{missao.statusBadge}</span>
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs font-bold flex items-center gap-1">
                            <Crown className="h-3 w-3" />
                            <span>{missao.statusBadge}</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3.5 pt-0 flex-1 flex flex-col justify-between">
                    {/* Gatilho Operacional */}
                    <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg border border-border">
                      <span className="font-bold text-foreground">Gatilho:</span> {missao.gatilho}
                    </div>

                    {/* Instrução da IA (LLM + RAG) */}
                    <div
                      className={cn(
                        "rounded-xl p-3 text-xs leading-relaxed border transition-colors flex-1",
                        isDone
                          ? "bg-muted/40 border-border text-muted-foreground/80"
                          : "bg-[#EAF4FC] dark:bg-[#003B7A]/20 border-[#0077C8]/25 text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider text-azul-sky dark:text-[#38BDF8] mb-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Instrução da IA (Copiloto de Bordo)</span>
                      </div>
                      <p className="italic text-xs text-[#243447] dark:text-slate-200">
                        &quot;{missao.instrucaoIA}&quot;
                      </p>
                    </div>

                    {/* Ação Recomendada & Horário de Conclusão */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <span className="font-semibold text-azul-navy dark:text-slate-200">
                        Ação: <strong>{missao.acaoSugerida}</strong>
                      </span>
                      {isDone && missao.concluidaEm && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-semibold">
                          Concluído às {missao.concluidaEm}
                        </span>
                      )}
                    </div>

                    {/* Botão de Ação Primária */}
                    <div className="pt-2">
                      {isDone ? (
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
                            onClick={() => reopenMission(missao.id)}
                            className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="Reabrir Missão"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => completeMission(missao.id)}
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* 6. Footer Corporativo */}
      <footer className="border-t border-border mt-12 py-4 px-6 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Azul Linhas Aéreas Brasileiras • Guest Service Tool (Tablet & Desktop Operacional)</span>
          <div className="flex items-center gap-2 text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Sincronização com Copiloto IA Ativa</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

