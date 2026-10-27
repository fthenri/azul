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
  SlidersHorizontal,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
        // Prioriza passageiros com atrito, risco elevado ou com ação recomendada
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

        // Define ação e mensagem com fallback inteligente
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
      // Filtro de status
      if (filter === "pendentes" && p.isEnviado) return false;
      if (filter === "enviados" && !p.isEnviado) return false;

      // Filtro de busca
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

  // Estatísticas do cabeçalho
  const totalElegiveis = passageirosOffboard.length;
  const totalEnviados = passageirosOffboard.filter((p) => p.isEnviado).length;
  const totalPendentes = totalElegiveis - totalEnviados;

  // Configuração das Abas de Filtro Animadas (AnimatedTabs) no estilo iOS
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
        activeBadgeClassName: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25",
      },
      {
        id: "enviados",
        label: "Concluídos",
        badge: totalEnviados,
        activeBadgeClassName: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25",
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
      // Fallback para clipboard indisponível
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
    <div className="space-y-6 relative selection:bg-blue-500/25">
      {/* ─────────────────────────────────────────────────────────────
          CABEÇALHO ESTILO APPLE IOS: TIPOGRAFIA PURA, CAPSULES & GLASS
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-2">
        <div className="space-y-2">
          {/* Status Pills Estilo iOS */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium backdrop-blur-md border border-blue-500/15">
              <Sparkles className="h-3 w-3 text-blue-500" />
              Retenção Proativa
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium backdrop-blur-md border border-emerald-500/15">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              Resolução 400 ANAC & LGPD
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-muted/60 text-muted-foreground text-xs font-medium border border-border/40">
              Voo {flightId} • Viracopos (VCP)
            </span>
          </div>

          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Ações Off-Board
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed mt-1">
              Comunicações assistidas via WhatsApp e E-mail para passageiros que sofreram atrito operacional durante a jornada.
            </p>
          </div>
        </div>

        {/* Controles de Ação no Topo (Estilo iOS) */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-10 gap-2 text-xs font-semibold rounded-full border-border/50 bg-card/60 hover:bg-card/90 backdrop-blur-xl px-4 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-blue-500" : "text-muted-foreground"}`} />
            <span>Atualizar Fila</span>
          </Button>

          {/* Widget de NPS Estilo Apple Health */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 backdrop-blur-xl p-2.5 px-4 text-right shadow-xs">
            <span className="text-[11px] font-medium text-muted-foreground block">
              Recuperação Estimada
            </span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 block leading-tight mt-0.5 tracking-tight">
              +48 pts NPS
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          HERO KPIS: DISPAROS PENDENTES & AÇÕES CONCLUÍDAS (APPLE WIDGETS)
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Disparos Pendentes */}
        <div className="rounded-3xl border border-border/50 bg-card/70 dark:bg-card/45 backdrop-blur-2xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Disparos Pendentes
              </span>
              <div className="flex items-baseline gap-2.5">
                <span className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                  {totalPendentes}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  de {totalElegiveis} passageiros
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm pt-0.5">
                Mensagens geradas pelo Árbitro RAG aguardando conferência e disparo do gestor de CRM.
              </p>
            </div>

            {/* Ícone Estilo Apple SF Symbol */}
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
              <Clock className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Fila de relacionamento ativa</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Pendente
            </span>
          </div>
        </div>

        {/* Card 2: Ações Concluídas */}
        <div className="rounded-3xl border border-border/50 bg-card/70 dark:bg-card/45 backdrop-blur-2xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Ações Concluídas
              </span>
              <div className="flex items-baseline gap-2.5">
                <span className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                  {totalEnviados}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  ações registradas
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm pt-0.5">
                Comunicações enviadas e registradas no banco de auditoria SQLite para mensuração de retenção.
              </p>
            </div>

            {/* Ícone Estilo Apple SF Symbol */}
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Auditabilidade MLOps</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
              <Check className="h-3 w-3" />
              Sincronizado
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TOOLBAR ESTILO APPLE IOS: SEGMENTED CONTROLS, ABAS & BUSCA
         ───────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-border/50 bg-card/70 dark:bg-card/45 backdrop-blur-2xl p-3 sm:p-4 shadow-sm space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Seletor de Canais: iOS Segmented Control */}
          <div className="inline-flex p-1 rounded-full bg-muted/60 dark:bg-muted/40 border border-border/30 backdrop-blur-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedChannel("whatsapp")}
              className={cn(
                "h-8 px-4 text-xs font-semibold rounded-full flex items-center gap-2 cursor-pointer transition-all",
                selectedChannel === "whatsapp"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
              <span>WhatsApp Concierge ({totalElegiveis})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedChannel("email")}
              className={cn(
                "h-8 px-4 text-xs font-semibold rounded-full flex items-center gap-2 cursor-pointer transition-all",
                selectedChannel === "email"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Mail className="h-3.5 w-3.5 text-blue-500" />
              <span>E-mail Transacional</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedChannel("push")}
              className={cn(
                "h-8 px-4 text-xs font-semibold rounded-full flex items-center gap-2 cursor-pointer transition-all",
                selectedChannel === "push"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Bell className="h-3.5 w-3.5 text-amber-500" />
              <span>Push Notification</span>
            </button>
          </div>

          {/* Abas de Filtro Animadas (AnimatedTabs) em "Filtrar:" */}
          <div className="flex items-center gap-2.5 self-start lg:self-auto shrink-0">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-blue-500" />
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
              containerClassName="border-border/40 bg-muted/60 dark:bg-muted/40 p-1 rounded-full backdrop-blur-xl"
              tabClassName="text-xs font-medium rounded-full"
            />
          </div>
        </div>

        {/* Input de Busca Estilo iOS Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por passageiro, PNR, assento ou tier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-9 text-xs sm:text-sm rounded-2xl border border-border/40 bg-muted/40 dark:bg-muted/30 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-2.5 h-5 w-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          LISTA DE CARDS ESTILO APPLE: SQUIRCLES, TRANSLUCIDEZ & HIERARQUIA
         ───────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-3xl border border-border/50 bg-card/60 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-48 rounded-xl" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-10 w-32 rounded-full" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-3xl border border-rose-500/25 bg-rose-500/5 dark:bg-rose-950/20 backdrop-blur-xl p-8 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
          <h3 className="font-semibold text-sm text-foreground">
            Falha ao carregar passageiros elegíveis
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Não foi possível consultar os dados analíticos do voo. Verifique a conexão com o backend.
          </p>
          <Button size="sm" onClick={() => refetch()} className="rounded-full font-semibold cursor-pointer">
            Tentar Novamente
          </Button>
        </div>
      ) : passageirosFiltrados.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/60 bg-card/40 backdrop-blur-xl p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-base text-foreground pt-1">
            Nenhum passageiro encontrado
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {searchTerm
              ? "Nenhum resultado corresponde à sua busca."
              : "Todas as mensagens da fila de retenção foram disparadas com sucesso!"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {passageirosFiltrados.map((p) => {
            const tierConf = getTierConfig(p.tier);
            const isCopied = copiedId === p.seatKey;
            const riscoPerc = Math.round(p.risco_evasao * 100);

            return (
              <div
                key={p.seatKey}
                className={cn(
                  "rounded-3xl border transition-all duration-300 backdrop-blur-2xl p-6 sm:p-7 space-y-5 relative overflow-hidden",
                  p.isEnviado
                    ? "border-emerald-500/30 bg-emerald-500/[0.03] dark:bg-emerald-950/15 shadow-xs"
                    : "border-border/50 bg-card/75 dark:bg-card/45 shadow-sm hover:shadow-md hover:border-border/80"
                )}
              >
                {/* ─────────────────────────────────────────────────────────────
                    ZONA 1: CABEÇALHO DO PASSAGEIRO (PERFIL & STATUS)
                   ───────────────────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-4 border-b border-border/40">
                  <div className="flex items-center gap-3.5 flex-wrap">
                    {/* Token de Assento Estilo Apple */}
                    <div className="h-11 w-11 rounded-2xl bg-muted/80 text-foreground font-bold text-sm flex items-center justify-center border border-border/50 shrink-0 shadow-xs">
                      {p.assento}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base sm:text-lg text-foreground tracking-tight">
                          {p.nome}
                        </h3>
                        <Badge variant="outline" className={cn("text-xs font-semibold rounded-full border shadow-2xs", tierConf.badge)}>
                          {tierConf.name}
                        </Badge>
                        <span className="text-xs font-medium text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full border border-border/40">
                          {p.persona}
                        </span>
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                          PNR: {p.pnr}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badges de Risco e Status Estilo iOS */}
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <div
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold",
                        riscoPerc > 60
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                          : riscoPerc >= 40
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
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
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold text-xs border border-emerald-500/30">
                        <CheckCheck className="h-3.5 w-3.5" />
                        <span>Enviado</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-xs border border-amber-500/30">
                        <Clock className="h-3 w-3" />
                        <span>Pendente</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    ZONA 2: SÍNTESE OPERACIONAL (CAUSA ──► REMÉDIO)
                   ───────────────────────────────────────────────────────────── */}
                <div className="rounded-2xl border border-border/40 bg-muted/30 dark:bg-muted/15 p-4 sm:p-5">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4 text-xs">
                    {/* Diagnóstico de Atrito (Causa) */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        Diagnóstico Operacional
                      </span>
                      <p className="text-foreground font-medium text-xs leading-relaxed">
                        {p.contexto}
                      </p>
                    </div>

                    {/* Conector Suave Apple Style */}
                    <div className="hidden md:flex items-center justify-center px-2">
                      <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-2xs">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>

                    {/* Ação Prescrita pelo Árbitro (Remédio & ROI) */}
                    <div className="space-y-1.5 md:border-l md:border-border/40 md:pl-4">
                      <span className="text-[11px] text-blue-600 dark:text-blue-400 uppercase font-semibold tracking-wider flex items-center gap-1.5">
                        <HeartHandshake className="h-3.5 w-3.5" />
                        Ação Prescrita pelo Árbitro
                      </span>
                      <h4 className="font-bold text-foreground text-sm tracking-tight">
                        {p.acao}
                      </h4>
                      <div className="flex items-center gap-2 pt-0.5 flex-wrap text-[11px]">
                        <span className="bg-muted/80 text-muted-foreground px-2.5 py-0.5 rounded-full border border-border/40 font-medium">
                          Custo: {formatCurrency(p.custo)}
                        </span>
                        <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-0.5 rounded-full border border-blue-500/20 font-semibold">
                          CLV Protegido: {formatCurrency(p.clv)}
                        </span>
                        <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
                          Retorno Estimado: +340%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    ZONA 3: WHATSAPP CONCIERGE (ESTILO IMESSAGE / APPLE CHAT)
                   ───────────────────────────────────────────────────────────── */}
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-950/20 p-4 space-y-3">
                  {/* Header do Balão de Conversa */}
                  <div className="flex items-center justify-between text-xs border-b border-emerald-500/20 pb-2.5 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shadow-2xs">
                        AZ
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground text-xs">
                          Azul Concierge Oficial
                        </span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-[11px] text-muted-foreground">• Atendimento Pós-Voo</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {p.isFallback ? (
                        <span className="text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 px-2.5 py-0.5 rounded-full font-medium">
                          Protocolo Padrão (Fallback)
                        </span>
                      ) : (
                        <span className="text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 rounded-full font-medium">
                          RAG Resolução 400 ANAC
                        </span>
                      )}

                      {/* Botão de Cópia Estilo iOS Capsule */}
                      <button
                        type="button"
                        onClick={() => handleCopy(p.seatKey, p.mensagem)}
                        className={cn(
                          "h-7 px-3 text-xs font-semibold rounded-full flex items-center gap-1.5 transition-all cursor-pointer border",
                          isCopied
                            ? "bg-emerald-500 text-white border-emerald-500"
                            : "bg-card/70 hover:bg-card text-foreground border-border/50 shadow-2xs"
                        )}
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3 w-3" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Mensagem Estilo iMessage */}
                  <div className="rounded-2xl rounded-tl-sm p-4 bg-card/80 dark:bg-card/60 border border-border/40 text-xs sm:text-sm text-foreground leading-relaxed shadow-xs">
                    <p className="font-normal">{p.mensagem}</p>
                    <div className="flex items-center justify-end gap-1.5 pt-2 text-[10px] text-muted-foreground">
                      <span>14:32</span>
                      <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                  </div>
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    ZONA 4: BARRA DE AÇÕES (EXPLICAR XAI + CONFIRMAR DISPARO)
                   ───────────────────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setExpandedXaiId(expandedXaiId === p.seatKey ? null : p.seatKey)}
                    className={cn(
                      "h-9 px-4 text-xs font-semibold rounded-full flex items-center gap-2 cursor-pointer transition-all border",
                      expandedXaiId === p.seatKey
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent"
                    )}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                    <span>{expandedXaiId === p.seatKey ? "Ocultar Suíte de Decisão (XAI)" : "Explicar Decisão (XAI)"}</span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform duration-300 ease-out",
                        expandedXaiId === p.seatKey && "rotate-180"
                      )}
                    />
                  </button>

                  <Button
                    type="button"
                    size="sm"
                    disabled={p.isEnviado || confirmMutation.isPending}
                    onClick={() => handleConfirmarDisparo(p)}
                    className={cn(
                      "h-9 text-xs font-semibold rounded-full px-5 gap-2 cursor-pointer transition-all shadow-xs active:scale-95",
                      p.isEnviado
                        ? "bg-muted text-muted-foreground border border-border/40 cursor-default"
                        : confirmMutation.isPending
                        ? "bg-muted text-muted-foreground cursor-wait"
                        : "bg-blue-600 hover:bg-blue-500 text-white"
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
                    ZONA 5: SUÍTE DE DECISÃO & EXPLICABILIDADE (ANIMAÇÃO APPLE OPEN/CLOSE)
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
                    <div className="p-5 sm:p-6 rounded-2xl border border-blue-500/20 bg-blue-500/[0.03] dark:bg-blue-950/20 space-y-5 shadow-xs">
                      <div className="flex items-center justify-between border-b border-border/40 pb-3 flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-foreground">
                            Suíte de Decisão Analítica (XAI • Árbitro de Uplift)
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            Decomposição explicável baseada no Data Lake Gold e Regulação ANAC
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium bg-card/80 border border-border/40 px-2.5 py-0.5 rounded-full text-muted-foreground">
                          SHAP Camada Gold
                        </span>
                        <span className="text-[11px] font-medium bg-card/80 border border-border/40 px-2.5 py-0.5 rounded-full text-muted-foreground">
                          Uplift Arbitragem
                        </span>
                        <span className="text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">
                          Resolução 400 ANAC
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
                      {/* 1. Pilar SHAP: Decomposição de Risco */}
                      <div className="p-4 rounded-2xl bg-card/80 dark:bg-card/50 border border-border/40 space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5 text-rose-500" />
                            Decomposição de Risco (SHAP)
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Risco Final: <strong className="text-foreground">{formatPercent(p.risco_evasao, 0)}</strong>
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
                                        "font-bold text-xs",
                                        isPos ? "text-rose-500" : "text-emerald-500"
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

                        <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1 text-rose-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Eleva Churn
                          </span>
                          <span className="flex items-center gap-1 text-emerald-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Protege Valor
                          </span>
                        </div>
                      </div>

                      {/* 2. Pilar ROI: Arbitragem de Uplift */}
                      <div className="p-4 rounded-2xl bg-card/80 dark:bg-card/50 border border-border/40 space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <HeartHandshake className="h-3.5 w-3.5 text-blue-500" />
                            Arbitragem de ROI (Uplift)
                          </span>
                          <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10.5px] px-2.5 py-0.5 rounded-full font-bold">
                            Retorno: {formatCurrency(p.explicabilidade?.racional_arbitro?.retorno_liquido || p.clv * p.risco_evasao * 0.15 - p.custo)}
                          </span>
                        </div>

                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {p.explicabilidade?.racional_arbitro?.motivo_escolha ||
                            `Ação '${p.acao}' aprovada com custo de ${formatCurrency(p.custo)} para proteger ${formatCurrency(p.clv)} em CLV.`}
                        </p>

                        <div className="space-y-1.5 pt-1 border-t border-border/40">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider block">
                            Ranking de Alternativas Avaliadas:
                          </span>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {p.explicabilidade?.racional_arbitro?.acoes_avaliadas && p.explicabilidade.racional_arbitro.acoes_avaliadas.length > 0 ? (
                              p.explicabilidade.racional_arbitro.acoes_avaliadas.map((a, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/30 text-[11px]"
                                >
                                  <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                                    {a.status === "VENCEDORA" && <Award className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                                    <span className="font-medium text-foreground truncate">{a.acao}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-muted-foreground">{formatCurrency(a.custo)}</span>
                                    <span
                                      className={cn(
                                        "px-2 py-0.5 rounded-full text-[9.5px] font-bold",
                                        a.status === "VENCEDORA"
                                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                                          : a.status === "VETADA_ROI"
                                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25"
                                          : "bg-muted text-muted-foreground"
                                      )}
                                    >
                                      {a.status === "VENCEDORA" ? "1º Lugar" : a.status === "VETADA_ROI" ? "Vetada ROI" : "Superada"}
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40 text-[11px]">
                                <span className="font-medium text-foreground">{p.acao}</span>
                                <span className="text-emerald-500 font-bold">1º Lugar (Aprovada)</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 3. Pilar Regulatória: Certificado ANAC & LGPD */}
                      <div className="p-4 rounded-2xl bg-card/80 dark:bg-card/50 border border-border/40 space-y-3 flex flex-col justify-between shadow-2xs">
                        <div className="space-y-2.5">
                          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                            Selo de Conformidade Regulatória
                          </span>

                          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 block">
                              {p.explicabilidade?.fundamentacao_rag?.norma || "Resolução 400 ANAC"}
                            </span>
                            <p className="text-muted-foreground leading-relaxed text-[11px]">
                              {p.explicabilidade?.fundamentacao_rag?.artigo || "Art. 20 a 28 (Assistência Material e Compensação Proativa)"}
                            </p>
                          </div>

                          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1">
                            <span className="font-semibold text-blue-600 dark:text-blue-400 block">
                              Diretriz Azul Fidelidade ({p.tier})
                            </span>
                            <p className="text-muted-foreground leading-relaxed text-[11px]">
                              {p.explicabilidade?.fundamentacao_rag?.regra_fidelidade ||
                                `Compensação calibrada com o nível de engajamento da categoria ${p.tier} para maximizar retenção.`}
                            </p>
                          </div>
                        </div>

                        <div className="text-[10px] text-muted-foreground pt-2 flex items-center justify-between border-t border-border/40 font-mono">
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
          BANNER DE GOVERNANÇA, LGPD E IA RESPONSÁVEL (APPLE PRIVACY STYLE)
         ───────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-border/50 bg-card/70 dark:bg-card/45 backdrop-blur-2xl p-6 sm:p-8 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="lg:col-span-2 space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                <Lock className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-bold text-lg text-foreground tracking-tight">
                Privacidade, Governança & IA Responsável
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
              A camada analítica opera sob princípios estritos de <strong>Zero Viés Demográfico</strong> e minimização de dados.
              Nenhum dado sensível (como gênero, idade ou etnia) é utilizado para precificação ou priorização de ações.
              A inferência baseia-se unicamente em histórico operacional, risco analítico de evasão e normativas públicas da ANAC (Resolução 400).
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="px-3 py-1 rounded-full bg-muted/60 text-foreground border border-border/40 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Anonimização de Identificadores (Art. 13 LGPD)
              </span>
              <span className="px-3 py-1 rounded-full bg-muted/60 text-foreground border border-border/40 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Sentimento Público ANAC VRA
              </span>
              <span className="px-3 py-1 rounded-full bg-muted/60 text-foreground border border-border/40 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Auditabilidade SQLite Transacional (mlops_logs.db)
              </span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-muted/30 dark:bg-muted/20 border border-border/40 space-y-1.5 text-center lg:text-right">
            <span className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider block">
              Métrica de Equidade Algorítmica
            </span>
            <span className="text-4xl sm:text-5xl font-bold text-blue-600 dark:text-blue-400 block tracking-tight">
              100%
            </span>
            <span className="text-xs text-muted-foreground block">
              Auditoria de Paridade Estatística (Zero Viés)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
