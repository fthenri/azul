"use client";

import React, { useState } from "react";
import {
  X,
  AlertTriangle,
  Crown,
  User,
  Coffee,
  HeartHandshake,
  Cookie,
  TrendingUp,
  ShieldAlert,
  Sparkles,
  Check,
  Copy,
  RotateCcw,
  Clock,
  ArrowRight,
  Plane,
} from "lucide-react";
import { AssentoVoo, SimularBordoResponse } from "@/types/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface PassengerDrawerProps {
  seat: AssentoVoo | null;
  simulationResult: SimularBordoResponse | null;
  isSimulating: boolean;
  simulationError: Error | null;
  onClose: () => void;
  onRerun: (seat: AssentoVoo) => void;
  onMarkAttended: (assento: string) => void;
  isAttended: boolean;
}

export function PassengerDrawer({
  seat,
  simulationResult,
  isSimulating,
  simulationError,
  onClose,
  onRerun,
  onMarkAttended,
  isAttended,
}: PassengerDrawerProps) {
  const [copied, setCopied] = useState(false);

  if (!seat) {
    return (
      <Card className="h-full border-dashed flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 dark:bg-slate-900/30">
        <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-muted-foreground">
          <Plane className="h-7 w-7 opacity-50" />
        </div>
        <h4 className="text-base font-semibold text-foreground mb-1">
          Nenhum Assento Selecionado
        </h4>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
          Clique em qualquer assento do mapa (com destaque para{" "}
          <span className="font-semibold text-rose-600 dark:text-rose-400">Críticos</span> ou{" "}
          <span className="font-semibold text-amber-600 dark:text-amber-400">VIPs</span>) para
          abrir o dossiê e disparar a recomendação de bordo.
        </p>
      </Card>
    );
  }

  const { dados_cliente: cliente } = seat;
  const isCritico = seat.status === "critico";
  const isVip = seat.status === "vip";
  const riscoPerc = Math.round(cliente.risco_evasao * 100);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const handleCopyInstruction = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const getActionIcon = (acao: string) => {
    if (acao.includes("BEBIDA")) return Coffee;
    if (acao.includes("SNACK")) return Cookie;
    return HeartHandshake;
  };

  const getActionBadgeLabel = (acao: string) => {
    switch (acao) {
      case "ABORDAGEM_CHEFE_CABINE":
        return "Abordagem Pessoal do Chefe de Cabine";
      case "BEBIDA_CORTESIA":
        return "Bebida Cortesia (Vinho / Espumante)";
      case "SNACK_EXTRA":
        return "Snack Especial da Cesta Premium";
      default:
        return acao;
    }
  };

  return (
    <Card className="h-full flex flex-col border border-border shadow-md overflow-hidden bg-card">
      {/* Header do Dossiê do Passageiro */}
      <CardHeader className="p-4 sm:p-5 border-b border-border/80 bg-slate-50/70 dark:bg-slate-900/60 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Box com o Número do Assento */}
            <div
              className={cn(
                "h-12 w-12 rounded-xl flex flex-col items-center justify-center font-mono font-black text-base shrink-0 shadow-xs border",
                isCritico
                  ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700"
                  : isVip
                  ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
              )}
            >
              <span className="text-[10px] font-semibold opacity-75 uppercase">
                Assento
              </span>
              <span>{seat.assento}</span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  {cliente.nome}
                </h3>
                {isCritico && (
                  <Badge variant="destructive" className="text-[10px] py-0 px-2">
                    Crítico
                  </Badge>
                )}
                {isVip && (
                  <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] py-0 px-2">
                    VIP
                  </Badge>
                )}
                {seat.status === "normal" && (
                  <Badge variant="outline" className="text-[10px] py-0 px-2">
                    Normal
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                <span className="font-medium text-foreground">{cliente.id_cliente}</span>
                <span>•</span>
                <span>Tier: <strong className="text-[#0077C8] dark:text-[#38BDF8]">{cliente.tier_fidelidade}</strong></span>
                <span>•</span>
                <span>{cliente.persona}</span>
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label="Fechar painel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {/* Conteúdo com Scroll */}
      <CardContent className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
        {/* Métricas Analíticas do Passageiro (Camada Gold) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-border">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
              CLV Estimado
            </span>
            <span className="text-sm font-bold text-foreground block mt-0.5">
              {formatCurrency(cliente.clv_previsto)}
            </span>
            <span className="text-[9px] text-muted-foreground block truncate">
              {cliente.faixa_pareto}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-border">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Risco Evasão
            </span>
            <span
              className={cn(
                "text-sm font-bold block mt-0.5",
                riscoPerc >= 60
                  ? "text-rose-600 dark:text-rose-400"
                  : riscoPerc >= 40
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {riscoPerc}% {riscoPerc >= 60 ? "• Crítico" : ""}
            </span>
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  riscoPerc >= 60 ? "bg-rose-500" : riscoPerc >= 40 ? "bg-amber-500" : "bg-emerald-500"
                )}
                style={{ width: `${Math.min(riscoPerc, 100)}%` }}
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-border col-span-2 sm:col-span-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Atrito Acumulado
            </span>
            <span className="text-sm font-bold text-foreground block mt-0.5">
              {cliente.score_atrito_acumulado.toFixed(1)} pts
            </span>
            <span className="text-[9px] text-muted-foreground block">
              {cliente.score_atrito_acumulado > 3 ? "Atrasos / Cancelamentos" : "Sem histórico grave"}
            </span>
          </div>
        </div>

        {/* Bloco de Recomendação do Motor de Bordo */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#0077C8] dark:text-[#38BDF8]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Recomendação de Bordo (Árbitro & Uplift)
              </h4>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onRerun(seat)}
              disabled={isSimulating}
              className="h-7 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className={cn("h-3 w-3", isSimulating && "animate-spin")} />
              <span>Recalcular</span>
            </Button>
          </div>

          {/* Estado de Carregamento */}
          {isSimulating && (
            <div className="p-6 rounded-2xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/50 dark:bg-sky-950/20 text-center space-y-3 animate-pulse">
              <div className="flex justify-center">
                <div className="h-8 w-8 rounded-full border-2 border-[#0077C8] border-t-transparent animate-spin" />
              </div>
              <p className="text-xs font-semibold text-foreground">
                Árbitro de Bordo calculando Uplift & gerando instrução tática...
              </p>
              <p className="text-[10px] text-muted-foreground">
                Avaliando catálogo exclusivo de bordo: Abordagem, Bebida Cortesia e Snack Extra.
              </p>
            </div>
          )}

          {/* Erro de Simulação */}
          {simulationError && !isSimulating && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Falha na recomendação de bordo</AlertTitle>
              <AlertDescription className="text-xs">
                {simulationError.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Resultado da Recomendação */}
          {simulationResult && !isSimulating && (
            <div className="space-y-3.5">
              {/* Card da Ação Vencedora */}
              {(() => {
                const IconAcao = getActionIcon(simulationResult.acao_sugerida);
                return (
                  <div className="p-4 rounded-2xl border border-[#0077C8]/40 dark:border-[#38BDF8]/30 bg-gradient-to-br from-blue-50/80 to-white dark:from-slate-900 dark:to-[#071324] shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-[#0077C8] text-white flex items-center justify-center">
                          <IconAcao className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                            Ação Recomendada pelo Motor
                          </span>
                          <span className="text-sm font-bold text-foreground">
                            {getActionBadgeLabel(simulationResult.acao_sugerida)}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 text-[10px] font-bold"
                      >
                        Custo: {formatCurrency(simulationResult.custo_acao)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">
                          Retorno Líquido Estimado
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(simulationResult.retorno_liquido)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">
                          Catálogo Aplicado
                        </span>
                        <span className="font-semibold text-foreground">
                          Exclusivo de Bordo
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Card Tático da Tripulação (Instrução do Comissário) */}
              <div className="relative rounded-2xl border border-amber-300/80 dark:border-amber-600/60 bg-amber-50/60 dark:bg-amber-950/30 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Instrução Tática para a Tripulação</span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyInstruction(simulationResult.instrucao_comissario)}
                    className="h-7 text-[10px] gap-1 px-2 text-amber-800 dark:text-amber-300 hover:bg-amber-200/50 dark:hover:bg-amber-900/50"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar Instrução</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Caixa de Texto da Instrução (Estilo iPad Crew App) */}
                <div className="rounded-xl bg-white/90 dark:bg-slate-900/80 p-3.5 border border-amber-200 dark:border-amber-900/70 text-xs text-foreground leading-relaxed shadow-inner font-sans">
                  <p className="italic">
                    &ldquo;{simulationResult.instrucao_comissario}&rdquo;
                  </p>
                </div>

                <div className="text-[10px] text-amber-800/80 dark:text-amber-400 flex items-center justify-between pt-1">
                  <span>Gerado via LLM RAG + Regras Azul Fidelidade</span>
                  <span>Alinhado ao protocolo de bordo</span>
                </div>
              </div>
            </div>
          )}

          {/* Caso ainda não tenha executado simulação (ex: passageiro normal) */}
          {!simulationResult && !isSimulating && !simulationError && (
            <div className="p-4 rounded-xl border border-dashed border-border text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                Passageiro com status regular. Você pode rodar a recomendação de bordo individual para avaliar gentilezas proativas.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRerun(seat)}
                className="text-xs"
              >
                Gerar Recomendação de Bordo
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      {/* Footer do Dossiê: Botões de Ação */}
      <div className="p-4 border-t border-border bg-slate-50/70 dark:bg-slate-900/60 shrink-0 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          className="text-xs text-muted-foreground"
        >
          Fechar
        </Button>

        <Button
          size="sm"
          onClick={() => onMarkAttended(seat.assento)}
          className={cn(
            "text-xs gap-1.5 font-bold transition-colors cursor-pointer",
            isAttended
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-[#0077C8] hover:bg-[#005a99] text-white"
          )}
        >
          {isAttended ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Passageiro Já Atendido</span>
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Marcar Ação Concluída</span>
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

