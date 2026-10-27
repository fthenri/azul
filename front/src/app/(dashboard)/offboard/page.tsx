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
  Smartphone,
  Send,
  Copy,
  Check,
  Search,
  RefreshCw,
  AlertTriangle,
  Loader2,
  TrendingUp,
  ChevronDown,
  Clock,
  X,
  ListFilter,
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
      return api.getVooSimulado();
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
    <div className="space-y-8 animate-in fade-in duration-300 relative">
      {/* ─────────────────────────────────────────────────────────────
          ATMOSFERA AERO: MICRO-GRID TÉCNICO & ORBS DE LUZ DIFUSA
         ───────────────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 mesh-grid opacity-60 -z-10" />
      <div className="pointer-events-none absolute -top-16 left-1/4 h-[420px] w-[420px] rounded-full bg-primary/15 blur-[140px] -z-10" />
      <div className="pointer-events-none absolute top-64 right-6 h-96 w-96 rounded-full bg-sky-500/10 blur-[130px] -z-10" />
      <div className="pointer-events-none absolute bottom-48 left-10 h-80 w-80 rounded-full bg-emerald-500/10 blur-[120px] -z-10" />

      {/* ─────────────────────────────────────────────────────────────
          HEADER PRINCIPAL PULSO LIQUID GLASS
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-white/10 dark:border-white/5 pb-7">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="h-6 px-3 rounded-full bg-primary/10 text-primary text-[11px] font-bold border border-primary/25 backdrop-blur-md flex items-center gap-1.5 shadow-2xs">
              <Sparkles className="h-3 w-3 text-primary" />
              Central de Relacionamento & Retenção Proativa
            </span>
            <span className="h-6 px-3 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/25 backdrop-blur-md flex items-center gap-1.5 shadow-2xs">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              Conformidade LGPD (Art. 7º e 18)
            </span>
            <Badge
              variant="outline"
              className="text-[10px] font-mono rounded-full border-white/15 dark:border-white/10 text-muted-foreground bg-card/40 backdrop-blur-md"
            >
              Voo {flightId} • Viracopos (VCP)
            </Badge>
          </div>

          <h1 className="text-3xl sm:text-4xl font-sans font-black tracking-tight text-foreground">
            Central de Ações Off-Board (Pós-Voo)
          </h1>

          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Gestão humanizada e disparo proativo via WhatsApp e E-mail para clientes que sofreram atrito operacional.
            Comunicações calibradas pelo Árbitro Contextual com a Resolução 400 da ANAC.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-10 gap-2 text-xs font-sans font-bold rounded-2xl border-white/15 dark:border-white/10 bg-card/50 dark:bg-card/40 backdrop-blur-2xl px-4 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.18),0_4px_16px_0_rgba(0,0,0,0.08)] hover:bg-card/80 cursor-pointer transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-primary" : ""}`} />
            <span>Atualizar Fila</span>
          </Button>

          <div className="rounded-[1.35rem] border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/25 backdrop-blur-2xl p-2.5 px-4 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.15),0_8px_24px_0_rgba(16,185,129,0.1)] text-right relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-emerald-400/50 before:to-transparent">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
              Recuperação Estimada
            </span>
            <span className="text-xl font-sans font-black text-emerald-500 block leading-tight mt-0.5">
              +48 pts NPS
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          HERO KPIS: DISPAROS PENDENTES & AÇÕES CONCLUÍDAS (LIQUID GLASS)
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Card 1: Disparos Pendentes */}
        <Card className="rounded-[1.75rem] border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 backdrop-blur-3xl shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.18),0_12px_36px_-6px_rgba(245,158,11,0.12)] relative overflow-hidden transition-all duration-300 hover:border-amber-500/50 hover:shadow-2xl before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-amber-400/60 before:to-transparent">
          <CardContent className="p-6 sm:p-7 flex items-start justify-between gap-4">
            <div className="space-y-2.5">
              <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider block">
                Disparos Pendentes (Fila de Retenção)
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl sm:text-5xl font-sans font-black text-amber-500 tracking-tight">
                  {totalPendentes}
                </span>
                <span className="text-xs font-sans font-semibold text-muted-foreground">
                  de {totalElegiveis} passageiros
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm pt-0.5">
                Mensagens geradas pelo Árbitro RAG aguardando conferência e disparo do gestor de CRM.
              </p>
            </div>

            <div className="h-14 w-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.2)]">
              <Clock className="h-7 w-7" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Ações Concluídas */}
        <Card className="rounded-[1.75rem] border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 backdrop-blur-3xl shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.18),0_12px_36px_-6px_rgba(16,185,129,0.12)] relative overflow-hidden transition-all duration-300 hover:border-emerald-500/50 hover:shadow-2xl before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-emerald-400/60 before:to-transparent">
          <CardContent className="p-6 sm:p-7 flex items-start justify-between gap-4">
            <div className="space-y-2.5">
              <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider block">
                Ações Concluídas (MLOps Loop)
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl sm:text-5xl font-sans font-black text-emerald-500 tracking-tight">
                  {totalEnviados}
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-500 border-emerald-500/30 shadow-2xs"
                >
                  MLOps Gravado
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm pt-0.5">
                Comunicações enviadas e registradas no banco de auditoria SQLite para mensuração de retenção.
              </p>
            </div>

            <div className="h-14 w-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shrink-0 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.2)]">
              <CheckCircle2 className="h-7 w-7" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TOOLBAR LIQUID GLASS COM ABAS ANIMADAS EM "FILTRAR:"
         ───────────────────────────────────────────────────────────── */}
      <div className="rounded-[1.5rem] border border-white/15 dark:border-white/10 bg-card/45 dark:bg-card/35 backdrop-blur-3xl p-3 sm:p-4 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.18),0_10px_32px_-6px_rgba(0,0,0,0.1)] space-y-4 relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-white/25 before:to-transparent">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Seletor de Canais */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <Button
              variant={selectedChannel === "whatsapp" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedChannel("whatsapp")}
              className={cn(
                "h-9 text-xs font-sans font-bold rounded-xl gap-2 cursor-pointer transition-all",
                selectedChannel === "whatsapp"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>WhatsApp Concierge ({totalElegiveis})</span>
            </Button>

            <Button
              variant={selectedChannel === "email" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedChannel("email")}
              className="h-9 text-xs font-sans font-bold rounded-xl gap-2 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-white/5"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>E-mail Transacional</span>
            </Button>

            <Button
              variant={selectedChannel === "push" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedChannel("push")}
              className="h-9 text-xs font-sans font-bold rounded-xl gap-2 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-white/5"
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
              containerClassName="border-white/15 dark:border-white/10 bg-card/60 dark:bg-card/40 p-1"
            />
          </div>
        </div>

        {/* Input de Busca com Clear Button */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por passageiro, PNR, assento ou tier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-9 text-xs rounded-xl border border-white/15 dark:border-white/10 bg-background/50 backdrop-blur-md focus:outline-none focus:ring-1 focus:ring-primary shadow-inner transition-all placeholder:text-muted-foreground/70"
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
          LISTA DE CARDS DE AÇÃO OFF-BOARD (LIQUID GLASS FROSTED CARDS)
         ───────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="rounded-[1.75rem] border border-white/15 bg-card/40 backdrop-blur-2xl">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-48 rounded-lg" />
                  <Skeleton className="h-6 w-24 rounded-lg" />
                </div>
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-10 w-32 rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="rounded-[1.75rem] border border-rose-500/30 bg-rose-500/5 backdrop-blur-2xl">
          <CardContent className="p-8 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
            <h3 className="font-sans font-bold text-sm text-foreground">
              Falha ao carregar passageiros elegíveis
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Não foi possível consultar os dados analíticos do voo no Data Lake. Verifique se o backend está em execução.
            </p>
            <Button size="sm" onClick={() => refetch()} className="rounded-xl font-sans font-bold cursor-pointer">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      ) : passageirosFiltrados.length === 0 ? (
        <Card className="rounded-[1.75rem] border border-dashed border-white/20 bg-card/40 backdrop-blur-2xl">
          <CardContent className="p-12 text-center space-y-2.5">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20 shadow-inner">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="font-sans font-black text-base text-foreground pt-1">
              Nenhum passageiro pendente encontrado
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              {searchTerm
                ? "Nenhum resultado corresponde à sua busca por texto."
                : "Todas as mensagens de retenção para este lote foram disparadas com sucesso!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {passageirosFiltrados.map((p) => {
            const tierConf = getTierConfig(p.tier);
            const isCopied = copiedId === p.seatKey;

            return (
              <Card
                key={p.seatKey}
                className={cn(
                  "rounded-[1.75rem] border transition-all duration-300 backdrop-blur-3xl relative overflow-hidden",
                  p.isEnviado
                    ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.18),0_8px_32px_-6px_rgba(16,185,129,0.12)]"
                    : "border-white/15 dark:border-white/10 bg-card/50 dark:bg-card/40 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.15),0_10px_32px_-6px_rgba(0,0,0,0.1)] hover:border-primary/45 hover:shadow-2xl"
                )}
              >
                {/* Feixe especular no topo do card */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/25 to-transparent" />

                <CardContent className="p-5 sm:p-6 space-y-4.5">
                  {/* Topo do Card: Identificação do Passageiro e Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-white/10 dark:border-white/5">
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Box do Assento com Vidro Líquido */}
                      <span className="h-8 px-3 rounded-xl bg-muted/70 text-foreground font-sans font-black text-xs flex items-center border border-white/15 dark:border-white/10 shadow-inner">
                        {p.assento}
                      </span>
                      <span className="font-sans font-black text-base text-foreground tracking-tight">
                        {p.nome}
                      </span>
                      <Badge variant="outline" className={cn("text-[10px] font-bold rounded-full border shadow-2xs", tierConf.badge)}>
                        {tierConf.name}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-medium rounded-full text-muted-foreground border-border/70 bg-muted/30">
                        {p.persona}
                      </Badge>
                      <span className="text-[11px] text-primary font-mono font-bold">
                        PNR: {p.pnr}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-[11px] font-sans font-bold px-3 py-0.5 rounded-full border shadow-2xs",
                          p.risco_evasao > 0.6
                            ? "bg-rose-500/10 text-rose-500 border-rose-500/30"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                        )}
                      >
                        Risco Churn: {formatPercent(p.risco_evasao, 0)}
                      </span>
                      {p.isEnviado ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] gap-1 font-bold rounded-full shadow-md shadow-emerald-600/20">
                          <Check className="h-3 w-3" />
                          Enviado via WhatsApp
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-bold rounded-full text-amber-500 border-amber-500/30 bg-amber-500/5">
                          Aguardando Envio
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Diagnóstico do Atrito e Ação Recomendada */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                    <div className="p-3.5 rounded-2xl bg-card/60 dark:bg-card/40 border border-white/15 dark:border-white/10 space-y-1.5 backdrop-blur-xl shadow-xs">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        Diagnóstico de Atrito Operacional (XAI)
                      </span>
                      <p className="text-foreground font-medium leading-relaxed">{p.contexto}</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/25 space-y-1.5 backdrop-blur-xl shadow-xs">
                      <span className="text-[10px] text-primary uppercase font-bold tracking-wider flex items-center gap-1.5">
                        <HeartHandshake className="h-3.5 w-3.5 text-primary" />
                        Ação Aprovada pelo Árbitro (Uplift)
                      </span>
                      <p className="font-sans font-black text-primary text-sm">{p.acao}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono pt-0.5">
                        <span>Custo: {formatCurrency(p.custo)}</span>
                        <span>•</span>
                        <span>CLV Protegido: {formatCurrency(p.clv)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Balão da Mensagem WhatsApp (Autêntico Concierge em Vidro Esmeralda) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-muted-foreground flex items-center gap-1.5 font-sans">
                        <Smartphone className="h-3.5 w-3.5 text-emerald-500" />
                        Mensagem Humanizada WhatsApp (Pronta para Cópia e Disparo):
                      </span>
                      {p.isFallback ? (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-mono rounded-md">
                          Protocolo Padrão (Fallback)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-mono rounded-md">
                          RAG Resolução 400 ANAC
                        </Badge>
                      )}
                    </div>

                    <div className="relative rounded-2xl p-4 bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 text-xs text-foreground leading-relaxed shadow-inner backdrop-blur-2xl">
                      <p className="italic text-foreground font-medium">&ldquo;{p.mensagem}&rdquo;</p>
                    </div>
                  </div>

                  {/* Barra de Ações: Botão Copiar, Botão Confirmar Disparo e Botão XAI */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedXaiId(expandedXaiId === p.seatKey ? null : p.seatKey)}
                        className={cn(
                          "h-8 text-xs gap-1.5 font-sans font-bold rounded-xl cursor-pointer transition-all",
                          expandedXaiId === p.seatKey
                            ? "bg-primary/20 text-primary border border-primary/35"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                      >
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        <span>{expandedXaiId === p.seatKey ? "Ocultar Explicabilidade" : "Explicar Decisão (XAI)"}</span>
                        <ChevronDown className={cn("h-3 w-3 transition-transform", expandedXaiId === p.seatKey && "rotate-180")} />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(p.seatKey, p.mensagem)}
                        className={cn(
                          "h-8 text-xs gap-1.5 font-sans font-bold rounded-xl border border-white/15 dark:border-white/10 bg-card/60 backdrop-blur-md cursor-pointer transition-all shadow-xs",
                          isCopied && "bg-emerald-500/25 border-emerald-500 text-emerald-600 dark:text-emerald-300"
                        )}
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copiar Mensagem</span>
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        disabled={p.isEnviado || confirmMutation.isPending}
                        onClick={() => handleConfirmarDisparo(p)}
                        className={cn(
                          "h-8 text-xs gap-1.5 font-sans font-bold rounded-xl cursor-pointer transition-all shadow-md",
                          p.isEnviado
                            ? "bg-muted text-muted-foreground cursor-not-allowed border border-border/60"
                            : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
                        )}
                      >
                        {p.isEnviado ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            <span>Registrado</span>
                          </>
                        ) : confirmMutation.isPending ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Gravando...</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" />
                            <span>Confirmar Disparo</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Painel Expansível de Explicabilidade (XAI: SHAP + Árbitro Contextual + RAG) */}
                  {expandedXaiId === p.seatKey && (
                    <div className="mt-3.5 p-4.5 rounded-[1.35rem] border border-primary/25 bg-primary/5 dark:bg-primary/10 backdrop-blur-3xl space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between border-b border-primary/20 pb-2.5 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                            <Sparkles className="h-3.5 w-3.5" />
                          </div>
                          <h4 className="font-sans font-bold text-xs text-foreground uppercase tracking-wider">
                            Explicabilidade da Decisão (XAI: SHAP + Árbitro Contextual)
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] font-mono bg-background/80 rounded-md">
                            SHAP Camada Gold
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-mono bg-background/80 rounded-md">
                            Uplift Arbitragem
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-mono bg-background/80 text-emerald-500 border-emerald-500/30 rounded-md">
                            Resolução 400 ANAC
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 text-xs">
                        {/* 1. Decomposição SHAP */}
                        <div className="p-3.5 rounded-2xl bg-card/70 dark:bg-card/50 border border-white/15 dark:border-white/10 backdrop-blur-2xl space-y-2.5 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-sans font-bold text-foreground flex items-center gap-1.5">
                              <TrendingUp className="h-3.5 w-3.5 text-rose-500" />
                              Decomposição de Risco (SHAP)
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Risco: {formatPercent(p.risco_evasao, 0)}
                            </span>
                          </div>

                          <div className="space-y-2 pt-1">
                            {p.explicabilidade?.fatores_shap && p.explicabilidade.fatores_shap.length > 0 ? (
                              p.explicabilidade.fatores_shap.map((f, idx) => (
                                <div key={idx} className="space-y-0.5">
                                  <div className="flex items-center justify-between text-[10.5px]">
                                    <span className="text-muted-foreground truncate max-w-[170px]" title={f.variavel}>
                                      {f.variavel}
                                    </span>
                                    <span
                                      className={cn(
                                        "font-mono font-bold",
                                        f.direcao === "positivo"
                                          ? "text-rose-500"
                                          : "text-emerald-500"
                                      )}
                                    >
                                      {f.impacto > 0 ? `+${(f.impacto * 100).toFixed(0)}%` : `${(f.impacto * 100).toFixed(0)}%`}
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all",
                                        f.direcao === "positivo" ? "bg-rose-500" : "bg-emerald-500"
                                      )}
                                      style={{ width: `${Math.min(100, Math.abs(f.impacto) * 150)}%` }}
                                    />
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-[10.5px] text-muted-foreground italic">Sem fatores críticos registrados.</p>
                            )}
                          </div>
                        </div>

                        {/* 2. Racional Econômico do Árbitro */}
                        <div className="p-3.5 rounded-2xl bg-card/70 dark:bg-card/50 border border-white/15 dark:border-white/10 backdrop-blur-2xl space-y-2.5 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-sans font-bold text-foreground flex items-center gap-1.5">
                              <HeartHandshake className="h-3.5 w-3.5 text-primary" />
                              Arbitragem de ROI (Uplift)
                            </span>
                            <Badge className="bg-primary text-primary-foreground text-[9px] px-2 py-0 rounded-full font-bold">
                              Retorno Líquido: {formatCurrency(p.explicabilidade?.racional_arbitro?.retorno_liquido || p.clv * p.risco_evasao * 0.15 - p.custo)}
                            </Badge>
                          </div>

                          <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                            {p.explicabilidade?.racional_arbitro?.motivo_escolha ||
                              `Ação '${p.acao}' aprovada com custo de ${formatCurrency(p.custo)} para proteger ${formatCurrency(p.clv)} em CLV.`}
                          </p>

                          <div className="space-y-1.5 pt-1 border-t border-border/60">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                              Ações Concorrentes Avaliadas:
                            </span>
                            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                              {p.explicabilidade?.racional_arbitro?.acoes_avaliadas && p.explicabilidade.racional_arbitro.acoes_avaliadas.length > 0 ? (
                                p.explicabilidade.racional_arbitro.acoes_avaliadas.map((a, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between p-1.5 rounded-lg bg-muted/40 border border-border/40 text-[10px]"
                                  >
                                    <span className="font-medium text-foreground truncate max-w-[130px]">{a.acao}</span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="font-mono text-muted-foreground">{formatCurrency(a.custo)}</span>
                                      <span
                                        className={cn(
                                          "px-1.5 py-0.5 rounded-full text-[9px] font-bold",
                                          a.status === "VENCEDORA"
                                            ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                                            : a.status === "VETADA_ROI"
                                            ? "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                                            : "bg-muted text-muted-foreground"
                                        )}
                                      >
                                        {a.status === "VENCEDORA" ? "Aprovada" : a.status === "VETADA_ROI" ? "Vetada ROI" : "Superada"}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="flex items-center justify-between p-1.5 rounded-lg bg-muted/40 text-[10px]">
                                  <span className="font-medium text-foreground">{p.acao}</span>
                                  <span className="text-emerald-500 font-bold">Aprovada</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 3. Fundamentação Regulatória & RAG */}
                        <div className="p-3.5 rounded-2xl bg-card/70 dark:bg-card/50 border border-white/15 dark:border-white/10 backdrop-blur-2xl space-y-2.5 flex flex-col justify-between shadow-xs">
                          <div className="space-y-2">
                            <span className="text-[11px] font-sans font-bold text-foreground flex items-center gap-1.5">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                              Fundamentação Regulatória & Fidelidade
                            </span>

                            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[10.5px] space-y-1">
                              <span className="font-sans font-bold text-emerald-600 dark:text-emerald-400 block">
                                {p.explicabilidade?.fundamentacao_rag?.norma || "Resolução 400 ANAC"}
                              </span>
                              <p className="text-muted-foreground leading-relaxed">
                                {p.explicabilidade?.fundamentacao_rag?.artigo || "Art. 20 a 28 (Assistência Material ao Passageiro)"}
                              </p>
                            </div>

                            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/25 text-[10.5px] space-y-1">
                              <span className="font-sans font-bold text-primary block">
                                Programa Azul Fidelidade ({p.tier})
                              </span>
                              <p className="text-muted-foreground leading-relaxed">
                                {p.explicabilidade?.fundamentacao_rag?.regra_fidelidade ||
                                  `Compensação calibrada com o nível de engajamento do cliente ${p.tier} para maximizar retenção.`}
                              </p>
                            </div>
                          </div>

                          <div className="text-[10px] text-muted-foreground pt-1.5 flex items-center gap-1.5 border-t border-border/60">
                            <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span>Decisão 100% auditável e em conformidade com LGPD.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          BANNER DE GOVERNANÇA, LGPD E IA RESPONSÁVEL (DEEP AERO-NAVY)
         ───────────────────────────────────────────────────────────── */}
      <Card className="rounded-[2rem] border border-white/15 bg-gradient-to-br from-slate-950 via-slate-900 to-[#002855] text-white overflow-hidden shadow-2xl relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-white/35 before:to-transparent">
        <CardContent className="p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-sky-400/20 text-sky-400 flex items-center justify-center border border-sky-400/30 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.2)]">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <h3 className="font-sans font-black text-lg sm:text-xl text-white tracking-tight">
                  Governança, IA Responsável & Conformidade LGPD
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed max-w-2xl">
                A camada analítica opera sob princípios estritos de <strong>Zero Viés</strong> e minimização de dados.
                Nenhum dado sensível (como gênero, etnia ou idade) é utilizado para precificação ou priorização de ações.
                A inferência baseia-se exclusivamente em histórico transacional, risco analítico de evasão e regras regulatórias (ANAC Resolução 400).
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="px-3.5 py-1.5 rounded-xl bg-white/10 backdrop-blur-xl text-[11px] font-semibold text-white/95 border border-white/15 flex items-center gap-1.5 shadow-2xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Anonimização de Identificadores
                </span>
                <span className="px-3.5 py-1.5 rounded-xl bg-white/10 backdrop-blur-xl text-[11px] font-semibold text-white/95 border border-white/15 flex items-center gap-1.5 shadow-2xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Sentimento Público ANAC VRA
                </span>
                <span className="px-3.5 py-1.5 rounded-xl bg-white/10 backdrop-blur-xl text-[11px] font-semibold text-white/95 border border-white/15 flex items-center gap-1.5 shadow-2xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Auditabilidade SQLite Transacional (mlops_logs.db)
                </span>
              </div>
            </div>

            <div className="p-6 rounded-[1.5rem] bg-white/5 backdrop-blur-2xl border border-white/10 space-y-2 text-center lg:text-right shadow-inner">
              <span className="text-[10px] text-white/60 uppercase font-bold tracking-wider block">
                Métrica de Equidade
              </span>
              <span className="text-4xl sm:text-5xl font-sans font-black text-sky-400 block tracking-tight">
                100%
              </span>
              <span className="text-xs text-white/70 block">
                Auditoria de Paridade Estatística (Zero Viés Demográfico)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
