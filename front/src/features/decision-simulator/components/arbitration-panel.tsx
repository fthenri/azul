"use client";

import React from "react";
import {
  Scale,
  Trophy,
  CheckCircle,
  AlertOctagon,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  XCircle,
  ArrowRight,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { SimularResponse } from "@/types/api";
import { formatCurrency } from "@/lib/formatters";

interface ArbitrationPanelProps {
  result?: SimularResponse | null;
}

export function ArbitrationPanel({ result }: ArbitrationPanelProps) {
  if (!result) return null;

  const { uplift_status, ranking_acoes, decisao_final } = result;

  const isNaoAgir =
    decisao_final.acao_vencedora.toLowerCase().includes("não agir") ||
    decisao_final.acao_vencedora.toLowerCase().includes("nao fazer nada");

  const isLgpdBlocked =
    decisao_final.acao_vencedora.toLowerCase().includes("lgpd") ||
    decisao_final.acao_vencedora.toLowerCase().includes("opt-out");

  const isBloqueada = isNaoAgir || isLgpdBlocked;

  // Encontra os dados financeiros da ação vencedora
  const acaoVencedoraObj = ranking_acoes.find(
    (a) => a.acao.toLowerCase() === decisao_final.acao_vencedora.toLowerCase()
  );

  const retornoLiquidoVencedor = acaoVencedoraObj?.retorno_liquido || 0;
  const custoAcaoVencedor = acaoVencedoraObj?.custo_acao || 0;

  // Maior retorno líquido para normalização das barras visuais
  const maxRetorno = Math.max(...ranking_acoes.map((a) => Math.max(a.retorno_liquido, 0)), 1);

  return (
    <Card className="rounded-2xl border border-border/80 dark:border-white/10 bg-card/80 dark:bg-[#071120]/80 backdrop-blur-md shadow-xs overflow-hidden">
      {/* ─────────────────────────────────────────────────────────────
          HEADER DA ARBITRAGEM MATEMÁTICA
         ───────────────────────────────────────────────────────────── */}
      <CardHeader className="pb-3 border-b border-border/60 dark:border-white/5 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-400/20 text-[#0077C8] dark:text-sky-400">
              <Scale className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-black tracking-tight text-foreground">
                  Decisão do Árbitro Matemático (Uplift)
                </CardTitle>
                <span className="hidden sm:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-400/20">
                  Otimização de ROI
                </span>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Avaliação algorítmica de retorno líquido calibrada por eficácia e custo de concessão
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              Classificação Uplift:
              <InfoTooltip text="Passageiros persuadíveis mudam de comportamento favoravelmente quando recebem a intervenção." />
            </span>
            <Badge
              className={`text-xs font-bold px-2.5 py-0.5 ${
                uplift_status === "Persuadível"
                  ? "bg-emerald-600 text-white"
                  : "bg-amber-600 text-white"
              }`}
            >
              {uplift_status}
            </Badge>
          </div>
        </div>

        {/* Banner com a Fórmula Matemática Explicada */}
        <div className="mt-2 p-2.5 rounded-xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-sky-600 dark:text-sky-400 font-bold">Fórmula de Uplift:</span>
            <span>Retorno Líquido = (CLV × Risco Churn × Eficácia) - Custo</span>
          </div>
          <span className="text-[10px] text-muted-foreground/80">
            Camada Gold • Restrições do Azul Fidelidade
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-5">
        {/* ─────────────────────────────────────────────────────────────
            HERO CARD DA AÇÃO VENCEDORA / STATUS DE BLOQUEIO
           ───────────────────────────────────────────────────────────── */}
        <div
          className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all duration-300 shadow-sm ${
            isBloqueada
              ? "border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent text-amber-950 dark:text-amber-100"
              : "border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent text-emerald-950 dark:text-emerald-100"
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm ${
                  isBloqueada
                    ? "bg-gradient-to-br from-amber-500 to-amber-700"
                    : "bg-gradient-to-br from-emerald-500 to-emerald-700"
                }`}
              >
                {isBloqueada ? (
                  <AlertOctagon className="h-6 w-6" />
                ) : (
                  <Trophy className="h-6 w-6" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {isBloqueada ? "Salvaguarda Algorítmica Ativada" : "Ação Arbitrada Final (Vencedora)"}
                  </span>
                  <Badge
                    variant={isBloqueada ? "warning" : "success"}
                    className="text-[10px] font-bold"
                  >
                    {isLgpdBlocked
                      ? "Bloqueio LGPD"
                      : isNaoAgir
                      ? "Trava de Eficiência (ROI ≤ 0)"
                      : "Aprovado para Execução"}
                  </Badge>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                  {decisao_final.acao_vencedora}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                  {isLgpdBlocked
                    ? "O titular revogou o consentimento comercial proativo (Art. 7º e 18 da LGPD). Nenhuma oferta disparada para conformidade jurídica."
                    : isNaoAgir
                    ? "Nenhuma ação do catálogo apresentou retorno líquido positivo. Decisão de Não Intervenção acionada para proteger o orçamento da Azul."
                    : "Ação que maximiza o lucro líquido de retenção preservando o teto orçamentário e as diretrizes do Azul Fidelidade."}
                </p>
              </div>
            </div>

            {/* Painel Financeiro da Ação Vencedora */}
            {!isBloqueada && (
              <div className="flex items-center gap-3 self-end lg:self-center p-3 rounded-xl bg-card/80 border border-emerald-500/25 shadow-xs">
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                    Retorno Líquido
                  </span>
                  <p className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(retornoLiquidoVencedor)}
                  </p>
                </div>
                <div className="h-8 w-[1px] bg-border/60" />
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                    Custo da Concessão
                  </span>
                  <p className="text-sm font-bold font-mono text-muted-foreground">
                    {formatCurrency(custoAcaoVencedor)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            MATRIZ COMPARATIVA COM BARRAS DE RETORNO LÍQUIDO
           ───────────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span>Ranking Comparativo das Ações Avaliadas</span>
              <InfoTooltip text="Ordenação decrescente pelo Retorno Líquido. O motor escolhe a primeira opção viável respeitando as travas de fidelidade." />
            </h4>
            <span className="text-[11px] text-muted-foreground font-mono">
              {ranking_acoes.length} intervenções testadas
            </span>
          </div>

          <div className="rounded-xl border border-border/80 dark:border-white/10 overflow-hidden bg-card">
            <div className="divide-y divide-border/60">
              {ranking_acoes.map((item, idx) => {
                const isWinner = item.acao.toLowerCase() === decisao_final.acao_vencedora.toLowerCase();
                const isPositive = item.retorno_liquido > 0;
                const ratioPercent = Math.max(
                  0,
                  Math.min(100, Math.round((item.retorno_liquido / maxRetorno) * 100))
                );

                return (
                  <div
                    key={item.acao}
                    className={`p-3.5 transition-colors ${
                      isWinner
                        ? "bg-sky-50/70 dark:bg-sky-950/30"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black font-mono ${
                            isWinner
                              ? "bg-[#003B7A] dark:bg-sky-500 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <span className="text-xs font-bold text-foreground">
                            {item.acao}
                          </span>
                          {isWinner && (
                            <Badge className="ml-2 text-[9px] py-0 px-1.5 bg-emerald-600 text-white font-bold">
                              Ação Vencedora
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs self-end sm:self-auto">
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
                              isPositive
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {isPositive ? `+${formatCurrency(item.retorno_liquido)}` : "R$ 0,00"}
                          </span>
                        </div>

                        <div className="min-w-[100px] text-right">
                          {isWinner ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle className="h-3.5 w-3.5" /> Escolhida
                            </span>
                          ) : isPositive ? (
                            <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400">
                              ROI Positivo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                              <XCircle className="h-3 w-3 text-rose-500" /> Inviável
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Barra Visual de Retorno Líquido */}
                    <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isWinner
                            ? "bg-emerald-500"
                            : isPositive
                            ? "bg-[#0077C8] dark:bg-sky-400"
                            : "bg-rose-400"
                        }`}
                        style={{ width: `${isPositive ? ratioPercent : 4}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rodapé com Conformidade do Motor */}
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/50 text-[11px] text-muted-foreground">
          <Info className="h-3.5 w-3.5 text-azul-action dark:text-sky-400 shrink-0" />
          <span>
            Travas do Azul Fidelidade ativas: Clientes Diamante possuem isenção de franquia de bagagem e Espaço Azul já contemplados contratualmente.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
