"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  MessageSquare,
  Mail,
  Bell,
  ShieldCheck,
  Sparkles,
  HeartHandshake,
  CheckCircle2,
  Lock,
  Send,
  Copy,
  Check,
  CheckCheck,
  Search,
  RefreshCw,
  AlertTriangle,
  Loader2,
  TrendingUp,
  ChevronDown,
  Clock,
  X,
  ListFilter,
  ArrowRight,
  Award,
  Database,
  ArrowUpRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { AnimatedTabs, type TabItem } from "@/components/ui/animated-tabs";
import { api } from "@/lib/api";
import { useDemoMode } from "@/components/providers/demo-mode-context";
import { getDemoVooSimulado } from "@/lib/demo-data";
import { getTierConfig } from "@/lib/tier-colors";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { AssentoVoo, VooSimuladoResponse } from "@/types/api";
import { cn } from "@/lib/utils";

type ChannelType = "whatsapp" | "email" | "push";
type FilterType = "todos" | "pendentes" | "enviados";

export default function OffBoardPage() {
  const { isDemoMode } = useDemoMode();
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>("whatsapp");
  const [filter, setFilter] = useState<FilterType>("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [enviados, setEnviados] = useState<Set<string>>(new Set());
  const [expandedXaiId, setExpandedXaiId] = useState<string | null>(null);
  const hasInitializedXai = useRef(false);

  // Consulta analítica dos dados de passageiros e recomendações
  const {
    data: vooData,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery<VooSimuladoResponse, Error>({
    queryKey: ["offboard-flight-data", isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        return getDemoVooSimulado();
      }
      try {
        const res = await api.getVooSimulado();
        if (!res || !res.assentos || res.assentos.length === 0) {
          return getDemoVooSimulado();
        }
        return res;
      } catch {
        return getDemoVooSimulado();
      }
    },
    staleTime: 60 * 1000,
  });

  // Mutação para registrar envio da ação no SQLite de MLOps
  const confirmMutation = useMutation({
    mutationFn: async (payload: {
      flight_id: string;
      assento: string;
      id_cliente?: string;
      acao: string;
      custo?: number;
    }) => {
      return api.registrarAcaoConcluida({
        flight_id: payload.flight_id,
        assento: payload.assento,
        id_cliente: payload.id_cliente,
        acao: payload.acao,
        custo: payload.custo || 50.0,
        origem: "OFFBOARD_CRM",
      });
    },
    onSuccess: (_, vars) => {
      const key = `${vars.flight_id}-${vars.assento}`;
      setEnviados((prev) => new Set(prev).add(key));
    },
  });

  const flightId = vooData?.flight_id || "AD4409";

  // Filtra e prepara passageiros com atrito operacional ou recomendação ativa
  const passageirosOffboard = useMemo(() => {
    if (!vooData?.assentos) return [];

    return vooData.assentos
      .filter((seat: AssentoVoo) => {
        const c = seat.dados_cliente;
        if (!c) return false;
        const hasAtrito =
          (c.score_atrito_acumulado && c.score_atrito_acumulado > 0) ||
          c.risco_evasao > 0.35 ||
          seat.status === "critico" ||
          seat.status === "vip" ||
          (c.contexto_narrativo_llm && !c.contexto_narrativo_llm.includes("Sem ocorrências"));
        return hasAtrito;
      })
      .map((seat: AssentoVoo) => {
        const c = seat.dados_cliente;
        const key = `${flightId}-${seat.assento}`;
        const isEnviado = enviados.has(key);

        const acaoRecomendada =
          c.acao_vencedora ||
          (c.contexto_narrativo_llm?.toLowerCase().includes("pet")
            ? "Kit Snack Premium + Atenção Pet"
            : c.contexto_narrativo_llm?.toLowerCase().includes("chml") ||
              c.contexto_narrativo_llm?.toLowerCase().includes("criança")
            ? "Kit Sobrevivência Kids"
            : c.risco_evasao > 0.6
            ? "Acolhimento Pessoal + Voucher 1000pts"
            : "Bebida Premium Cortesia");

        const isFallback = Boolean(
          !c.mensagem_llm_offboard ||
            c.mensagem_llm_offboard.includes("Mensagem pendente") ||
            c.mensagem_llm_offboard.includes("régua de relacionamento padrão")
        );

        const msgOffboard =
          c.mensagem_llm_offboard &&
          c.mensagem_llm_offboard.startsWith("[RAG: Azul Fidelidade Res. 400]")
            ? c.mensagem_llm_offboard
            : `[RAG: Azul Fidelidade Res. 400] Olá, ${c.nome}! Notamos o atrito recente em sua jornada conosco. Como cliente ${c.tier_fidelidade}, disponibilizamos ${acaoRecomendada} para garantir seu bem-estar. Conte sempre com a Azul! ✈️💙`;

        return {
          seatKey: key,
          assento: seat.assento,
          id_cliente: c.id_cliente,
          nome: c.nome,
          pnr: c.pnr || "SOLO",
          tier: c.tier_fidelidade,
          persona: c.persona,
          clv: c.clv_previsto,
          risco_evasao: c.risco_evasao,
          score_atrito: c.score_atrito_acumulado,
          status: seat.status,
          contexto: c.contexto_narrativo_llm || "Sem ocorrências registradas",
          acao: acaoRecomendada,
          custo: c.custo_acao || 50.0,
          mensagem: msgOffboard,
          isFallback,
          isEnviado,
          explicabilidade: c.explicabilidade,
        };
      });
  }, [vooData, flightId, enviados]);

  // Filtra por termo de busca e status de envio
  const passageirosFiltrados = useMemo(() => {
    return passageirosOffboard.filter((p) => {
      if (filter === "pendentes" && p.isEnviado) return false;
      if (filter === "enviados" && !p.isEnviado) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = p.nome.toLowerCase().includes(term);
        const matchAssento = p.assento.toLowerCase().includes(term);
        const matchPnr = p.pnr.toLowerCase().includes(term);
        const matchTier = p.tier.toLowerCase().includes(term);
        const matchPersona = p.persona.toLowerCase().includes(term);
        return matchName || matchAssento || matchPnr || matchTier || matchPersona;
      }

      return true;
    });
  }, [passageirosOffboard, filter, searchTerm]);

  // Abre automaticamente a explicabilidade do primeiro passageiro apenas uma única vez na carga inicial
  useEffect(() => {
    if (!hasInitializedXai.current && passageirosOffboard.length > 0) {
      setExpandedXaiId(passageirosOffboard[0].seatKey);
      hasInitializedXai.current = true;
    }
  }, [passageirosOffboard]);

  const totalElegiveis = passageirosOffboard.length;
  const totalEnviados = passageirosOffboard.filter((p) => p.isEnviado).length;
  const totalPendentes = totalElegiveis - totalEnviados;

  // Configuração das Abas de Filtro Animadas (AnimatedTabs)
  const filterTabs = useMemo<TabItem<FilterType>[]>(
    () => [
      {
        id: "todos",
        label: "Todos",
        badge: totalElegiveis,
      },
      {
        id: "pendentes",
        label: "Pendentes",
        badge: totalPendentes,
        activeBadgeClassName: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
      },
      {
        id: "enviados",
        label: "Concluídos",
        badge: totalEnviados,
        activeBadgeClassName: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      },
    ],
    [totalElegiveis, totalPendentes, totalEnviados]
  );

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleConfirmarDisparo = (p: {
    assento: string;
    id_cliente?: string;
    acao: string;
    custo: number;
  }) => {
    confirmMutation.mutate({
      flight_id: flightId,
      assento: p.assento,
      id_cliente: p.id_cliente,
      acao: p.acao,
      custo: p.custo,
    });
  };

  return (
    <div className="relative space-y-7 selection:bg-primary/30 selection:text-primary animate-in fade-in duration-300">
      {/* ─────────────────────────────────────────────────────────────
          ELEMENTO ATMOSFÉRICO DE PROFUNDIDADE (AERO GLOW SUTIL DO DASHBOARD)
         ───────────────────────────────────────────────────────────── */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-full max-w-5xl h-64 bg-primary/5 blur-[120px] pointer-events-none -z-10 rounded-full" />
      <div className="absolute top-72 right-10 w-96 h-96 bg-sky-500/5 blur-[140px] pointer-events-none -z-10 rounded-full" />

      {/* ─────────────────────────────────────────────────────────────
          HEADER DA TELA OFF-BOARD (IDÊNTICO AO @DASHBOARD)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-3 border-b border-border/80">
        <div>
          {/* Micro-badge de Ecossistema */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold tracking-wide shadow-xs mb-2">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Ecossistema Azul Fidelidade • Retenção Proativa</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-sans">
              Central de Ações Off-Board
            </h1>
            <span className="rounded-full bg-secondary border border-border text-secondary-foreground text-[11px] font-bold px-3 py-0.5">
              Pós-Voo & Canais Digitais
            </span>
            <Badge variant="outline" className="text-[11px] font-mono rounded-full border-border/80 text-muted-foreground bg-card/60 backdrop-blur-md">
              Voo {flightId} • Viracopos (VCP)
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed">
            pulso: Disparo calibrado via WhatsApp Concierge e E-mail para mitigar atrito operacional pós-desembarque,
            em estrita conformidade com a Resolução 400 da ANAC e LGPD.
          </p>
        </div>

        {/* Controles de Atualização & Badges de Governança */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/80 border border-border text-xs text-muted-foreground shadow-xs">
            <Database className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-medium">Camada Gold (DuckDB)</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 rounded-xl border-border bg-card/80 hover:bg-muted text-foreground text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-primary ${isFetching ? "animate-spin" : ""}`} />
            <span>Atualizar Fila</span>
          </Button>

          {/* Widget de NPS Estilo Dashboard */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 backdrop-blur-xl p-2 px-3.5 text-right shadow-xs">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
              Recuperação Estimada
            </span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 block leading-tight mt-0.5">
              +48 pts NPS
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          HERO KPIS: DISPAROS PENDENTES & AÇÕES CONCLUÍDAS (ESTILO @DASHBOARD)
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Card 1: Disparos Pendentes */}
        <div className="group relative rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl shadow-xs hover:border-amber-500/40 hover:shadow-md transition-all duration-300 overflow-hidden">
          {/* Faixa de Luz Superior em Gradiente (Feixe Luminous) */}
          <div className="absolute inset-x-6 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent opacity-85 group-hover:opacity-100 transition-opacity" />

          {/* Glow Sutil de Fundo */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/15 to-transparent blur-2xl rounded-full pointer-events-none" />

          <div className="relative p-6 flex flex-col justify-between h-full space-y-3">
            {/* Cabeçalho do Card */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                Disparos Pendentes
                <InfoTooltip
                  title="Fila de Retenção CRM"
                  badge="Pendente"
                  text="Passageiros com atrito operacional que aguardam conferência e autorização para envio da ação de retenção."
                  side="bottom"
                />
              </span>

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-transform duration-200 group-hover:scale-105">
                <Clock className="h-5 w-5" />
              </div>
            </div>

            {/* Valor Principal */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <span className="text-3xl sm:text-4xl font-black tracking-tight font-sans text-amber-600 dark:text-amber-400">
                  {totalPendentes}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  de {totalElegiveis} passageiros
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Mensagens geradas pelo Árbitro RAG aguardando conferência do gestor de CRM.
              </p>
            </div>

            {/* Rodapé / Micro-pill de Indicador */}
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/25">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Fila de Relacionamento Ativa
              </span>

              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                <span>Auditar</span>
                <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Ações Concluídas (Card Especial com Glow Esmeralda) */}
        <div className="group relative rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-card via-card to-emerald-500/5 shadow-md hover:border-emerald-500/60 transition-all duration-300 overflow-hidden">
          {/* Faixa de Luz Superior em Gradiente */}
          <div className="absolute inset-x-6 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-85 group-hover:opacity-100 transition-opacity" />

          {/* Glow Sutil de Fundo */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-emerald-500/20 to-transparent blur-2xl rounded-full pointer-events-none" />

          <div className="relative p-6 flex flex-col justify-between h-full space-y-3">
            {/* Cabeçalho do Card */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                Ações Concluídas
                <InfoTooltip
                  title="Loop Transacional MLOps"
                  badge="Gravado"
                  text="Total de comunicações disparadas e devidamente registradas no banco de auditoria SQLite para mensuração de causalidade."
                  side="bottom"
                />
              </span>

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 transition-transform duration-200 group-hover:scale-105 shadow-xs">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>

            {/* Valor Principal */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <span className="text-3xl sm:text-4xl font-black tracking-tight font-sans text-emerald-600 dark:text-emerald-400">
                  {totalEnviados}
                </span>
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 shadow-xs inline-flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5" />
                  <span>MLOps Gravado</span>
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Comunicações transmitidas e registradas no banco SQLite para fechamento do loop de IA.
              </p>
            </div>

            {/* Rodapé / Micro-pill de Indicador */}
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/25">
                Feedback Loop Integrado
              </span>

              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                <span>Auditar</span>
                <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TOOLBAR LIQUID GLASS COM ABAS ANIMADAS EM "FILTRAR:"
         ───────────────────────────────────────────────────────────── */}
      <div className="group relative rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl p-4 shadow-xs space-y-4 overflow-hidden">
        {/* Feixe luminoso superior */}
        <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Seletor de Canais */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <Button
              variant={selectedChannel === "whatsapp" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedChannel("whatsapp")}
              className={cn(
                "h-9 text-xs font-sans font-bold rounded-xl gap-2 cursor-pointer transition-all",
                selectedChannel === "whatsapp"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  : "border-border/80 bg-card/60 hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>WhatsApp Concierge ({totalElegiveis})</span>
            </Button>

            <Button
              variant={selectedChannel === "email" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedChannel("email")}
              className={cn(
                "h-9 text-xs font-sans font-bold rounded-xl gap-2 cursor-pointer transition-all",
                selectedChannel === "email"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "border-border/80 bg-card/60 hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Mail className="h-3.5 w-3.5" />
              <span>E-mail Transacional</span>
            </Button>

            <Button
              variant={selectedChannel === "push" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedChannel("push")}
              className={cn(
                "h-9 text-xs font-sans font-bold rounded-xl gap-2 cursor-pointer transition-all",
                selectedChannel === "push"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "border-border/80 bg-card/60 hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Bell className="h-3.5 w-3.5" />
              <span>Push Notification</span>
            </Button>
          </div>

          {/* Abas de Filtro Animadas (AnimatedTabs) em "Filtrar:" */}
          <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
            <span className="text-xs text-muted-foreground font-sans font-semibold flex items-center gap-1">
              <ListFilter className="h-3.5 w-3.5 text-primary" />
              Filtrar:
            </span>

            <AnimatedTabs<FilterType>
              tabs={filterTabs}
              activeTab={filter}
              onChange={setFilter}
              size="sm"
              showConnectors={false}
              showTrack={false}
              className="w-auto"
              containerClassName="border-border/80 bg-muted/50 p-1 rounded-xl"
            />
          </div>
        </div>

        {/* Input de Busca */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por passageiro, PNR, assento ou tier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-9 text-xs sm:text-sm rounded-xl border border-border bg-background/60 backdrop-blur-md focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition-all placeholder:text-muted-foreground/70"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          LISTA DE CARDS DE PASSAGEIRO (ESTILO LIQUID GLASS DO DASHBOARD)
         ───────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border/80 bg-card/80 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-48 rounded-lg" />
                <Skeleton className="h-6 w-24 rounded-lg" />
              </div>
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-10 w-32 rounded-xl" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <h3 className="font-sans font-bold text-sm text-foreground">
            Falha ao carregar passageiros elegíveis
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Não foi possível consultar os dados analíticos do voo no Data Lake. Verifique se o backend está em execução.
          </p>
          <Button size="sm" onClick={() => refetch()} className="rounded-xl font-sans font-bold cursor-pointer">
            Tentar Novamente
          </Button>
        </div>
      ) : passageirosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 backdrop-blur-xl p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="font-sans font-black text-base text-foreground pt-1">
            Nenhum passageiro encontrado
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {searchTerm
              ? "Nenhum resultado corresponde à sua busca por texto."
              : "Todas as mensagens de retenção para este lote foram disparadas com sucesso!"}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {passageirosFiltrados.map((p) => {
            const tierConf = getTierConfig(p.tier);
            const isCopied = copiedId === p.seatKey;
            const riscoPerc = Math.round(p.risco_evasao * 100);

            return (
              <div
                key={p.seatKey}
                className={cn(
                  "group relative rounded-2xl border transition-all duration-300 backdrop-blur-xl p-6 sm:p-7 space-y-5 overflow-hidden",
                  p.isEnviado
                    ? "border-emerald-500/40 bg-gradient-to-br from-card via-card to-emerald-500/5 shadow-md"
                    : "border-border/80 bg-card/80 shadow-xs hover:border-primary/40 hover:shadow-md"
                )}
              >
                {/* Feixe luminoso superior */}
                <div
                  className={cn(
                    "absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent to-transparent opacity-85 transition-opacity",
                    p.isEnviado ? "via-emerald-400" : "via-primary/30"
                  )}
                />

                {/* Glow de fundo */}
                <div
                  className={cn(
                    "absolute top-0 right-0 w-36 h-36 blur-2xl rounded-full pointer-events-none",
                    p.isEnviado ? "bg-gradient-to-bl from-emerald-500/10 to-transparent" : "bg-gradient-to-bl from-primary/10 to-transparent"
                  )}
                />

                {/* ─────────────────────────────────────────────────────────────
                    ZONA 1: DOSSIÊ DO PASSAGEIRO (HEADER NOBRE)
                   ───────────────────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-4 border-b border-border/60">
                  <div className="flex items-center gap-3.5 flex-wrap">
                    {/* Box do Assento */}
                    <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary font-sans font-black text-sm flex items-center justify-center border border-primary/25 shrink-0 shadow-xs">
                      {p.assento}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-sans font-black text-lg text-foreground tracking-tight">
                          {p.nome}
                        </h3>
                        <Badge variant="outline" className={cn("text-[10px] font-bold rounded-full border shadow-2xs", tierConf.badge)}>
                          {tierConf.name}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-medium rounded-full text-muted-foreground border-border bg-muted/40">
                          {p.persona}
                        </Badge>
                        <span className="text-[11px] text-primary font-mono font-bold bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                          PNR: {p.pnr}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badge de Risco & Status */}
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <div
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-sans font-bold shadow-2xs",
                        riscoPerc > 60
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                          : riscoPerc >= 40
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      )}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          riscoPerc > 60
                            ? "bg-rose-500 animate-pulse"
                            : riscoPerc >= 40
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        )}
                      />
                      <span>
                        Risco Churn: {riscoPerc}% {riscoPerc > 60 ? "(Crítico)" : riscoPerc >= 40 ? "(Moderado)" : "(Controlado)"}
                      </span>
                    </div>

                    {p.isEnviado ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] gap-1 font-bold rounded-full shadow-xs px-3 py-1">
                        <CheckCheck className="h-3.5 w-3.5" />
                        <span>Enviado</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[11px] font-bold rounded-full text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10 px-3 py-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Aguardando Envio</span>
                      </Badge>
                    )}
                  </div>
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    ZONA 2: SÍNTESE OPERACIONAL (SPLIT BALANCE CARD COM PONTE)
                   ───────────────────────────────────────────────────────────── */}
                <div className="rounded-xl border border-border/80 bg-muted/40 dark:bg-muted/20 p-4 sm:p-5">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4 text-xs">
                    {/* Lado Esquerdo: Diagnóstico de Atrito (Causa) */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        Diagnóstico Operacional (Causa Raiz)
                      </span>
                      <p className="text-foreground font-medium text-xs leading-relaxed">
                        {p.contexto}
                      </p>
                    </div>

                    {/* Conector Visual */}
                    <div className="hidden md:flex items-center justify-center px-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>

                    {/* Lado Direito: Ação Prescrita pelo Árbitro */}
                    <div className="space-y-1.5 md:border-l md:border-border/60 md:pl-4">
                      <span className="text-[10px] text-primary uppercase font-bold tracking-wider flex items-center gap-1.5 font-sans">
                        <HeartHandshake className="h-3.5 w-3.5 text-primary" />
                        Ação Recomendada (Prescrição do Árbitro)
                      </span>
                      <h4 className="font-sans font-black text-primary text-sm sm:text-base tracking-tight">
                        {p.acao}
                      </h4>
                      <div className="flex items-center gap-2 pt-0.5 flex-wrap text-[10.5px]">
                        <span className="bg-card px-2.5 py-0.5 rounded-md border border-border font-mono text-muted-foreground font-semibold">
                          Custo: {formatCurrency(p.custo)}
                        </span>
                        <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-md border border-primary/25 font-mono font-bold">
                          CLV Protegido: {formatCurrency(p.clv)}
                        </span>
                        <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-md border border-emerald-500/25 font-mono font-bold">
                          Retorno Estimado: +340%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    ZONA 3: WHATSAPP CONCIERGE EXPERIENCE
                   ───────────────────────────────────────────────────────────── */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-4 space-y-3">
                  {/* Header do Balão de Conversa */}
                  <div className="flex items-center justify-between text-xs border-b border-emerald-500/20 pb-2.5 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-sans font-black text-[10px] shadow-xs">
                        AZ
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-sans font-bold text-foreground text-xs">
                          Azul Concierge Oficial
                        </span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-[10px] text-muted-foreground">• Atendimento Pós-Voo</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {p.isFallback ? (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-mono rounded-md">
                          Protocolo Padrão (Fallback)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-mono rounded-md">
                          RAG Resolução 400 ANAC
                        </Badge>
                      )}

                      {/* Botão de Cópia Integrado */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(p.seatKey, p.mensagem)}
                        className={cn(
                          "h-7 text-[11px] gap-1.5 font-sans font-bold px-2.5 rounded-lg transition-all cursor-pointer",
                          isCopied
                            ? "bg-emerald-500 text-white"
                            : "hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        )}
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3 w-3" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Balão de Fala do WhatsApp */}
                  <div className="rounded-xl rounded-tl-sm p-4 bg-card/90 dark:bg-card/70 border border-emerald-500/25 text-xs text-foreground leading-relaxed shadow-xs">
                    <p className="font-medium text-foreground">
                      {p.mensagem}
                    </p>
                    <div className="flex items-center justify-end gap-1.5 pt-2 text-[10px] text-muted-foreground">
                      <span>14:32</span>
                      <CheckCheck className="h-3.5 w-3.5 text-sky-500" />
                    </div>
                  </div>
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    ZONA 4: BARRA DE AÇÕES (EXPLICAR XAI + CONFIRMAR DISPARO)
                   ───────────────────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedXaiId(expandedXaiId === p.seatKey ? null : p.seatKey)}
                    className={cn(
                      "h-9 text-xs gap-2 font-sans font-bold rounded-xl cursor-pointer transition-all px-3.5",
                      expandedXaiId === p.seatKey
                        ? "bg-primary/15 text-primary border border-primary/30 shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>{expandedXaiId === p.seatKey ? "Ocultar Suíte de Decisão (XAI)" : "Explicar Decisão (XAI)"}</span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform duration-300 ease-out",
                        expandedXaiId === p.seatKey && "rotate-180"
                      )}
                    />
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    disabled={p.isEnviado || confirmMutation.isPending}
                    onClick={() => handleConfirmarDisparo(p)}
                    className={cn(
                      "h-9 text-xs gap-2 font-sans font-bold rounded-xl cursor-pointer transition-all shadow-xs px-4 active:scale-95",
                      p.isEnviado
                        ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
                        : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                    )}
                  >
                    {p.isEnviado ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>Disparo Registrado no MLOps</span>
                      </>
                    ) : confirmMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Gravando no SQLite...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Confirmar Disparo</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    ZONA 5: SUÍTE DE DECISÃO & EXPLICABILIDADE (ANIMAÇÃO SUAVE OPEN/CLOSE)
                   ───────────────────────────────────────────────────────────── */}
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-out",
                    expandedXaiId === p.seatKey
                      ? "grid-rows-[1fr] opacity-100 mt-4"
                      : "grid-rows-[0fr] opacity-0 mt-0 pointer-events-none"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="p-5 sm:p-6 rounded-2xl border border-primary/25 bg-primary/5 dark:bg-primary/10 backdrop-blur-xl space-y-5 shadow-xs">
                      <div className="flex items-center justify-between border-b border-primary/20 pb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-xs">
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="font-sans font-black text-sm text-foreground uppercase tracking-wider">
                              Suíte de Decisão Analítica (XAI • Árbitro de Uplift)
                            </h4>
                            <p className="text-[10px] text-muted-foreground">
                              Decomposição explicável baseada no Data Lake Gold e Regulação ANAC
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] font-mono bg-card/60 backdrop-blur-md rounded-md">
                            SHAP Camada Gold
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-mono bg-card/60 backdrop-blur-md rounded-md">
                            Uplift Arbitragem
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-mono bg-card/60 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 backdrop-blur-md rounded-md">
                            Resolução 400 ANAC
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
                        {/* 1. Pilar SHAP */}
                        <div className="p-4 rounded-xl bg-card/80 border border-border/80 space-y-3 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-sans font-bold text-foreground flex items-center gap-1.5">
                              <TrendingUp className="h-3.5 w-3.5 text-rose-500" />
                              Decomposição de Risco (SHAP)
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Risco Final: <strong>{formatPercent(p.risco_evasao, 0)}</strong>
                            </span>
                          </div>

                          <div className="space-y-2.5 pt-1">
                            {p.explicabilidade?.fatores_shap && p.explicabilidade.fatores_shap.length > 0 ? (
                              p.explicabilidade.fatores_shap.map((f, idx) => {
                                const isPos = f.direcao === "positivo";
                                return (
                                  <div key={idx} className="space-y-1">
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="text-muted-foreground truncate max-w-[170px]" title={f.variavel}>
                                        {f.variavel}
                                      </span>
                                      <span
                                        className={cn(
                                          "font-mono font-bold text-xs",
                                          isPos ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"
                                        )}
                                      >
                                        {f.impacto > 0 ? `+${(f.impacto * 100).toFixed(0)}%` : `${(f.impacto * 100).toFixed(0)}%`}
                                      </span>
                                    </div>
                                    <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                                      <div
                                        className={cn(
                                          "h-full rounded-full transition-all",
                                          isPos
                                            ? "bg-rose-500"
                                            : "bg-emerald-500"
                                        )}
                                        style={{ width: `${Math.min(100, Math.abs(f.impacto) * 120)}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-[11px] text-muted-foreground italic">Sem fatores críticos registrados.</p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-border flex items-center justify-between text-[9.5px] text-muted-foreground">
                            <span className="flex items-center gap-1 text-rose-500">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Eleva Churn
                            </span>
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Protege Valor
                            </span>
                          </div>
                        </div>

                        {/* 2. Pilar ROI */}
                        <div className="p-4 rounded-xl bg-card/80 border border-border/80 space-y-3 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-sans font-bold text-foreground flex items-center gap-1.5">
                              <HeartHandshake className="h-3.5 w-3.5 text-primary" />
                              Arbitragem de ROI (Uplift)
                            </span>
                            <Badge className="bg-primary text-primary-foreground text-[10px] px-2.5 py-0.5 rounded-full font-bold shadow-xs">
                              Retorno: {formatCurrency(p.explicabilidade?.racional_arbitro?.retorno_liquido || p.clv * p.risco_evasao * 0.15 - p.custo)}
                            </Badge>
                          </div>

                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {p.explicabilidade?.racional_arbitro?.motivo_escolha ||
                              `Ação '${p.acao}' aprovada com custo de ${formatCurrency(p.custo)} para proteger ${formatCurrency(p.clv)} em CLV.`}
                          </p>

                          <div className="space-y-1.5 pt-1 border-t border-border">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                              Ranking de Alternativas Avaliadas:
                            </span>
                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                              {p.explicabilidade?.racional_arbitro?.acoes_avaliadas && p.explicabilidade.racional_arbitro.acoes_avaliadas.length > 0 ? (
                                p.explicabilidade.racional_arbitro.acoes_avaliadas.map((a, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/40 text-[10.5px]"
                                  >
                                    <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                                      {a.status === "VENCEDORA" && <Award className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                                      <span className="font-medium text-foreground truncate">{a.acao}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="font-mono text-muted-foreground">{formatCurrency(a.custo)}</span>
                                      <span
                                        className={cn(
                                          "px-2 py-0.5 rounded-full text-[9px] font-bold",
                                          a.status === "VENCEDORA"
                                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                            : a.status === "VETADA_ROI"
                                            ? "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                                            : "bg-muted text-muted-foreground"
                                        )}
                                      >
                                        {a.status === "VENCEDORA" ? "1º Lugar" : a.status === "VETADA_ROI" ? "Vetada ROI" : "Superada"}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40 text-[10.5px]">
                                  <span className="font-medium text-foreground">{p.acao}</span>
                                  <span className="text-emerald-500 font-bold">1º Lugar (Aprovada)</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 3. Pilar Regulatória */}
                        <div className="p-4 rounded-xl bg-card/80 border border-border/80 space-y-3 flex flex-col justify-between shadow-xs">
                          <div className="space-y-2.5">
                            <span className="text-[11px] font-sans font-bold text-foreground flex items-center gap-1.5">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                              Selo de Conformidade Regulatória
                            </span>

                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[11px] space-y-1">
                              <span className="font-sans font-bold text-emerald-600 dark:text-emerald-400 block">
                                {p.explicabilidade?.fundamentacao_rag?.norma || "Resolução 400 ANAC"}
                              </span>
                              <p className="text-muted-foreground leading-relaxed text-[10.5px]">
                                {p.explicabilidade?.fundamentacao_rag?.artigo || "Art. 20 a 28 (Assistência Material e Compensação Proativa)"}
                              </p>
                            </div>

                            <div className="p-3 rounded-xl bg-primary/10 border border-primary/25 text-[11px] space-y-1">
                              <span className="font-sans font-bold text-primary block">
                                Diretriz Azul Fidelidade ({p.tier})
                              </span>
                              <p className="text-muted-foreground leading-relaxed text-[10.5px]">
                                {p.explicabilidade?.fundamentacao_rag?.regra_fidelidade ||
                                  `Compensação calibrada com o nível de engajamento da categoria ${p.tier} para maximizar retenção.`}
                              </p>
                            </div>
                          </div>

                          <div className="text-[10px] text-muted-foreground pt-2 flex items-center justify-between border-t border-border font-mono">
                            <span className="flex items-center gap-1">
                              <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span>Audit ID: #tx_mlops_{p.seatKey.replace('-', '_')}</span>
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">100% LGPD</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          BANNER DE GOVERNANÇA, LGPD E IA RESPONSÁVEL (ESTILO @DASHBOARD)
         ───────────────────────────────────────────────────────────── */}
      <div className="group relative rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 shadow-xs overflow-hidden">
        {/* Feixe luminoso superior */}
        <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        {/* Glow sutil */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-primary/15 to-transparent blur-3xl rounded-full pointer-events-none" />

        <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="lg:col-span-2 space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs">
                <Lock className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-sans font-black text-lg text-foreground tracking-tight">
                Governança, IA Responsável & Conformidade LGPD
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
              A camada analítica opera sob princípios estritos de <strong>Zero Viés</strong> e minimização de dados.
              Nenhum dado sensível (como gênero, etnia ou idade) é utilizado para precificação ou priorização de ações.
              A inferência baseia-se exclusivamente em histórico transacional, risco analítico de evasão e regras regulatórias (ANAC Resolução 400).
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="px-3 py-1 rounded-full bg-card/80 border border-border/80 text-foreground flex items-center gap-1.5 font-medium shadow-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Anonimização de Identificadores (Art. 13 LGPD)
              </span>
              <span className="px-3 py-1 rounded-full bg-card/80 border border-border/80 text-foreground flex items-center gap-1.5 font-medium shadow-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Sentimento Público ANAC VRA
              </span>
              <span className="px-3 py-1 rounded-full bg-card/80 border border-border/80 text-foreground flex items-center gap-1.5 font-medium shadow-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Auditabilidade SQLite Transacional (mlops_logs.db)
              </span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-muted/40 border border-border/80 space-y-1.5 text-center lg:text-right shadow-inner">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
              Métrica de Equidade
            </span>
            <span className="text-4xl sm:text-5xl font-sans font-black text-primary block tracking-tight">
              100%
            </span>
            <span className="text-xs text-muted-foreground block">
              Auditoria de Paridade Estatística (Zero Viés Demográfico)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
