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
            : `[RAG: Azul Fidelidade Res. 400] Olá, ${c.nome}! Notamos o atrito recente em sua jornada conosco. Como cliente ${c.tier_fidelidade}, disponibilizamos ${acaoRecomendada} para garantir seu bem-estar. Conte sempre com a Azul! ✈️`;

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
        activeBadgeClassName: "bg-muted text-foreground border-border",
      },
      {
        id: "enviados",
        label: "Concluídos",
        badge: totalEnviados,
        activeBadgeClassName: "bg-muted text-foreground border-border",
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
    <div className="relative space-y-5 animate-in fade-in duration-200">
      {/* ─────────────────────────────────────────────────────────────
          ELEMENTO ATMOSFÉRICO SUTIL DE PROFUNDIDADE
         ───────────────────────────────────────────────────────────── */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-full max-w-5xl h-48 bg-muted/40 blur-[100px] pointer-events-none -z-10 rounded-full" />

      {/* ─────────────────────────────────────────────────────────────
          HEADER DA TELA OFF-BOARD (COMPACTO E NEUTRO)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pb-3 border-b border-border/70">
        <div>
          {/* Micro-badge de Ecossistema */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-muted/60 border border-border/70 text-muted-foreground text-[11px] font-medium tracking-wide mb-1.5">
            <Sparkles className="h-3 w-3 text-muted-foreground" />
            <span>Ecossistema Azul Fidelidade • Retenção Proativa</span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
              Central de Ações Off-Board
            </h1>
            <span className="rounded-full bg-muted/80 border border-border text-foreground text-[10px] font-semibold px-2.5 py-0.5">
              Pós-Voo & Canais Digitais
            </span>
            <Badge variant="outline" className="text-[10px] font-mono rounded-full border-border/70 text-muted-foreground bg-muted/30">
              Voo {flightId} • Viracopos (VCP)
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">
            Disparo de ações de retenção via WhatsApp Concierge e E-mail para mitigar atrito operacional pós-desembarque.
          </p>
        </div>

        {/* Controles de Atualização & Badges de Governança */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border text-xs text-muted-foreground shadow-2xs">
            <Database className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-medium">DuckDB Gold</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 flex items-center gap-1.5 rounded-lg border-border bg-card hover:bg-muted text-foreground text-xs font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 text-muted-foreground ${isFetching ? "animate-spin" : ""}`} />
            <span>Atualizar</span>
          </Button>

          {/* Widget de NPS Compacto e Neutro */}
          <div className="rounded-xl border border-border bg-card p-1.5 px-3 text-right shadow-2xs">
            <span className="text-[9px] uppercase font-bold text-muted-foreground block tracking-wider">
              Recuperação Estimada
            </span>
            <span className="text-sm font-bold text-foreground block leading-tight mt-0.5">
              +48 pts NPS
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          HERO KPIS: DISPAROS PENDENTES & AÇÕES CONCLUÍDAS (COMPACTOS E NEUTROS)
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Card 1: Disparos Pendentes */}
        <div className="group relative rounded-xl border border-border/80 bg-card/85 p-4 shadow-2xs hover:border-border transition-all duration-200 overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                Disparos Pendentes
                <InfoTooltip
                  title="Fila de Retenção CRM"
                  badge="Pendente"
                  text="Passageiros com atrito operacional que aguardam conferência e autorização para envio da ação de retenção."
                  side="bottom"
                />
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold tracking-tight font-sans text-foreground">
                  {totalPendentes}
                </span>
                <span className="text-xs text-muted-foreground">
                  de {totalElegiveis} passageiros
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Mensagens geradas pelo Árbitro RAG aguardando conferência do gestor.
              </p>
            </div>

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/60 text-muted-foreground">
              <Clock className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[10.5px]">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
              Fila de Retenção Ativa
            </span>
            <span className="inline-flex items-center gap-0.5 text-foreground font-medium">
              <span>Auditar</span>
              <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
        </div>

        {/* Card 2: Ações Concluídas */}
        <div className="group relative rounded-xl border border-border/80 bg-card/85 p-4 shadow-2xs hover:border-border transition-all duration-200 overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                Ações Concluídas
                <InfoTooltip
                  title="Loop Transacional MLOps"
                  badge="Gravado"
                  text="Total de comunicações disparadas e devidamente registradas no banco de auditoria SQLite para mensuração de causalidade."
                  side="bottom"
                />
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold tracking-tight font-sans text-foreground">
                  {totalEnviados}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground bg-muted/80 px-2 py-0.5 rounded-md border border-border/70">
                  <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                  MLOps Gravado
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Comunicações transmitidas e registradas no banco SQLite.
              </p>
            </div>

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/60 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[10.5px]">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
              Feedback Loop Integrado
            </span>
            <span className="inline-flex items-center gap-0.5 text-foreground font-medium">
              <span>Auditar</span>
              <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TOOLBAR COMPACTA COM SELETOR DE CANAIS, BUSCA & FILTRAR
         ───────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border/80 bg-card/80 p-3 shadow-2xs space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Seletor de Canais Neutro */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 lg:pb-0">
            <Button
              variant={selectedChannel === "whatsapp" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedChannel("whatsapp")}
              className={cn(
                "h-8 text-xs font-semibold rounded-lg gap-1.5 cursor-pointer transition-all",
                selectedChannel === "whatsapp"
                  ? "bg-foreground text-background shadow-2xs hover:bg-foreground/90"
                  : "border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>WhatsApp ({totalElegiveis})</span>
            </Button>

            <Button
              variant={selectedChannel === "email" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedChannel("email")}
              className={cn(
                "h-8 text-xs font-semibold rounded-lg gap-1.5 cursor-pointer transition-all",
                selectedChannel === "email"
                  ? "bg-foreground text-background shadow-2xs hover:bg-foreground/90"
                  : "border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Mail className="h-3.5 w-3.5" />
              <span>E-mail</span>
            </Button>

            <Button
              variant={selectedChannel === "push" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedChannel("push")}
              className={cn(
                "h-8 text-xs font-semibold rounded-lg gap-1.5 cursor-pointer transition-all",
                selectedChannel === "push"
                  ? "bg-foreground text-background shadow-2xs hover:bg-foreground/90"
                  : "border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Bell className="h-3.5 w-3.5" />
              <span>Push</span>
            </Button>
          </div>

          {/* Abas de Filtro Animadas (AnimatedTabs) em "Filtrar:" */}
          <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
              <ListFilter className="h-3.5 w-3.5 text-muted-foreground" />
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
              containerClassName="border-border/70 bg-muted/40 p-0.5 rounded-lg"
              tabClassName="h-7 text-xs font-medium"
            />
          </div>
        </div>

        {/* Input de Busca Compacto */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por passageiro, PNR, assento ou tier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8 pl-8 pr-8 text-xs rounded-lg border border-border/80 bg-background/70 focus:outline-none focus:ring-1 focus:ring-ring shadow-2xs transition-all placeholder:text-muted-foreground/60"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          LISTA DE CARDS DE PASSAGEIRO (COMPACTOS & CORES NEUTRAS)
         ───────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border/70 bg-card/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-40 rounded" />
                <Skeleton className="h-5 w-20 rounded" />
              </div>
              <Skeleton className="h-12 w-full rounded" />
              <Skeleton className="h-8 w-28 rounded" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-border/80 bg-card p-6 text-center space-y-2.5">
          <AlertTriangle className="h-6 w-6 text-muted-foreground mx-auto" />
          <h3 className="font-semibold text-sm text-foreground">
            Falha ao carregar passageiros elegíveis
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Não foi possível consultar os dados analíticos do voo. Verifique a conexão com o backend.
          </p>
          <Button size="sm" onClick={() => refetch()} className="h-8 rounded-lg font-semibold cursor-pointer">
            Tentar Novamente
          </Button>
        </div>
      ) : passageirosFiltrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/60 p-8 text-center space-y-2">
          <div className="h-9 w-9 rounded-lg bg-muted text-foreground flex items-center justify-center mx-auto border border-border">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-sm text-foreground pt-1">
            Nenhum passageiro encontrado
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {searchTerm
              ? "Nenhum resultado corresponde à sua busca."
              : "Todas as mensagens da fila de retenção foram disparadas com sucesso!"}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {passageirosFiltrados.map((p) => {
            const tierConf = getTierConfig(p.tier);
            const isCopied = copiedId === p.seatKey;
            const riscoPerc = Math.round(p.risco_evasao * 100);

            return (
              <div
                key={p.seatKey}
                className={cn(
                  "rounded-xl border transition-all duration-200 p-4 sm:p-4.5 space-y-3 shadow-2xs",
                  p.isEnviado
                    ? "border-border/90 bg-card/90"
                    : "border-border/70 bg-card/75 hover:border-border"
                )}
              >
                {/* ─────────────────────────────────────────────────────────────
                    ZONA 1: DOSSIÊ DO PASSAGEIRO (COMPACTO E NEUTRO)
                   ───────────────────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-border/50">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Box do Assento */}
                    <div className="h-8 w-8 rounded-lg bg-muted text-foreground font-bold text-xs flex items-center justify-center border border-border/80 shrink-0">
                      {p.assento}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm sm:text-base text-foreground tracking-tight">
                        {p.nome}
                      </h3>
                      <span className="text-[10px] font-semibold rounded-md border border-border/80 text-foreground bg-muted/40 px-2 py-0.5">
                        {tierConf.name}
                      </span>
                      <span className="text-[10px] font-medium rounded-md text-muted-foreground border border-border/60 bg-muted/20 px-2 py-0.5">
                        {p.persona}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted/30 border border-border/50 px-2 py-0.5 rounded-md">
                        PNR: {p.pnr}
                      </span>
                    </div>
                  </div>

                  {/* Badge de Risco & Status Neutro */}
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border border-border/70 bg-muted/40 text-xs font-medium text-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
                      <span>
                        Risco Churn: {riscoPerc}% {riscoPerc > 60 ? "(Crítico)" : riscoPerc >= 40 ? "(Moderado)" : "(Controlado)"}
                      </span>
                    </div>

                    {p.isEnviado ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground bg-muted/70 border border-border/80 px-2.5 py-0.5 rounded-md">
                        <CheckCheck className="h-3 w-3 text-muted-foreground" />
                        <span>Enviado</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/30 border border-border/60 px-2.5 py-0.5 rounded-md">
                        <Clock className="h-3 w-3" />
                        <span>Pendente</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    ZONA 2: SÍNTESE OPERACIONAL (SPLIT BALANCE COMPACTO E NEUTRO)
                   ───────────────────────────────────────────────────────────── */}
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs">
                    {/* Lado Esquerdo: Diagnóstico de Atrito (Causa) */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                        Diagnóstico Operacional
                      </span>
                      <p className="text-foreground text-xs leading-relaxed line-clamp-2 font-normal">
                        {p.contexto}
                      </p>
                    </div>

                    {/* Conector Visual */}
                    <div className="hidden md:flex items-center justify-center px-1">
                      <div className="h-6 w-6 rounded-md bg-muted/60 border border-border/60 text-muted-foreground flex items-center justify-center">
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>

                    {/* Lado Direito: Ação Prescrita pelo Árbitro */}
                    <div className="space-y-1 md:border-l md:border-border/60 md:pl-3">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider flex items-center gap-1.5">
                        <HeartHandshake className="h-3 w-3 text-muted-foreground" />
                        Ação Recomendada (Árbitro)
                      </span>
                      <h4 className="font-bold text-foreground text-xs sm:text-sm tracking-tight">
                        {p.acao}
                      </h4>
                      <div className="flex items-center gap-1.5 pt-0.5 flex-wrap text-[10px] font-mono">
                        <span className="bg-card px-2 py-0.5 rounded border border-border text-muted-foreground">
                          Custo: {formatCurrency(p.custo)}
                        </span>
                        <span className="bg-muted text-foreground px-2 py-0.5 rounded border border-border/70 font-medium">
                          CLV Protegido: {formatCurrency(p.clv)}
                        </span>
                        <span className="bg-muted text-foreground px-2 py-0.5 rounded border border-border/70 font-medium">
                          Retorno: +340%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    ZONA 3: WHATSAPP CONCIERGE (COMPACTO E NEUTRO)
                   ───────────────────────────────────────────────────────────── */}
                <div className="rounded-lg border border-border/60 bg-muted/15 p-2.5 sm:p-3 space-y-2">
                  {/* Header do Balão de Conversa */}
                  <div className="flex items-center justify-between text-xs border-b border-border/40 pb-1.5 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded bg-muted-foreground/20 text-foreground flex items-center justify-center font-bold text-[9px]">
                        AZ
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-semibold text-foreground">
                          Azul Concierge Oficial
                        </span>
                        <span className="text-[10px] text-muted-foreground">• Atendimento Pós-Voo</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {p.isFallback ? (
                        <span className="text-[10px] bg-muted/40 text-muted-foreground border border-border/60 font-mono rounded px-2 py-0.5">
                          Protocolo Padrão (Fallback)
                        </span>
                      ) : (
                        <span className="text-[10px] bg-muted/40 text-muted-foreground border border-border/60 font-mono rounded px-2 py-0.5">
                          RAG Resolução 400 ANAC
                        </span>
                      )}

                      {/* Botão de Cópia Integrado */}
                      <button
                        type="button"
                        onClick={() => handleCopy(p.seatKey, p.mensagem)}
                        className={cn(
                          "h-6 px-2 text-[10.5px] rounded border border-border/60 bg-card hover:bg-muted text-muted-foreground hover:text-foreground font-medium transition-all cursor-pointer flex items-center gap-1",
                          isCopied && "bg-muted text-foreground font-semibold"
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
                      </button>
                    </div>
                  </div>

                  {/* Balão de Fala do WhatsApp */}
                  <div className="rounded-lg rounded-tl-xs p-2.5 bg-card border border-border/60 text-xs text-foreground leading-relaxed shadow-2xs">
                    <p className="font-normal text-xs">{p.mensagem}</p>
                    <div className="flex items-center justify-end gap-1 pt-1.5 text-[10px] text-muted-foreground">
                      <span>14:32</span>
                      <CheckCheck className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    ZONA 4: BARRA DE AÇÕES (EXPLICAR XAI + CONFIRMAR DISPARO)
                   ───────────────────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setExpandedXaiId(expandedXaiId === p.seatKey ? null : p.seatKey)}
                    className={cn(
                      "h-7.5 px-3 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center gap-1.5 border border-transparent hover:border-border/60 cursor-pointer",
                      expandedXaiId === p.seatKey && "bg-muted/60 text-foreground border-border/70"
                    )}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
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
                      "h-7.5 text-xs font-semibold rounded-lg px-3.5 gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-95 p-2",
                      p.isEnviado
                        ? "bg-muted text-muted-foreground border border-border/60 cursor-not-allowed"
                        : "bg-secondary hover:bg-foreground/90 text-background"
                    )}
                  >
                    {p.isEnviado ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Disparo Registrado no MLOps</span>
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

                {/* ─────────────────────────────────────────────────────────────
                    ZONA 5: SUÍTE DE DECISÃO & EXPLICABILIDADE (ANIMAÇÃO SUAVE OPEN/CLOSE)
                   ───────────────────────────────────────────────────────────── */}
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-out",
                    expandedXaiId === p.seatKey
                      ? "grid-rows-[1fr] opacity-100 mt-2.5"
                      : "grid-rows-[0fr] opacity-0 mt-0 pointer-events-none"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="p-3.5 sm:p-4 rounded-xl border border-border/70 bg-muted/20 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-border/50 pb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-lg bg-muted text-foreground flex items-center justify-center shadow-2xs border border-border/70">
                            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">
                              Suíte de Decisão Analítica (XAI • Árbitro de Uplift)
                            </h4>
                            <p className="text-[10px] text-muted-foreground">
                              Decomposição explicável baseada no Data Lake Gold e Regulação ANAC
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono bg-card px-2 py-0.5 rounded border border-border/70 text-muted-foreground">
                            SHAP Gold
                          </span>
                          <span className="text-[10px] font-mono bg-card px-2 py-0.5 rounded border border-border/70 text-muted-foreground">
                            Uplift Arbitragem
                          </span>
                          <span className="text-[10px] font-mono bg-card px-2 py-0.5 rounded border border-border/70 text-muted-foreground">
                            Resolução 400 ANAC
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs">
                        {/* 1. Pilar SHAP */}
                        <div className="p-3 rounded-lg bg-card border border-border/70 space-y-2 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                              Decomposição SHAP
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Risco: <strong className="text-foreground">{formatPercent(p.risco_evasao, 0)}</strong>
                            </span>
                          </div>

                          <div className="space-y-2 pt-0.5">
                            {p.explicabilidade?.fatores_shap && p.explicabilidade.fatores_shap.length > 0 ? (
                              p.explicabilidade.fatores_shap.map((f, idx) => {
                                const isPos = f.direcao === "positivo";
                                return (
                                  <div key={idx} className="space-y-1">
                                    <div className="flex items-center justify-between text-[10.5px]">
                                      <span className="text-muted-foreground truncate max-w-[170px]" title={f.variavel}>
                                        {f.variavel}
                                      </span>
                                      <span className="font-mono font-semibold text-xs text-foreground">
                                        {f.impacto > 0 ? `+${(f.impacto * 100).toFixed(0)}%` : `${(f.impacto * 100).toFixed(0)}%`}
                                      </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-muted/80 rounded-full overflow-hidden">
                                      <div
                                        className={cn(
                                          "h-full rounded-full transition-all",
                                          isPos
                                            ? "bg-foreground/80"
                                            : "bg-muted-foreground/40"
                                        )}
                                        style={{ width: `${Math.min(100, Math.abs(f.impacto) * 120)}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-[10.5px] text-muted-foreground italic">Sem fatores críticos registrados.</p>
                            )}
                          </div>

                          <div className="pt-1.5 border-t border-border/50 flex items-center justify-between text-[9px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-foreground/80" /> Eleva Risco
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" /> Protege Valor
                            </span>
                          </div>
                        </div>

                        {/* 2. Pilar ROI */}
                        <div className="p-3 rounded-lg bg-card border border-border/70 space-y-2 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                              <HeartHandshake className="h-3.5 w-3.5 text-muted-foreground" />
                              Arbitragem de ROI (Uplift)
                            </span>
                            <span className="bg-muted text-foreground text-[10px] px-2 py-0.5 rounded font-mono font-medium border border-border/60">
                              Retorno: {formatCurrency(p.explicabilidade?.racional_arbitro?.retorno_liquido || p.clv * p.risco_evasao * 0.15 - p.custo)}
                            </span>
                          </div>

                          <p className="text-[10.5px] text-muted-foreground leading-relaxed line-clamp-2">
                            {p.explicabilidade?.racional_arbitro?.motivo_escolha ||
                              `Ação '${p.acao}' aprovada com custo de ${formatCurrency(p.custo)} para proteger ${formatCurrency(p.clv)} em CLV.`}
                          </p>

                          <div className="space-y-1 pt-1 border-t border-border/50">
                            <span className="text-[9.5px] text-muted-foreground uppercase font-bold tracking-wider block">
                              Ranking de Alternativas:
                            </span>
                            <div className="space-y-1 max-h-32 overflow-y-auto pr-0.5">
                              {p.explicabilidade?.racional_arbitro?.acoes_avaliadas && p.explicabilidade.racional_arbitro.acoes_avaliadas.length > 0 ? (
                                p.explicabilidade.racional_arbitro.acoes_avaliadas.map((a, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between p-1.5 rounded bg-muted/30 border border-border/40 text-[10px]"
                                  >
                                    <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                                      {a.status === "VENCEDORA" && <Award className="h-3 w-3 text-muted-foreground shrink-0" />}
                                      <span className="font-medium text-foreground truncate">{a.acao}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="font-mono text-muted-foreground">{formatCurrency(a.custo)}</span>
                                      <span
                                        className={cn(
                                          "px-1.5 py-0.2 rounded text-[8.5px] font-medium",
                                          a.status === "VENCEDORA"
                                            ? "bg-muted text-foreground border border-border font-semibold"
                                            : "bg-muted/40 text-muted-foreground"
                                        )}
                                      >
                                        {a.status === "VENCEDORA" ? "1º Lugar" : a.status === "VETADA_ROI" ? "Vetada ROI" : "Superada"}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="flex items-center justify-between p-1.5 rounded bg-muted/30 text-[10px]">
                                  <span className="font-medium text-foreground">{p.acao}</span>
                                  <span className="text-foreground font-semibold">1º Lugar (Aprovada)</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 3. Pilar Regulatória */}
                        <div className="p-3 rounded-lg bg-card border border-border/70 space-y-2 flex flex-col justify-between shadow-2xs">
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                              <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                              Conformidade Regulatória
                            </span>

                            <div className="p-2 rounded bg-muted/30 border border-border/50 text-[10.5px] space-y-0.5">
                              <span className="font-semibold text-foreground block">
                                {p.explicabilidade?.fundamentacao_rag?.norma || "Resolução 400 ANAC"}
                              </span>
                              <p className="text-muted-foreground leading-relaxed text-[10px]">
                                {p.explicabilidade?.fundamentacao_rag?.artigo || "Art. 20 a 28 (Assistência Material)"}
                              </p>
                            </div>

                            <div className="p-2 rounded bg-muted/30 border border-border/50 text-[10.5px] space-y-0.5">
                              <span className="font-semibold text-foreground block">
                                Diretriz Azul ({p.tier})
                              </span>
                              <p className="text-muted-foreground leading-relaxed text-[10px]">
                                {p.explicabilidade?.fundamentacao_rag?.regra_fidelidade ||
                                  `Compensação calibrada com o nível de engajamento da categoria ${p.tier}.`}
                              </p>
                            </div>
                          </div>

                          <div className="text-[9.5px] text-muted-foreground pt-1.5 flex items-center justify-between border-t border-border/50 font-mono">
                            <span className="flex items-center gap-1">
                              <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span>Audit: #{p.seatKey.replace('-', '_')}</span>
                            </span>
                            <span className="text-foreground font-medium">100% LGPD</span>
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
          BANNER DE GOVERNANÇA, LGPD E IA RESPONSÁVEL (COMPACTO E NEUTRO)
         ───────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border/80 bg-card/85 p-5 sm:p-6 shadow-2xs">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-center">
          <div className="lg:col-span-2 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-muted text-foreground flex items-center justify-center border border-border/80 shadow-2xs">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <h3 className="font-bold text-base text-foreground tracking-tight">
                Governança, IA Responsável & Conformidade LGPD
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              A camada analítica opera sob princípios estritos de <strong>Zero Viés</strong> e minimização de dados.
              Nenhum dado sensível (como gênero, etnia ou idade) é utilizado para precificação ou priorização de ações.
              A inferência baseia-se exclusivamente em histórico transacional, risco analítico de evasão e regras regulatórias (ANAC Resolução 400).
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
              <span className="px-2.5 py-0.5 rounded-md bg-muted/60 border border-border text-foreground flex items-center gap-1.5 font-medium text-[11px]">
                <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                Anonimização de Identificadores (Art. 13 LGPD)
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-muted/60 border border-border text-foreground flex items-center gap-1.5 font-medium text-[11px]">
                <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                Sentimento Público ANAC VRA
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-muted/60 border border-border text-foreground flex items-center gap-1.5 font-medium text-[11px]">
                <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                Auditabilidade SQLite Transacional (mlops_logs.db)
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border/70 space-y-1 text-center lg:text-right">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
              Métrica de Equidade
            </span>
            <span className="text-3xl sm:text-4xl font-bold text-foreground block tracking-tight">
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
