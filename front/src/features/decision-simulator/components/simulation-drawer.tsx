"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Crown,
  Plane,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Play,
  Scale,
  Trophy,
  Activity,
  Bot,
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Flame,
  AlertTriangle,
  AlertOctagon,
  FileCheck2,
} from "lucide-react";
import { Momento, SimularResponse, ShapResponse } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { ShapChart } from "@/features/audit-logs/components/shap-chart";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { UserAvatar } from "@/components/shared/user-avatar";
import { CLIENT_INFO_MAP } from "../hooks/use-simulation";

interface SimulationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMomento: Momento | null;
  onSelectMomento: (m: Momento) => void;
  allMomentos: Momento[];
  simulationResult: SimularResponse | null;
  isSimulating: boolean;
  simulationError: Error | null;
  onSimulate: (momentoId: string) => void;
  shapData?: ShapResponse;
  isLoadingShap: boolean;
  lastDispatchedMission: any;
}

function parseFlightDetails(descricao: string): { voo: string | null; rota: string | null } {
  const flightMatch = descricao.match(/voo\s+([A-Z0-9]+)/i);
  const routeMatch = descricao.match(/\(([A-Z]{3})\s*(?:->|➔)\s*([A-Z]{3})\)/i);

  return {
    voo: flightMatch ? flightMatch[1].toUpperCase() : null,
    rota: routeMatch ? `${routeMatch[1]} ➔ ${routeMatch[2]}` : null,
  };
}

export function SimulationDrawer({
  isOpen,
  onClose,
  selectedMomento,
  onSelectMomento,
  allMomentos = [],
  simulationResult,
  isSimulating,
  simulationError,
  onSimulate,
  shapData,
  isLoadingShap,
  lastDispatchedMission,
}: SimulationDrawerProps) {
  const [activeChannel, setActiveChannel] = useState<"whatsapp" | "internal" | "crew" | "rag">("whatsapp");
  const [copied, setCopied] = useState(false);

  // Navegação sequencial
  const currentIndex = selectedMomento
    ? allMomentos.findIndex((m) => m.id === selectedMomento.id)
    : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allMomentos.length - 1;

  const handlePrev = React.useCallback(() => {
    if (hasPrev) {
      onSelectMomento(allMomentos[currentIndex - 1]);
    }
  }, [hasPrev, allMomentos, currentIndex, onSelectMomento]);

  const handleNext = React.useCallback(() => {
    if (hasNext) {
      onSelectMomento(allMomentos[currentIndex + 1]);
    }
  }, [hasNext, allMomentos, currentIndex, onSelectMomento]);

  // Fechar com a tecla Escape e navegação com setas do teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  // Evita scroll da página de trás quando o drawer está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !selectedMomento) return null;

  // Tier inferido
  const tier = (() => {
    const clv = selectedMomento.clv_previsto;
    if (clv >= 8000) return "Diamante";
    if (clv >= 5000) return "Safira";
    if (clv >= 3000) return "Topázio";
    return "Básico";
  })();

  const tierConfig = (() => {
    switch (tier) {
      case "Diamante":
        return {
          avatarBg: "bg-gradient-to-br from-[#001D40] to-[#003B7A] text-sky-200 ring-2 ring-sky-400/60 shadow-[0_0_14px_rgba(56,189,248,0.3)]",
          badge: "bg-[#002855] text-sky-200 border-sky-400/50 shadow-xs",
        };
      case "Safira":
        return {
          avatarBg: "bg-gradient-to-br from-blue-950 to-blue-800 text-blue-200 ring-2 ring-blue-400/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]",
          badge: "bg-blue-900 text-blue-200 border-blue-400/40 shadow-xs",
        };
      case "Topázio":
        return {
          avatarBg: "bg-gradient-to-br from-amber-950 to-amber-800 text-amber-200 ring-2 ring-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]",
          badge: "bg-amber-900 text-amber-200 border-amber-400/40 shadow-xs",
        };
      default:
        return {
          avatarBg: "bg-slate-800 text-slate-300 ring-1 ring-slate-600",
          badge: "bg-slate-800 text-slate-300 border-slate-700",
        };
    }
  })();

  const { voo, rota } = parseFlightDetails(selectedMomento.descricao);

  const passengerName =
    (selectedMomento as any).nome ||
    (selectedMomento as any).passageiro ||
    CLIENT_INFO_MAP[selectedMomento.cliente_id]?.nome ||
    (lastDispatchedMission?.passageiro && lastDispatchedMission?.assento && selectedMomento.cliente_id
      ? lastDispatchedMission.passageiro
      : null);

  const paretoDecil = (() => {
    const clv = selectedMomento.clv_previsto;
    if (clv >= 8000) return "Top 10% Receita";
    if (clv >= 4000) return "Top 20% Receita";
    return "Cauda Longa";
  })();

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isNaoAgir =
    simulationResult?.decisao_final.acao_vencedora.toLowerCase().includes("não agir") ||
    simulationResult?.decisao_final.acao_vencedora.toLowerCase().includes("nao fazer nada");

  const isLgpdBlocked =
    simulationResult?.decisao_final.acao_vencedora.toLowerCase().includes("lgpd") ||
    simulationResult?.decisao_final.acao_vencedora.toLowerCase().includes("opt-out");

  const isBloqueada = isNaoAgir || isLgpdBlocked;

  const maxRetorno = simulationResult
    ? Math.max(...simulationResult.ranking_acoes.map((a) => Math.max(a.retorno_liquido, 0)), 1)
    : 1;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* ─────────────────────────────────────────────────────────────
          1. BACKDROP OVERLAY SUAVE COM BLUR
         ───────────────────────────────────────────────────────────── */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
      />

      {/* ─────────────────────────────────────────────────────────────
          2. DRAWER EXPANSIVO LATERAL (780px) COM ÚNICO SCROLL VERTICAL
         ───────────────────────────────────────────────────────────── */}
      <div className="fixed inset-y-0 right-0 z-50 flex max-w-full">
        <aside className="w-screen max-w-[820px] bg-card text-foreground shadow-2xl border-l border-border/80 dark:border-white/10 flex flex-col h-full animate-in slide-in-from-right duration-300">
          {/* ─────────────────────────────────────────────────────────────
              HEADER DO DRAWER: IDENTIFICAÇÃO + NAVEGAÇÃO ENTRE CASOS
             ───────────────────────────────────────────────────────────── */}
          <div className="px-6 py-4 border-b border-border/70 dark:border-white/10 bg-muted/40 backdrop-blur-md flex items-center justify-between gap-4 shrink-0">
            {/* Esquerda: Identificação do Passageiro Estilo VIP Boarding Pass */}
            <div className="flex items-center gap-3.5 min-w-0">
              {passengerName ? (
                <UserAvatar name={passengerName} size="md" className="h-11 w-11 rounded-2xl" />
              ) : (
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-black text-sm transition-all ${tierConfig.avatarBg}`}
                >
                  <User className="h-5 w-5" />
                </div>
              )}

              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-black tracking-tight text-foreground truncate">
                    {passengerName || `Passageiro #${selectedMomento.cliente_id}`}
                  </h2>
                  <Badge className={`text-[10px] font-bold px-2 py-0.5 ${tierConfig.badge}`}>
                    <Crown className="h-2.5 w-2.5 mr-1" />
                    Tier {tier}
                  </Badge>
                  {rota && (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono font-bold text-[#0077C8] dark:text-sky-300 border-sky-500/30 bg-sky-500/10 flex items-center gap-1"
                    >
                      <Plane className="h-2.5 w-2.5" />
                      <span>{rota}</span>
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] font-mono font-bold text-azul-action dark:text-sky-300 border-sky-500/30 bg-sky-500/5">
                    {paretoDecil}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {passengerName ? `Passageiro #${selectedMomento.cliente_id} • ` : ""}Cluster: <span className="font-semibold text-foreground">{selectedMomento.persona}</span> • ID: {selectedMomento.id} {voo ? `• Voo ${voo}` : ""}
                </p>
              </div>
            </div>

            {/* Direita: Navegação Sequencial + Botão Fechar */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Botões Anterior e Próximo */}
              <div className="flex items-center rounded-xl border border-border/80 bg-background/80 p-0.5 shadow-xs">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrev}
                  disabled={!hasPrev}
                  className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
                  title="Caso Anterior (Seta Esquerda)"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-[11px] font-mono px-2 text-muted-foreground font-semibold">
                  {currentIndex + 1} de {allMomentos.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNext}
                  disabled={!hasNext}
                  className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
                  title="Próximo Caso (Seta Direita)"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Botão Fechar */}
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 rounded-xl border-border/80 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Fechar (Esc)"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              CORPO DO DRAWER: ÚNICO CONTAINER COM SCROLL NATURAL SUAVE
             ───────────────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-thin scrollbar-thumb-border">
            {/* ─────────────────────────────────────────────────────────────
                SEÇÃO 1: DOSSIÊ ANALÍTICO DO PASSAGEIRO & DISPARO DO MOTOR
               ───────────────────────────────────────────────────────────── */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-400/20 text-[#0077C8] dark:text-sky-400">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-sm font-black tracking-tight text-foreground">
                    Dossiê 360° & Gatilho Operacional
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  <ShieldCheck className="h-3 w-3" />
                  Consentimento LGPD Ativo (Art. 7º)
                </span>
              </div>

              {/* Grid Amplo de Métricas Financeiras com Feixes de Luz Semânticos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="relative overflow-hidden p-3.5 rounded-xl bg-card border border-border/80 shadow-xs space-y-1">
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-sky-500/80 via-sky-400/30 to-transparent" />
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    CLV Previsto
                  </span>
                  <p className="text-lg font-black font-mono text-[#003B7A] dark:text-sky-300">
                    {formatCurrency(selectedMomento.clv_previsto)}
                  </p>
                  <span className="text-[10px] text-muted-foreground block">Ciclo de vida Gold</span>
                </div>

                <div className="relative overflow-hidden p-3.5 rounded-xl bg-card border border-border/80 shadow-xs space-y-1">
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-rose-500/80 via-rose-500/30 to-transparent" />
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Risco de Evasão
                  </span>
                  <p
                    className={`text-lg font-black font-mono ${
                      selectedMomento.risco_evasao_atual >= 0.7
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {formatPercent(selectedMomento.risco_evasao_atual)}
                  </p>
                  <span className="text-[10px] text-muted-foreground block">Score preditivo</span>
                </div>

                <div className="relative overflow-hidden p-3.5 rounded-xl bg-card border border-border/80 shadow-xs space-y-1">
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-rose-500/80 via-rose-500/30 to-transparent" />
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Perda em Risco
                  </span>
                  <p className="text-lg font-black font-mono text-rose-600 dark:text-rose-400">
                    {formatCurrency(
                      selectedMomento.clv_previsto * selectedMomento.risco_evasao_atual
                    )}
                  </p>
                  <span className="text-[10px] text-muted-foreground block">CLV × Risco Churn</span>
                </div>

                <div className="relative overflow-hidden p-3.5 rounded-xl bg-card border border-border/80 shadow-xs space-y-1">
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-500/80 via-amber-500/30 to-transparent" />
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Tipo de Evento
                  </span>
                  <p className="text-sm font-black text-foreground mt-1">
                    {selectedMomento.tipo_simulacao}
                  </p>
                  <span className="text-[10px] text-muted-foreground block">Intervenção</span>
                </div>
              </div>

              {/* Descrição do Atrito na Jornada */}
              <div className="rounded-xl bg-sky-500/5 dark:bg-sky-950/30 border border-sky-400/20 p-3.5 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-sky-900 dark:text-sky-200 mb-1">
                  <Plane className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  <span>Ocorrência Registrada no Voo</span>
                </div>
                <p className="text-foreground leading-relaxed">
                  {selectedMomento.descricao}
                </p>
              </div>

              {/* Botão Primário de Disparo Minimalista */}
              <div>
                <Button
                  onClick={() => onSimulate(selectedMomento.id)}
                  disabled={isSimulating}
                  className="w-full h-10 rounded-xl bg-[#003B7A] hover:bg-[#002855] dark:bg-sky-600 dark:hover:bg-sky-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Play className={`h-3.5 w-3.5 fill-white ${isSimulating ? "animate-pulse" : ""}`} />
                  <span>
                    {isSimulating
                      ? "Calculando Árbitro de Uplift & Agente LLM..."
                      : simulationResult
                      ? "Recalcular Arbitragem & Cenário"
                      : "Executar Arbitragem IA & Simular Retenção"}
                  </span>
                </Button>
              </div>

              {simulationError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-800 dark:text-rose-200">
                  <p className="font-bold">Erro ao executar simulação:</p>
                  <p>{simulationError.message}</p>
                </div>
              )}
            </section>

            {/* ─────────────────────────────────────────────────────────────
                SEÇÃO 2: RESULTADOS DO MOTOR QUANDO EXECUTADO
               ───────────────────────────────────────────────────────────── */}
            {simulationResult && (
              <section className="space-y-6 pt-2 border-t border-border/70 dark:border-white/10 animate-in fade-in duration-300">
                {/* ─────────────────────────────────────────────────────────
                    A. BANNER DE MISSÃO DE BORDO DESPACHADA
                   ───────────────────────────────────────────────────────── */}
                {lastDispatchedMission && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 dark:text-emerald-100 text-xs shadow-xs">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-mono text-sm font-black shadow-xs">
                        ✓
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-foreground text-sm">
                            Missão Despachada para a Comissária
                          </span>
                          <Badge className="bg-emerald-600 text-white text-[9px] font-bold">
                            Tablet em Tempo Real
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mt-0.5">
                          Assento <strong>[{lastDispatchedMission.assento}]</strong> • {lastDispatchedMission.passageiro} (Voo AD4231)
                        </p>
                      </div>
                    </div>

                    <a
                      href="/crew"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shrink-0 shadow-xs flex items-center gap-1.5 self-end sm:self-auto"
                    >
                      <span>Ver no CrewApp</span>
                      <ArrowRight className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {/* ─────────────────────────────────────────────────────────
                    B. ÁRBITRO MATEMÁTICO (HERO VENCEDOR + RANKING AMPLO)
                   ───────────────────────────────────────────────────────── */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-400/20 text-[#0077C8] dark:text-sky-400">
                        <Scale className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black tracking-tight text-foreground">
                          Decisão do Árbitro Matemático (Uplift)
                        </h3>
                        <span className="text-[11px] text-muted-foreground">
                          Otimização de ROI: Retorno Líquido = (CLV × Risco × Eficácia) - Custo
                        </span>
                      </div>
                    </div>

                    <Badge
                      className={`text-xs font-bold px-2.5 py-0.5 ${
                        simulationResult.uplift_status === "Persuadível"
                          ? "bg-emerald-600 text-white"
                          : "bg-amber-600 text-white"
                      }`}
                    >
                      {simulationResult.uplift_status}
                    </Badge>
                  </div>

                  {/* Hero da Ação Vencedora (Champion of the Algorithm) */}
                  <div
                    className={`p-5 rounded-2xl border shadow-md relative overflow-hidden backdrop-blur-md ${
                      isBloqueada
                        ? "border-amber-500/40 bg-gradient-to-br from-card via-card to-amber-500/10 text-amber-950 dark:text-amber-100"
                        : "border-emerald-500/50 bg-gradient-to-br from-card via-card to-emerald-500/10 dark:to-emerald-950/25 text-emerald-950 dark:text-emerald-100 shadow-emerald-500/5"
                    }`}
                  >
                    <div
                      className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${
                        isBloqueada
                          ? "from-amber-500/80 via-amber-400/40 to-transparent"
                          : "from-emerald-500/90 via-sky-400/40 to-transparent"
                      }`}
                    />

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md ${
                            isBloqueada
                              ? "bg-gradient-to-br from-amber-500 to-amber-700 ring-2 ring-amber-400/30"
                              : "bg-gradient-to-br from-emerald-500 to-emerald-700 ring-2 ring-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                          }`}
                        >
                          {isBloqueada ? (
                            <AlertOctagon className="h-6 w-6" />
                          ) : (
                            <Trophy className="h-6 w-6" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              {isBloqueada ? "Salvaguarda Algorítmica Ativada" : "Ação Arbitrada Vencedora"}
                            </span>
                            {!isBloqueada && (
                              <Badge className="text-[9px] font-bold bg-emerald-600 text-white px-2 py-0.2 shadow-xs">
                                Max Uplift
                              </Badge>
                            )}
                          </div>
                          <h4 className="text-xl font-black text-foreground tracking-tight">
                            {simulationResult.decisao_final.acao_vencedora}
                          </h4>
                          <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
                            {isLgpdBlocked
                              ? "Salvaguarda LGPD ativada (Art. 7º e 18). Nenhuma oferta disparada para conformidade jurídica."
                              : isNaoAgir
                              ? "Nenhuma ação possui ROI positivo. Trava de eficiência acionada para proteger o orçamento da Azul."
                              : "Ação selecionada que maximiza o retorno líquido respeitando as travas do programa Azul Fidelidade."}
                          </p>
                        </div>
                      </div>

                      {/* Métricas da Vencedora */}
                      {!isBloqueada && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-card/90 border border-emerald-500/30 shrink-0 self-end sm:self-center shadow-xs">
                          <div className="text-right">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">
                              Retorno Líquido
                            </span>
                            <p className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                              +{formatCurrency(
                                simulationResult.ranking_acoes.find(
                                  (a) => a.acao.toLowerCase() === simulationResult.decisao_final.acao_vencedora.toLowerCase()
                                )?.retorno_liquido || 850
                              )}
                            </p>
                          </div>
                          <div className="h-7 w-[1px] bg-border" />
                          <div className="text-right">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">
                              Custo Ação
                            </span>
                            <p className="text-xs font-bold font-mono text-muted-foreground">
                              {formatCurrency(
                                simulationResult.ranking_acoes.find(
                                  (a) => a.acao.toLowerCase() === simulationResult.decisao_final.acao_vencedora.toLowerCase()
                                )?.custo_acao || 300
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tabela Ampla de Ranking de Todas as Ações */}
                  <div className="rounded-xl border border-border/80 dark:border-white/10 overflow-hidden bg-card">
                    <div className="p-3 bg-muted/40 border-b border-border/70 text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">
                      <span>Ranking Comparativo das Concessões</span>
                      <span className="font-mono text-[11px]">{simulationResult.ranking_acoes.length} ações avaliadas</span>
                    </div>

                    <div className="divide-y divide-border/60">
                      {simulationResult.ranking_acoes.map((item, idx) => {
                        const isWinner = item.acao.toLowerCase() === simulationResult.decisao_final.acao_vencedora.toLowerCase();
                        const isPositive = item.retorno_liquido > 0;
                        const ratio = Math.max(0, Math.min(100, Math.round((item.retorno_liquido / maxRetorno) * 100)));

                        return (
                          <div
                            key={item.acao}
                            className={`p-3.5 transition-colors ${
                              isWinner ? "bg-sky-50/70 dark:bg-sky-950/40" : "hover:bg-muted/30"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 mb-1.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg text-xs font-black font-mono ${
                                    isWinner ? "bg-[#003B7A] dark:bg-sky-500 text-white" : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                                <span className="text-xs font-bold text-foreground truncate">
                                  {item.acao}
                                </span>
                                {isWinner && (
                                  <Badge className="text-[9px] py-0 px-1.5 bg-emerald-600 text-white font-bold shrink-0">
                                    Vencedora
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-4 text-xs shrink-0">
                                <div className="text-right">
                                  <span className="text-[10px] text-muted-foreground mr-1">Custo:</span>
                                  <span className="font-mono text-muted-foreground font-semibold">
                                    {formatCurrency(item.custo_acao)}
                                  </span>
                                </div>

                                <div className="text-right min-w-[90px]">
                                  <span className="text-[10px] text-muted-foreground mr-1">Retorno:</span>
                                  <span
                                    className={`font-mono font-bold ${
                                      isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"
                                    }`}
                                  >
                                    {isPositive ? `+${formatCurrency(item.retorno_liquido)}` : "R$ 0,00"}
                                  </span>
                                </div>

                                <div className="min-w-[95px] text-right">
                                  {isWinner ? (
                                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                      ✓ Aprovada
                                    </span>
                                  ) : isPositive ? (
                                    <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400">
                                      ROI Viável
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-medium text-muted-foreground">
                                      ✗ Inviável
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Barra Horizontal de Retorno Líquido */}
                            <div className="h-1.5 w-full bg-muted/70 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isWinner
                                    ? "bg-emerald-500"
                                    : isPositive
                                    ? "bg-[#0077C8] dark:bg-sky-400"
                                    : "bg-rose-400"
                                }`}
                                style={{ width: `${isPositive ? ratio : 3}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ─────────────────────────────────────────────────────────
                    C. EXPLICABILIDADE ADITIVA SHAP (DECOMPOSIÇÃO DE RISCO)
                   ───────────────────────────────────────────────────────── */}
                <div className="rounded-2xl border border-border/80 dark:border-white/10 bg-card p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-sky-500" />
                      <h4 className="text-xs font-black tracking-tight text-foreground uppercase">
                        Explicabilidade Aditiva do Risco (SHAP)
                      </h4>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Cliente #{selectedMomento.cliente_id}
                    </span>
                  </div>

                  <ShapChart
                    data={shapData}
                    isLoading={isLoadingShap}
                    decisaoId={selectedMomento.cliente_id || selectedMomento.id}
                    hideHeader
                  />
                </div>

                {/* ─────────────────────────────────────────────────────────
                    D. HUB OMNICANAL GENERATIVO (LLM + RAG)
                   ───────────────────────────────────────────────────────── */}
                <div className="rounded-2xl border border-border/80 dark:border-white/10 bg-card shadow-xs overflow-hidden space-y-3 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-400/20 text-[#0077C8] dark:text-sky-400">
                        <Bot className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black tracking-tight text-foreground uppercase">
                          Comunicação Generativa & Entrega (LLM + RAG)
                        </h4>
                        <span className="text-[11px] text-muted-foreground">
                          GPT-4o-mini RAG calibrado pelas diretrizes do Azul Fidelidade
                        </span>
                      </div>
                    </div>

                    {/* Seletor de Canal */}
                    <div className="flex items-center gap-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setActiveChannel("whatsapp")}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          activeChannel === "whatsapp"
                            ? "bg-[#003B7A] dark:bg-sky-500 text-white"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveChannel("internal")}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          activeChannel === "internal"
                            ? "bg-[#003B7A] dark:bg-sky-500 text-white"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        Diretoria
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveChannel("rag")}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          activeChannel === "rag"
                            ? "bg-blue-600 text-white"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        Regra RAG
                      </button>
                    </div>
                  </div>

                  {/* Conteúdo do Canal Selecionado: WhatsApp Limpo Sem Gradiente */}
                  {activeChannel === "whatsapp" && (
                    <div className="space-y-3">
                      <div className="rounded-2xl bg-card border border-border/80 dark:border-white/10 p-4 space-y-3 shadow-xs">
                        {/* WhatsApp Header Sem Gradiente */}
                        <div className="flex items-center justify-between pb-3 border-b border-border/60 text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0077C8] text-white font-black text-xs ring-2 ring-emerald-500/40 shadow-xs">
                              Az
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-foreground text-xs">Azul Linhas Aéreas Oficial</span>
                                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-black">
                                  ✓
                                </span>
                              </div>
                              <span className="text-[10px] text-muted-foreground block">Conta Comercial Verificada • Canal Prioritário</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/50">
                            Criptografia ponta a ponta
                          </span>
                        </div>

                        {/* WhatsApp Chat Bubble */}
                        <div className="relative max-w-[95%] sm:max-w-[88%] bg-sky-50/80 dark:bg-sky-950/40 text-foreground rounded-2xl rounded-tl-sm p-4 border border-sky-400/20 shadow-xs">
                          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                            {simulationResult.decisao_final.mensagem_crm || simulationResult.decisao_final.mensagem_llm}
                          </p>

                          <div className="flex items-center justify-end gap-1.5 mt-2.5 pt-1.5 border-t border-border/40 text-[10px] text-muted-foreground font-mono">
                            <span>Hoje, 14:32</span>
                            <span className="text-sky-600 dark:text-sky-400 font-bold font-sans">✓✓</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/60 text-[10px] text-muted-foreground">
                          <span>Conformidade ANAC 400 • Retenção e Fidelização</span>
                          <span>Azul Fidelidade Hub</span>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleCopyMessage(
                              simulationResult.decisao_final.mensagem_crm || simulationResult.decisao_final.mensagem_llm
                            )
                          }
                          className="h-8 px-3 rounded-xl border-border hover:bg-muted text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          {copied ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="text-emerald-600 font-bold">Copiado para Área de Transferência!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 text-azul-action dark:text-sky-400" />
                              <span>Copiar Mensagem CRM</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {activeChannel === "internal" && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-950 dark:text-amber-100 space-y-2">
                      <span className="font-bold block text-sm text-amber-900 dark:text-amber-300">
                        Alerta Gerencial Interno (Diretoria & Operações)
                      </span>
                      <p>
                        {simulationResult.decisao_final.notificacao_interna ||
                          `Ação de retenção arbitrada para o cliente #${selectedMomento.cliente_id}. A intervenção preserva o orçamento com ROI positivo, assegurando prioridade na central de contingência.`}
                      </p>
                    </div>
                  )}

                  {activeChannel === "rag" && (
                    <div className="rounded-xl border border-border/80 bg-muted/40 p-4 text-xs text-foreground space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-[#003B7A] dark:text-sky-300">
                        <BookOpen className="h-4 w-4" />
                        <span>Diretriz do Programa Azul Fidelidade (RAG)</span>
                      </div>
                      <p className="italic bg-card p-3 rounded-lg border border-border/60">
                        &quot;{simulationResult.decisao_final.regra_rag_consultada}&quot;
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
