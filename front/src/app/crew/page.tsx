"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
  Crown,
  RotateCcw,
  ShieldCheck,
  Search,
  Check,
  LogOut,
  ListTodo,
  LayoutGrid,
  X,
  Radio,
  Plane,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getMissions,
  updateMissionStatus,
  SyncMission,
  getActiveFlight,
  ActiveFlight,
} from "@/lib/sync-storage";
import { useCrewFlight } from "@/features/crew-view/hooks/use-crew-flight";
import { CrewSeatMap } from "@/features/crew-view/components/crew-seat-map";
import { AssentoVoo } from "@/types/api";
import { useAuth } from "@/lib/auth-context";

/**
 * ============================================================================
 * Portal da Tripulação de Bordo (Azul CrewApp - Painel de Serviço de Bordo)
 * Arquitetura de Comunicação Cross-Tab em Tempo Real:
 * - Receptor de missões despachadas pelo Gestor (via localStorage e eventos nativos)
 * - Zero dados estáticos mockados (carregamento reativo puro de getMissions())
 * - Empty state mandatório caso não haja missões despachadas ou o voo não tenha sido despachado
 * ============================================================================
 */
export default function CrewPage() {
  const { user, logout } = useAuth();
  // Estado do voo ativo despachado pela Torre de Controle (Gestor)
  const [activeFlight, setActiveFlight] = useState<ActiveFlight | null>(null);

  // 1. Estado Reativo de Missões (Inicializado vazio, sem dados hardcoded)
  const [missions, setMissions] = useState<SyncMission[]>([]);

  // 2. Consulta dos Metadados da Aeronave e Geometria da Cabine
  const { metadata, seats, isLoadingFlight } = useCrewFlight();

  // 3. Estado de Navegação da Interface: Tabs ("Lista de Tarefas" | "Mapa da Cabine")
  const [activeTab, setActiveTab] = useState<"tarefas" | "mapa">("tarefas");

  // 4. Filtros e Pesquisa na Lista de Tarefas
  const [filterMode, setFilterMode] = useState<"todas" | "pendentes" | "concluidas">("todas");
  const [searchTerm, setSearchTerm] = useState("");

  // 5. Modal de Execução de Missão (Disparado via Mapa Direcional ou Detalhes)
  const [selectedMissionModal, setSelectedMissionModal] = useState<SyncMission | null>(null);

  // ==========================================================================
  // Sincronização Cross-Tab e Same-Tab (Receptor)
  // ==========================================================================
  useEffect(() => {
    // 1. Carrega o status do voo e missões ativas na montagem
    setActiveFlight(getActiveFlight());
    setMissions(getMissions());

    // 2. Handler nativo para eventos de sincronização
    const handleSync = () => {
      setActiveFlight(getActiveFlight());
      setMissions(getMissions());
    };

    // 'storage': Disparado nativamente pelo navegador em abas paralelas
    window.addEventListener("storage", handleSync);
    // 'local-storage-update': Disparado pelo sync-storage na mesma aba
    window.addEventListener("local-storage-update", handleSync);

    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("local-storage-update", handleSync);
    };
  }, []);

  const isFlightDispatched = Boolean(activeFlight && activeFlight.despachado);

  // Helper para verificar status de conclusão
  const isMissionDone = (m: SyncMission) => m.status === "concluida";

  // Métricas reativas derivadas da lista real de missões
  const pendingCount = useMemo(
    () => missions.filter((m) => m.status === "pendente").length,
    [missions]
  );
  const completedCount = useMemo(
    () => missions.filter((m) => m.status === "concluida").length,
    [missions]
  );
  const vipCount = useMemo(
    () => missions.filter((m) => m.tipo === "vip").length,
    [missions]
  );

  // Mapa de acesso rápido O(1) de assento -> Missão para o Mapa Direcional da Cabine
  const missionSeatMap = useMemo(() => {
    const map = new Map<string, SyncMission>();
    missions.forEach((m) => {
      map.set(m.assento, m);
    });
    return map;
  }, [missions]);

  // Conjunto de assentos com missões concluídas
  const attendedSeatsSet = useMemo(() => {
    const set = new Set<string>();
    missions.forEach((m) => {
      if (isMissionDone(m)) set.add(m.assento);
    });
    return set;
  }, [missions]);

  // Filtra as missões a serem exibidas no grid responsivo
  const filteredMissions = useMemo(() => {
    return missions.filter((m) => {
      // Filtro de status
      if (filterMode === "pendentes" && isMissionDone(m)) return false;
      if (filterMode === "concluidas" && !isMissionDone(m)) return false;

      // Filtro de busca textual (assento, passageiro ou persona)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesSeat = m.assento.toLowerCase().includes(query);
        const matchesName = (m.passageiro || "").toLowerCase().includes(query);
        const matchesPersona = (m.persona || "").toLowerCase().includes(query);
        if (!matchesSeat && !matchesName && !matchesPersona) return false;
      }

      return true;
    });
  }, [missions, filterMode, searchTerm]);

  // ==========================================================================
  // Ações da Comissária: Transições de Status em Tempo Real
  // ==========================================================================
  const handleMarkComplete = (id: string) => {
    updateMissionStatus(id, "concluida");
    if (selectedMissionModal && (selectedMissionModal.id === id || selectedMissionModal.assento === id)) {
      setSelectedMissionModal({
        ...selectedMissionModal,
        status: "concluida",
        concluidaEm: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      });
    }
  };

  const handleMarkReopen = (id: string) => {
    updateMissionStatus(id, "pendente");
    if (selectedMissionModal && (selectedMissionModal.id === id || selectedMissionModal.assento === id)) {
      setSelectedMissionModal({
        ...selectedMissionModal,
        status: "pendente",
        concluidaEm: undefined,
      });
    }
  };

  // Handler para clique em assento com missão no Mapa Direcional (Compatível com SyncMission e Mission)
  const handleSelectMissionSeat = (mission: SyncMission | any, _seat: AssentoVoo) => {
    const syncMission: SyncMission = "instrucao" in mission
      ? (mission as SyncMission)
      : {
          id: mission.id,
          assento: mission.assento,
          passageiro: mission.passageiro,
          instrucao: mission.instrucao_ia || mission.instrucaoIA || "",
          status: mission.status,
          tipo: mission.tipo,
          persona: mission.persona,
          tier: mission.tier,
          statusBadge: mission.statusBadge,
          gatilho: mission.gatilho,
          acao: mission.acaoSugerida,
          criadaEm: mission.criadaEm,
          concluidaEm: mission.concluidaEm,
        };
    setSelectedMissionModal(syncMission);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased">
      {/* 1. Header Corporativo Limpo da Tripulação (Logo da Azul, Identificação do Voo e Trocar Perfil) */}
      <header className="bg-slate-950 border-b border-slate-800 text-white px-4 sm:px-8 py-3.5 shadow-md shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Lado Esquerdo: Identidade Visual e Identificação do Voo */}
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
            <div className="h-6 w-px bg-slate-800" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Azul CrewApp
              </h1>
              <span className="hidden sm:inline text-slate-500">•</span>
              <p className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                <span className="font-semibold text-white">Voo {activeFlight?.id || "AD4231"}</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">{activeFlight?.rota || "VCP ➔ REC"}</span>
                {isFlightDispatched ? (
                  <>
                    <span className="text-slate-500">•</span>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px] py-0 px-1.5 font-semibold">
                      Despachado
                    </Badge>
                  </>
                ) : (
                  <>
                    <span className="text-slate-500">•</span>
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30 text-[10px] py-0 px-1.5 font-semibold">
                      Aguardando Despacho
                    </Badge>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Lado Direito: Botão para Trocar de Perfil */}
          <div className="flex items-center">


            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="border-slate-700 bg-slate-900 hover:bg-red-950/40 text-slate-200 hover:text-red-300 text-xs gap-1.5 h-8 cursor-pointer"
              title="Encerrar sessão"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* 2. Conteúdo Principal Responsivo */}
      <main className="container mx-auto p-4 sm:p-6 w-full max-w-7xl flex-1 space-y-6 flex flex-col justify-center">
        {/* Empty State Obrigatório: Exibido se o voo ainda não foi despachado pela Torre de Controle */}
        {!isFlightDispatched ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] p-6 text-center animate-in fade-in duration-300">
            <div className="max-w-md w-full p-8 rounded-3xl border-2 border-dashed border-border bg-card/60 backdrop-blur-xs space-y-4 shadow-sm text-center">
              <div className="h-16 w-16 rounded-2xl bg-[#002855]/10 dark:bg-[#38BDF8]/10 text-[#0077C8] dark:text-[#38BDF8] mx-auto flex items-center justify-center">
                <Plane className="h-8 w-8 text-[#0077C8] dark:text-[#38BDF8] animate-pulse" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg sm:text-xl font-bold text-foreground">
                  Aguardando simulação e despacho do voo pela Torre de Controle.
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  A cabine e o plano de voo ainda não foram despachados pelo Gestor. Assim que a operação for despachada em outra aba, esta tela atualizará automaticamente.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground font-mono">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                <span>Sincronização em tempo real ativa</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Banner Operacional do Copiloto de Cabine */}
        <div className="rounded-2xl bg-gradient-to-r from-[#002855] via-[#003B7A] to-[#0077C8] text-white p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#38BDF8]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#38BDF8]">
                Copiloto de Cabine em Tempo Real
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black">
              Missões Táticas da Tripulação
            </h2>
            <p className="text-xs sm:text-sm text-white/80 max-w-2xl leading-relaxed">
              As missões prescritivas geradas pela IA e despachadas pelo Gestor na Central de Decisões chegam instantaneamente a esta tela. Realize a abordagem de bordo e confirme a conclusão.
            </p>
          </div>
        </div>

        {/* 3. Cards de Estatísticas em Linha Horizontal no Desktop */}
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
                  de {missions.length} despachadas
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card VIPs a Bordo */}
          <Card className="border border-border bg-card shadow-xs">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Missões VIP
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
                  Fidelização VIP
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
                  {missions.length > 0 ? Math.round((completedCount / missions.length) * 100) : 0}% de conclusão
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 4. Seletor de Visão Superior (Tabs: 'Lista de Tarefas' e 'Mapa da Cabine') */}
        <div className="flex items-center justify-between border-b border-border pb-3 pt-1">
          <div className="flex items-center gap-2 p-1 bg-muted/60 border border-border rounded-xl">
            <button
              onClick={() => setActiveTab("tarefas")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                activeTab === "tarefas"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ListTodo className="h-4 w-4" />
              <span>Lista de Tarefas</span>
              <span
                className={cn(
                  "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono",
                  activeTab === "tarefas"
                    ? "bg-white/20 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {missions.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("mapa")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                activeTab === "mapa"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              <span>Mapa da Cabine</span>
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-rose-500 text-white animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>

          <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-2 font-medium">
            <span>Aeronave:</span>
            <Badge variant="outline" className="font-mono text-xs">
              {metadata?.modelo || "Airbus A320neo"}
            </Badge>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* ABA 1: LISTA DE TAREFAS                                              */}
        {/* ==================================================================== */}
        {activeTab === "tarefas" && (
          <div className="space-y-6">
            {/* EMPTY STATE OBRIGATÓRIO (Se array de missões estiver vazio, NENHUM card deve aparecer) */}
            {missions.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-border bg-card/60 p-12 text-center text-muted-foreground space-y-3 animate-in fade-in duration-200">
                <div className="h-14 w-14 rounded-2xl bg-[#002855]/10 dark:bg-[#38BDF8]/10 text-[#0077C8] dark:text-[#38BDF8] mx-auto flex items-center justify-center">
                  <Radio className="h-7 w-7 animate-pulse" />
                </div>
                <h3 className="font-bold text-foreground text-base sm:text-lg">
                  Nenhuma missão despachada para este voo. Aguardando torre de controle/gestor.
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  As missões despachadas pelo Gestor através da Central de Decisões aparecerão aqui em tempo real via conexão cross-tab do navegador.
                </p>
              </div>
            ) : (
              <>
                {/* Barra de Filtros e Busca quando há missões */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border w-fit">
                    <button
                      onClick={() => setFilterMode("todas")}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
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
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
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
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        filterMode === "concluidas"
                          ? "bg-azul-success text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Concluídas ({completedCount})
                    </button>
                  </div>

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

                {/* Grid Responsivo de Cards de Missões */}
                {filteredMissions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground text-xs">
                    Nenhuma missão corresponde aos filtros de busca atuais.
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
                                    {missao.passageiro}
                                  </h3>
                                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                                    {missao.persona || "Passageiro Especial"} •{" "}
                                    <span className="font-semibold text-azul-sky dark:text-[#38BDF8]">
                                      {missao.tier || "Diamante"}
                                    </span>
                                  </p>
                                </div>
                              </div>

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
                                    <span>{missao.statusBadge || "Alerta de Atrito"}</span>
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs font-bold flex items-center gap-1">
                                    <Crown className="h-3 w-3" />
                                    <span>{missao.statusBadge || "Fidelização VIP"}</span>
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="space-y-3.5 pt-0 flex-1 flex flex-col justify-between">
                            {/* Gatilho Operacional */}
                            {missao.gatilho && (
                              <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg border border-border">
                                <span className="font-bold text-foreground">Gatilho:</span> {missao.gatilho}
                              </div>
                            )}

                            {/* Instrução da IA */}
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
                                &quot;{missao.instrucao}&quot;
                              </p>
                            </div>

                            {/* Ação Recomendada & Conclusão */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                              <span className="font-semibold text-azul-navy dark:text-slate-200">
                                Ação: <strong>{missao.acao || "Abordagem com Cortesia"}</strong>
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
                                    onClick={() => handleMarkReopen(missao.id)}
                                    className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                                    title="Reabrir Missão"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleMarkComplete(missao.id)}
                                  className={cn(
                                    "w-full h-9 text-xs font-bold gap-1.5 transition-all shadow-xs cursor-pointer",
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
              </>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* ABA 2: MAPA DA CABINE                                                */}
        {/* ==================================================================== */}
        {activeTab === "mapa" && (
          <div className="space-y-6">
            {missions.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-border bg-card/60 p-10 text-center text-muted-foreground space-y-2">
                <Radio className="h-8 w-8 text-[#0077C8] dark:text-[#38BDF8] mx-auto animate-pulse" />
                <h3 className="font-bold text-foreground text-sm">
                  Nenhuma missão despachada para este voo. Aguardando torre de controle/gestor.
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Assim que houver despachos do simulador, os assentos correspondentes serão iluminados no mapa.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sky-950 dark:text-sky-200">
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <span className="font-bold text-sm block">Mapa Direcional Restrito</span>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      Toque em qualquer assento destacado para ver a instrução da IA e marcar a execução.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-[11px] font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-rose-500 animate-pulse" />
                    <span>Atrito ({missions.filter((m) => m.tipo === "atrito" && !isMissionDone(m)).length})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-amber-400 animate-pulse" />
                    <span>VIP ({missions.filter((m) => m.tipo === "vip" && !isMissionDone(m)).length})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span>Concluído ({completedCount})</span>
                  </div>
                </div>
              </div>
            )}

            {/* Mapa de Assentos Físico com RBAC Tripulação (role="crew" e missions ativas) */}
            {isLoadingFlight ? (
              <div className="h-96 rounded-3xl border border-border bg-card flex flex-col items-center justify-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-xs text-muted-foreground font-medium">
                  Carregando mapa físico da aeronave...
                </span>
              </div>
            ) : (
              <div className="w-full flex justify-center">
                <CrewSeatMap
                  role="crew"
                  missions={missions}
                  metadata={metadata}
                  seats={seats}
                  selectedSeat={null}
                  onSelectSeat={() => {}}
                  filter="todos"
                  attendedSeats={attendedSeatsSet}
                  onSelectMissionSeat={handleSelectMissionSeat}
                />
              </div>
            )}
          </div>
        )}
          </>
        )}
      </main>

      {/* ==================================================================== */}
      {/* MODAL DE EXECUÇÃO DE MISSÃO (Disparado pelo Mapa da Cabine)           */}
      {/* ==================================================================== */}
      {selectedMissionModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedMissionModal(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-azul-navy text-white flex items-center justify-center font-mono font-black text-base shadow-sm">
                  {selectedMissionModal.assento}
                </div>
                <div>
                  <h3 className="text-base font-black leading-tight text-foreground">
                    {selectedMissionModal.passageiro}
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    {selectedMissionModal.persona || "Passageiro Especial"} •{" "}
                    <span className="font-semibold text-azul-sky dark:text-[#38BDF8]">
                      {selectedMissionModal.tier || "Diamante"}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMissionModal(null)}
                className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Tipo de Ação:</span>
              {isMissionDone(selectedMissionModal) ? (
                <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold">
                  Missão Concluída ✓
                </Badge>
              ) : selectedMissionModal.tipo === "atrito" ? (
                <Badge
                  variant="destructive"
                  className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-xs font-bold flex items-center gap-1"
                >
                  <AlertTriangle className="h-3 w-3" />
                  <span>{selectedMissionModal.statusBadge || "Alerta de Atrito"}</span>
                </Badge>
              ) : (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs font-bold flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  <span>{selectedMissionModal.statusBadge || "Fidelização VIP"}</span>
                </Badge>
              )}
            </div>

            {selectedMissionModal.gatilho && (
              <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl border border-border space-y-1">
                <span className="font-bold text-foreground block">Gatilho Operacional:</span>
                <p>{selectedMissionModal.gatilho}</p>
              </div>
            )}

            <div className="rounded-xl p-4 text-xs leading-relaxed border bg-[#EAF4FC] dark:bg-[#003B7A]/25 border-[#0077C8]/30 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-azul-sky dark:text-[#38BDF8]">
                <Sparkles className="h-4 w-4" />
                <span>Instrução da IA (Copiloto de Bordo)</span>
              </div>
              <p className="italic text-sm text-[#243447] dark:text-slate-100">
                &quot;{selectedMissionModal.instrucao}&quot;
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>
                Ação Sugerida:{" "}
                <strong className="text-foreground">
                  {selectedMissionModal.acao || "Abordagem com Cortesia"}
                </strong>
              </span>
              {selectedMissionModal.concluidaEm && (
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                  Concluído às {selectedMissionModal.concluidaEm}
                </span>
              )}
            </div>

            <div className="pt-3 border-t border-border flex items-center gap-2.5">
              {isMissionDone(selectedMissionModal) ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="flex-1 h-10 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 text-xs font-bold gap-1.5 cursor-default"
                  >
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Concluída a Bordo</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMarkReopen(selectedMissionModal.id)}
                    className="h-10 text-xs text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reabrir</span>
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleMarkComplete(selectedMissionModal.id)}
                  className="flex-1 h-10 text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Marcar Missão como Concluída</span>
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedMissionModal(null)}
                className="h-10 text-xs cursor-pointer"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Footer Corporativo */}
      <footer className="border-t border-border mt-12 py-4 px-6 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Azul Linhas Aéreas Brasileiras • Azul CrewApp (Painel de Serviço de Bordo)</span>
          <div className="flex items-center gap-2 text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Sincronização Nativa em Tempo Real Ativa</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
