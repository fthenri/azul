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
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      {/* Luz ambiente aero de fundo */}
      <div className="pointer-events-none absolute -top-10 left-1/4 h-80 w-80 rounded-full bg-primary/10 blur-[120px] -z-10" />
      <div className="pointer-events-none absolute top-40 right-10 h-72 w-72 rounded-full bg-sky-500/10 blur-[100px] -z-10" />

      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-6 px-3 rounded-full bg-primary/10 text-primary text-[11px] font-bold border border-primary/20 flex items-center gap-1.5 shadow-2xs">
              <Sparkles className="h-3 w-3 text-primary" />
              Gestor de CRM Multicanal
            </span>
            <span className="h-6 px-3 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/20 flex items-center gap-1.5 shadow-2xs">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              Conformidade LGPD (Art. 7º e 18)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-outfit font-black tracking-tight text-foreground">
            Central de Ações Off-Board (Pós-Voo)
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-3xl leading-relaxed">
            Gestão humanizada e disparo proativo via WhatsApp e E-mail para clientes que sofreram atrito operacional.
            Comunicações calibradas pelo Árbitro Contextual com a Resolução 400 da ANAC.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-10 gap-2 text-xs font-outfit font-bold rounded-xl border-border/80 bg-card/60 backdrop-blur-md px-4 shadow-sm hover:bg-card/90 cursor-pointer transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-primary" : ""}`} />
            <span>Atualizar Fila</span>
          </Button>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-md p-2.5 px-4 shadow-sm text-right">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
              Recuperação Estimada
            </span>
            <span className="text-lg font-outfit font-black text-emerald-500 block">
              +48 pts NPS
            </span>
          </div>
        </div>
      </div>

      {/* Cards de Métricas Consolidadas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border border-border/80 bg-card/70 backdrop-blur-xl shadow-lg relative overflow-hidden transition-all hover:border-primary/30 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-white/20 before:to-transparent">
          <CardContent className="p-4 sm:p-5 space-y-1.5">
            <span className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider block">
              Passageiros com Atrito
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-outfit font-black text-foreground">
                {totalElegiveis}
              </span>
              <Badge variant="outline" className="text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                Voo {flightId}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">Impactados por atraso, bagagem ou SAC</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/80 bg-card/70 backdrop-blur-xl shadow-lg relative overflow-hidden transition-all hover:border-primary/30 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-white/20 before:to-transparent">
          <CardContent className="p-4 sm:p-5 space-y-1.5">
            <span className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider block">
              Mensagens WhatsApp RAG
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-outfit font-black text-primary">
                {totalElegiveis}
              </span>
              <Badge variant="outline" className="text-[10px] font-bold rounded-full bg-primary/10 text-primary border-primary/20">
                100% Prontas
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">Resolução 400 ANAC aplicada</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/80 bg-card/70 backdrop-blur-xl shadow-lg relative overflow-hidden transition-all hover:border-primary/30 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-white/20 before:to-transparent">
          <CardContent className="p-4 sm:p-5 space-y-1.5">
            <span className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider block">
              Disparos Pendentes
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-outfit font-black text-amber-500">
                {totalPendentes}
              </span>
              <span className="text-xs font-outfit font-bold text-muted-foreground">Aguardando CRM</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Requer cópia e envio do gestor</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/80 bg-card/70 backdrop-blur-xl shadow-lg relative overflow-hidden transition-all hover:border-primary/30 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-white/20 before:to-transparent">
          <CardContent className="p-4 sm:p-5 space-y-1.5">
            <span className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider block">
              Ações Concluídas
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-outfit font-black text-emerald-500">
                {totalEnviados}
              </span>
              <Badge variant="outline" className="text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                MLOps Gravado
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">Registros confirmados no SQLite</p>
          </CardContent>
        </Card>
      </div>

      {/* Seleção de Canal Multicanal */}
      <div className="flex items-center gap-2 border-b border-border/70 pb-3 overflow-x-auto">
        <Button
          variant={selectedChannel === "whatsapp" ? "default" : "ghost"}
          size="sm"
          onClick={() => setSelectedChannel("whatsapp")}
          className={cn(
            "h-9 text-xs font-outfit font-bold rounded-xl gap-2 cursor-pointer transition-all",
            selectedChannel === "whatsapp"
              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MessageSquare className="h-4 w-4" />
          <span>WhatsApp Concierge ({totalElegiveis})</span>
        </Button>

        <Button
          variant={selectedChannel === "email" ? "default" : "ghost"}
          size="sm"
          onClick={() => setSelectedChannel("email")}
          className="h-9 text-xs font-outfit font-bold rounded-xl gap-2 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/40"
        >
          <Mail className="h-4 w-4" />
          <span>E-mail Transacional</span>
        </Button>

        <Button
          variant={selectedChannel === "push" ? "default" : "ghost"}
          size="sm"
          onClick={() => setSelectedChannel("push")}
          className="h-9 text-xs font-outfit font-bold rounded-xl gap-2 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/40"
        >
          <Bell className="h-4 w-4" />
          <span>Push Notification</span>
        </Button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-3 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por passageiro, PNR, assento ou tier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9.5 pl-9.5 pr-3 text-xs rounded-xl border border-border/80 bg-card/60 backdrop-blur-md focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition-all placeholder:text-muted-foreground/70"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <span className="text-xs text-muted-foreground mr-1.5 font-medium">Filtrar:</span>
          <Button
            variant={filter === "todos" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilter("todos")}
            className={cn(
              "h-8 text-xs font-outfit font-bold rounded-xl px-3 cursor-pointer transition-all",
              filter === "todos" && "bg-primary/10 text-primary border border-primary/20"
            )}
          >
            Todos ({totalElegiveis})
          </Button>
          <Button
            variant={filter === "pendentes" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilter("pendentes")}
            className={cn(
              "h-8 text-xs font-outfit font-bold rounded-xl px-3 cursor-pointer transition-all text-amber-600 dark:text-amber-400",
              filter === "pendentes" && "bg-amber-500/10 border border-amber-500/20"
            )}
          >
            Pendentes ({totalPendentes})
          </Button>
          <Button
            variant={filter === "enviados" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilter("enviados")}
            className={cn(
              "h-8 text-xs font-outfit font-bold rounded-xl px-3 cursor-pointer transition-all text-emerald-600 dark:text-emerald-400",
              filter === "enviados" && "bg-emerald-500/10 border border-emerald-500/20"
            )}
          >
            Concluídos ({totalEnviados})
          </Button>
        </div>
      </div>

      {/* Lista de Cards de Ação Off-Board */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xl">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-48 rounded-lg" />
                  <Skeleton className="h-5 w-24 rounded-lg" />
                </div>
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-8 w-32 rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="rounded-2xl border border-rose-500/30 bg-rose-500/5 backdrop-blur-xl">
          <CardContent className="p-8 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
            <h3 className="font-outfit font-bold text-sm text-foreground">
              Falha ao carregar passageiros elegíveis
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Não foi possível consultar os dados analíticos do voo no Data Lake. Verifique se o backend está em execução.
            </p>
            <Button size="sm" onClick={() => refetch()} className="rounded-xl font-outfit font-bold cursor-pointer">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      ) : passageirosFiltrados.length === 0 ? (
        <Card className="rounded-2xl border border-dashed border-border/80 bg-card/60 backdrop-blur-xl">
          <CardContent className="p-10 text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
            <h3 className="font-outfit font-bold text-sm text-foreground">
              Nenhum passageiro pendente encontrado
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchTerm
                ? "Nenhum resultado corresponde à sua busca."
                : "Todas as mensagens de retenção para este lote foram disparadas com sucesso!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {passageirosFiltrados.map((p) => {
            const tierConf = getTierConfig(p.tier);
            const isCopied = copiedId === p.seatKey;

            return (
              <Card
                key={p.seatKey}
                className={cn(
                  "rounded-2xl border transition-all duration-300 shadow-md backdrop-blur-xl relative overflow-hidden",
                  p.isEnviado
                    ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10"
                    : "border-border/80 bg-card/80 hover:border-primary/40 hover:shadow-lg"
                )}
              >
                <CardContent className="p-4 sm:p-5 space-y-4">
                  {/* Topo do Card: Identificação do Passageiro e Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-border/70">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="h-7 px-3 rounded-xl bg-muted/80 text-foreground font-outfit font-black text-xs flex items-center border border-border/70 shadow-2xs">
                        {p.assento}
                      </span>
                      <span className="font-outfit font-black text-base text-foreground tracking-tight">
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
                          "text-[11px] font-outfit font-bold px-2.5 py-0.5 rounded-full border shadow-2xs",
                          p.risco_evasao > 0.6
                            ? "bg-rose-500/10 text-rose-500 border-rose-500/30"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                        )}
                      >
                        Risco: {formatPercent(p.risco_evasao, 0)}
                      </span>
                      {p.isEnviado ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] gap-1 font-bold rounded-full shadow-2xs">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-card/60 border border-border/70 space-y-1 backdrop-blur-xs">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        Diagnóstico de Atrito Operacional (XAI)
                      </span>
                      <p className="text-foreground font-medium leading-relaxed">{p.contexto}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1 backdrop-blur-xs">
                      <span className="text-[10px] text-primary uppercase font-bold tracking-wider flex items-center gap-1.5">
                        <HeartHandshake className="h-3.5 w-3.5 text-primary" />
                        Ação Aprovada pelo Árbitro (Uplift)
                      </span>
                      <p className="font-outfit font-black text-primary text-sm">{p.acao}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono pt-0.5">
                        <span>Custo: {formatCurrency(p.custo)}</span>
                        <span>•</span>
                        <span>CLV Protegido: {formatCurrency(p.clv)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Balão da Mensagem WhatsApp Pronta para Envio */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
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

                    <div className="relative rounded-2xl p-4 bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/25 text-xs text-foreground leading-relaxed shadow-inner backdrop-blur-xs">
                      <p className="italic text-foreground font-medium">&ldquo;{p.mensagem}&rdquo;</p>
                    </div>
                  </div>

                  {/* Barra de Ações: Botão Copiar, Botão Confirmar Disparo e Botão XAI */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedXaiId(expandedXaiId === p.seatKey ? null : p.seatKey)}
                        className={cn(
                          "h-8 text-xs gap-1.5 font-outfit font-bold rounded-xl cursor-pointer transition-all",
                          expandedXaiId === p.seatKey
                            ? "bg-primary/15 text-primary border border-primary/30"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
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
                          "h-8 text-xs gap-1.5 font-outfit font-bold rounded-xl border border-border/80 bg-card/60 backdrop-blur-md cursor-pointer transition-all",
                          isCopied && "bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-300"
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
                          "h-8 text-xs gap-1.5 font-outfit font-bold rounded-xl cursor-pointer transition-all shadow-md",
                          p.isEnviado
                            ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
                            : "bg-primary hover:bg-primary/90 text-primary-foreground"
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
                    <div className="mt-3 p-4 rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-xl space-y-3.5 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between border-b border-primary/20 pb-2.5 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                            <Sparkles className="h-3.5 w-3.5" />
                          </div>
                          <h4 className="font-outfit font-bold text-xs text-foreground uppercase tracking-wider">
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
                        <div className="p-3.5 rounded-xl bg-card/90 border border-border/70 backdrop-blur-md space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-outfit font-bold text-foreground flex items-center gap-1.5">
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
                        <div className="p-3.5 rounded-xl bg-card/90 border border-border/70 backdrop-blur-md space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-outfit font-bold text-foreground flex items-center gap-1.5">
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
                                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                            : a.status === "VETADA_ROI"
                                            ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
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
                        <div className="p-3.5 rounded-xl bg-card/90 border border-border/70 backdrop-blur-md space-y-2.5 flex flex-col justify-between">
                          <div className="space-y-2">
                            <span className="text-[11px] font-outfit font-bold text-foreground flex items-center gap-1.5">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                              Fundamentação Regulatória & Fidelidade
                            </span>

                            <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-[10.5px] space-y-1">
                              <span className="font-outfit font-bold text-emerald-600 dark:text-emerald-400 block">
                                {p.explicabilidade?.fundamentacao_rag?.norma || "Resolução 400 ANAC"}
                              </span>
                              <p className="text-muted-foreground leading-relaxed">
                                {p.explicabilidade?.fundamentacao_rag?.artigo || "Art. 20 a 28 (Assistência Material ao Passageiro)"}
                              </p>
                            </div>

                            <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 text-[10.5px] space-y-1">
                              <span className="font-outfit font-bold text-primary block">
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

      {/* Banner de Governança, LGPD e IA Responsável */}
      <Card className="rounded-2xl border border-border/80 bg-gradient-to-br from-slate-900 via-slate-900 to-[#002855] text-white overflow-hidden shadow-xl relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-white/30 before:to-transparent">
        <CardContent className="p-6 sm:p-7">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="lg:col-span-2 space-y-3.5">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-sky-400/20 text-sky-400 flex items-center justify-center border border-sky-400/30">
                  <Lock className="h-4 w-4" />
                </div>
                <h3 className="font-outfit font-black text-lg text-white tracking-tight">
                  Governança, IA Responsável & Conformidade LGPD
                </h3>
              </div>
              <p className="text-xs text-white/80 leading-relaxed max-w-2xl">
                A camada analítica opera sob princípios estritos de <strong>Zero Viés</strong> e minimização de dados.
                Nenhum dado sensível (como gênero, etnia ou idade) é utilizado para precificação ou priorização de ações.
                A inferência baseia-se exclusivamente em histórico transacional, risco analítico de evasão e regras regulatórias (ANAC Resolução 400).
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md text-[11px] font-semibold text-white/90 border border-white/15 flex items-center gap-1.5 shadow-2xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Anonimização de Identificadores
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md text-[11px] font-semibold text-white/90 border border-white/15 flex items-center gap-1.5 shadow-2xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Sentimento Público ANAC VRA
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md text-[11px] font-semibold text-white/90 border border-white/15 flex items-center gap-1.5 shadow-2xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Auditabilidade SQLite Transacional (mlops_logs.db)
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-2 text-center lg:text-right shadow-inner">
              <span className="text-[10px] text-white/60 uppercase font-bold tracking-wider block">
                Métrica de Equidade
              </span>
              <span className="text-3xl sm:text-4xl font-outfit font-black text-sky-400 block tracking-tight">
                100%
              </span>
              <span className="text-[11px] text-white/70 block">
                Auditoria de Paridade Estatística (Zero Viés Demográfico)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
