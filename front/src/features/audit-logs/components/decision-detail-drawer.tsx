"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Crown,
  Plane,
  ShieldCheck,
  Sparkles,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Scale,
  Activity,
  Layers,
  Copy,
  Check,
  ShieldAlert,
} from "lucide-react";
import { DecisaoAuditoria, ShapResponse } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { ShapChart } from "./shap-chart";
import { formatCurrency, formatDateTime, formatPercent } from "@/lib/formatters";
import { getClientAuditInfo, getAuditStatusCategory } from "../lib/audit-helpers";

interface DecisionDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  decisao: DecisaoAuditoria | null;
  onSelectPrev?: () => void;
  onSelectNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  currentIndex?: number;
  totalCount?: number;
  shapData?: ShapResponse | null;
  isLoadingShap?: boolean;
}

export function DecisionDetailDrawer({
  isOpen,
  onClose,
  decisao,
  onSelectPrev,
  onSelectNext,
  hasPrev = false,
  hasNext = false,
  currentIndex = 0,
  totalCount = 0,
  shapData,
  isLoadingShap = false,
}: DecisionDetailDrawerProps) {
  const [copiedHash, setCopiedHash] = useState(false);

  // Fechar com Escape e navegar com setas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && hasPrev && onSelectPrev) {
        onSelectPrev();
      } else if (e.key === "ArrowRight" && hasNext && onSelectNext) {
        onSelectNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, hasPrev, hasNext, onSelectPrev, onSelectNext]);

  // Bloqueio de scroll na página de trás quando o drawer está aberto
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

  if (!isOpen || !decisao) return null;

  const client = getClientAuditInfo(decisao.cliente_id);
  const statusCategory = getAuditStatusCategory(decisao);
  const isBloqueada = statusCategory !== "EXECUTADA";

  const tierBadgeClasses = (() => {
    switch (client.tier) {
      case "Diamante":
        return "bg-azul-navy-dark text-sky-200 border-sky-400/50 shadow-xs";
      case "Safira":
        return "bg-blue-900 text-blue-200 border-blue-400/40 shadow-xs";
      case "Topázio":
        return "bg-amber-900 text-amber-200 border-amber-400/40 shadow-xs";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  })();

  const auditHash = `0x${btoa(decisao.decisao_id + decisao.data_decisao).slice(0, 20)}...f8`;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(auditHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop com blur suave */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
      />

      {/* Janela Flutuante / Slide-Out Lateral de 840px */}
      <div className="fixed inset-y-0 right-0 z-50 flex max-w-full p-0 sm:p-4 lg:p-5 pointer-events-none">
        <aside className="pointer-events-auto w-screen max-w-full sm:max-w-[840px] rounded-none sm:rounded-3xl bg-card sm:bg-card/85 sm:dark:bg-card/75 sm:backdrop-blur-2xl text-foreground shadow-2xl shadow-black/40 border-l sm:border border-border/80 sm:dark:border-white/10 flex flex-col h-full overflow-hidden transition-all duration-300 animate-in slide-in-from-right">
          {/* Header do Drawer */}
          <div className="px-4 sm:px-6 py-4 border-b border-border/70 bg-muted/40 sm:bg-muted/30 backdrop-blur-md flex items-center justify-between gap-4 shrink-0 rounded-none sm:rounded-t-3xl">
            {/* Esquerda: Identificação do Passageiro e Decisão */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-black text-sm shadow-md border border-border/60">
                <FileText className="h-5 w-5" />
              </div>

              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-black tracking-tight text-foreground truncate">
                    Auditoria #{decisao.decisao_id}
                  </h2>
                  <Badge className={`text-[10px] font-bold px-2 py-0.5 ${tierBadgeClasses}`}>
                    <Crown className="h-2.5 w-2.5 mr-1" />
                    Tier {client.tier}
                  </Badge>
                  {client.rota && (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono font-bold text-primary border-primary/30 bg-primary/10 flex items-center gap-1"
                    >
                      <Plane className="h-2.5 w-2.5" />
                      <span>{client.rota}</span>
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono font-bold text-azul-action dark:text-sky-300 border-sky-500/30 bg-sky-500/5"
                  >
                    Cliente #{decisao.cliente_id}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  Passageiro: <span className="font-semibold text-foreground">{client.nome}</span> • Cluster: {client.persona} {client.voo ? `• Voo ${client.voo}` : ""}
                </p>
              </div>
            </div>

            {/* Direita: Navegação Sequencial + Botão Fechar */}
            <div className="flex items-center gap-2.5 shrink-0">
              {totalCount > 1 && (
                <div className="inline-flex items-center gap-1 p-1 rounded-full bg-background/90 dark:bg-card/90 border border-border/80 shadow-xs backdrop-blur-md">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onSelectPrev}
                    disabled={!hasPrev}
                    className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 transition-all cursor-pointer"
                    title="Decisão Anterior (Seta Esquerda)"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>

                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-muted/60 text-[11px] font-mono select-none">
                    <span className="font-bold text-foreground">{currentIndex + 1}</span>
                    <span className="text-muted-foreground/40 text-[10px]">/</span>
                    <span className="text-muted-foreground font-medium">{totalCount}</span>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onSelectNext}
                    disabled={!hasNext}
                    className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 transition-all cursor-pointer"
                    title="Próxima Decisão (Seta Direita)"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-full border border-border/80 bg-background/90 dark:bg-card/90 text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 shadow-xs cursor-pointer group"
                title="Fechar (Esc)"
              >
                <X className="h-4 w-4 group-hover:rotate-90 transition-transform duration-200" />
              </Button>
            </div>
          </div>

          {/* Corpo com Scroll Natural */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-thin scrollbar-thumb-border">
            {/* ─────────────────────────────────────────────────────────────
                SEÇÃO 1: DOSSIÊ DA DECISÃO & RESUMO FINANCEIRO
               ───────────────────────────────────────────────────────────── */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-sm font-black tracking-tight text-foreground">
                    Dossiê 360° da Intervenção
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  <ShieldCheck className="h-3 w-3" />
                  Trilha Auditável SQLite WAL
                </span>
              </div>

              {/* Grid Amplo de Métricas Financeiras */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="relative overflow-hidden p-3.5 rounded-xl bg-card border border-border/80 shadow-xs space-y-1">
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary/80 via-primary/30 to-transparent" />
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    CLV Previsto
                  </span>
                  <p className="text-lg font-black font-mono text-primary">
                    {formatCurrency(client.clvPrevisto)}
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
                      client.riscoEvasao >= 0.7
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {formatPercent(client.riscoEvasao)}
                  </p>
                  <span className="text-[10px] text-muted-foreground block">Score no disparo</span>
                </div>

                <div className="relative overflow-hidden p-3.5 rounded-xl bg-card border border-border/80 shadow-xs space-y-1">
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-500/80 via-emerald-500/30 to-transparent" />
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Custo Realizado
                  </span>
                  <p className="text-lg font-black font-mono text-foreground">
                    {formatCurrency(decisao.custo_realizado)}
                  </p>
                  <span className="text-[10px] text-muted-foreground block">Investimento real</span>
                </div>

                <div className="relative overflow-hidden p-3.5 rounded-xl bg-card border border-border/80 shadow-xs space-y-1">
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-sky-500/80 via-sky-500/30 to-transparent" />
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Tipo de Gatilho
                  </span>
                  <p className="text-sm font-black text-foreground mt-1">
                    {decisao.tipo_simulacao}
                  </p>
                  <span className="text-[10px] text-muted-foreground block">
                    {formatDateTime(decisao.data_decisao)}
                  </span>
                </div>
              </div>

              {/* Hero Banner do Resultado Arbitrado */}
              <div
                className={`p-5 rounded-2xl border shadow-md relative overflow-hidden backdrop-blur-md ${
                  isBloqueada
                    ? "border-amber-500/40 bg-gradient-to-br from-card via-card to-amber-500/10 text-amber-950 dark:text-amber-100"
                    : "border-emerald-500/50 bg-gradient-to-br from-card via-card to-emerald-500/10 dark:to-emerald-950/25 text-emerald-950 dark:text-emerald-100"
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
                        <AlertTriangle className="h-6 w-6" />
                      ) : (
                        <CheckCircle2 className="h-6 w-6" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {isBloqueada ? "Salvaguarda Algorítmica Ativada" : "Ação Concedida com Sucesso"}
                        </span>
                        <Badge
                          className={`text-[9px] font-bold px-2 py-0.2 ${
                            isBloqueada ? "bg-amber-600 text-white" : "bg-emerald-600 text-white"
                          }`}
                        >
                          {statusCategory}
                        </Badge>
                      </div>
                      <h4 className="text-xl font-black text-foreground tracking-tight">
                        {decisao.acao_executada}
                      </h4>
                      <p className="text-xs text-muted-foreground max-w-lg leading-relaxed">
                        {decisao.motivo_bloqueio
                          ? `Justificativa do bloqueio: ${decisao.motivo_bloqueio}`
                          : "Ação de retenção calculada com ROI positivo e sem restrições regulatórias do Azul Fidelidade."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-card/90 border border-border/80 shrink-0 self-end sm:self-center shadow-xs">
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">
                        Custo Concedido
                      </span>
                      <p className="text-base font-black font-mono text-foreground">
                        {formatCurrency(decisao.custo_realizado)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ─────────────────────────────────────────────────────────────
                SEÇÃO 2: EXPLICABILIDADE ADITIVA SHAP (INTEGRAÇÃO NATIVA)
               ───────────────────────────────────────────────────────────── */}
            <section className="space-y-3 pt-4 border-t border-border/70">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
                    <Activity className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-tight text-foreground">
                      Explicabilidade Aditiva do Risco (SHAP)
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                      Cumprimento do Direito à Explicação (LGPD Art. 20)
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Endpoint: /auditoria/decisoes/{decisao.decisao_id}/shap
                </Badge>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
                <ShapChart
                  data={shapData}
                  isLoading={isLoadingShap}
                  decisaoId={decisao.decisao_id}
                  hideHeader
                />
              </div>
            </section>

            {/* ─────────────────────────────────────────────────────────────
                SEÇÃO 3: LINHAGEM MLOPS & GOVERNANÇA DE MODELOS
               ───────────────────────────────────────────────────────────── */}
            <section className="space-y-3 pt-4 border-t border-border/70">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
                    <Layers className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-tight text-foreground">
                      Linhagem MLOps & Rastreabilidade de Modelos
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                      Versões congeladas no momento da inferência
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Data Lake: DuckDB In-Process
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-card border border-border/80 shadow-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Modelo de CLV
                  </span>
                  <p className="font-mono font-bold text-foreground text-sm">
                    {decisao.versao_modelos?.clv || "v1.2"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Regressão RFM Preditiva calibrada com tarifas ANAC
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-card border border-border/80 shadow-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Modelo de Churn
                  </span>
                  <p className="font-mono font-bold text-foreground text-sm">
                    {decisao.versao_modelos?.churn || "v2.0"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    XGBoost Classifier + SHAP TreeExplainer
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-card border border-border/80 shadow-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Agente LLM & Prompt
                  </span>
                  <p className="font-mono font-bold text-foreground text-sm">
                    {decisao.versao_modelos?.llm || "gpt-4o-mini-rag"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    RAG com diretrizes oficiais do Azul Fidelidade
                  </p>
                </div>
              </div>

              {/* Hash Criptográfico de Auditoria Forense */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-azul-action dark:text-sky-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold text-foreground block text-[11px]">
                      Hash Criptográfico de Integridade (Não-Repúdio)
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground truncate block">
                      {auditHash}
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyHash}
                  className="h-7 px-2.5 rounded-lg border-border/70 hover:bg-muted text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1.5 self-end sm:self-auto"
                >
                  {copiedHash ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500" />
                      <span className="text-emerald-500">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copiar Hash</span>
                    </>
                  )}
                </Button>
              </div>
            </section>

            {/* ─────────────────────────────────────────────────────────────
                SEÇÃO 4: PARECER JURÍDICO & COMPLIANCE REGULATÓRIA
               ───────────────────────────────────────────────────────────── */}
            <section className="space-y-3 pt-4 border-t border-border/70">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <Scale className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-sm font-black tracking-tight text-foreground">
                  Enquadramento Legal & Compliance Regulatória
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-400/20 space-y-1">
                  <span className="font-bold text-sky-900 dark:text-sky-200 block text-[11px]">
                    ANAC Resolução nº 400/2016
                  </span>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">
                    Conformidade com a assistência material obrigatória aos passageiros em atrasos e cancelamentos. Validação estrita das regras anti-redundância para não conceder benefícios já usufruídos no programa de fidelidade.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-400/20 space-y-1">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200 block text-[11px]">
                    LGPD (Lei nº 13.709/2018) - Art. 20
                  </span>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">
                    Garantia de explicabilidade algorítmica aditiva sem violar segredos industriais de treino. A base de cálculo de atrito e concessões cumpre o legítimo interesse sem precarização de consentimento.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
