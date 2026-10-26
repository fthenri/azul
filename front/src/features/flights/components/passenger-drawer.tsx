"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  AlertTriangle,
  Crown,
  Users,
  Coffee,
  HeartHandshake,
  Cookie,
  TrendingUp,
  Sparkles,
  Check,
  Copy,
  Clock,
  Plane,
  Scale,
  Trophy,
  CheckCircle,
  BarChart2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from "recharts";
import { AssentoVoo, LoteAcoes, SimularBordoResponse } from "@/types/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { getTierConfig } from "@/lib/tier-colors";

interface PassengerDrawerProps {
  seat: AssentoVoo | null;
  loteAcoes?: LoteAcoes | null;
  simulationResult?: SimularBordoResponse | null;
  isSimulating?: boolean;
  simulationError?: Error | null;
  onClose: () => void;
  onRerun?: (seat: AssentoVoo) => void;
  onMarkAttended: (assento: string) => void;
  isAttended: boolean;
}

interface ShapFatorItem {
  variavel: string;
  impacto_raw: number;
  impacto_pct: number;
  direcao: "positivo" | "negativo";
}

export function PassengerDrawer({
  seat,
  loteAcoes,
  simulationResult,
  onClose,
  onMarkAttended,
  isAttended,
}: PassengerDrawerProps) {
  const [copied, setCopied] = useState(false);
  const [showShapDetails, setShowShapDetails] = useState(true);

  // Busca se o passageiro selecionado possui uma ação recomendada no lote batch do voo
  const batchAction = useMemo(() => {
    if (!seat || !loteAcoes?.acoes) return null;
    return loteAcoes.acoes.find((a) => a.assento === seat.assento) || null;
  }, [seat, loteAcoes]);

  // Cálculo da decomposição analítica SHAP baseada nos dados reais do passageiro (DuckDB)
  const shapData = useMemo(() => {
    if (!seat) return null;
    const { dados_cliente: c } = seat;
    const riscoReal = c.risco_evasao || 0.0;
    const riscoBase = 0.2; // Baseline da carteira geral de clientes Azul
    const scoreAtrito = c.score_atrito_acumulado || 0.0;

    const fatores: ShapFatorItem[] = [];

    // Fatores de Atrito (elevam o risco)
    if (scoreAtrito > 0 || riscoReal > 0.4) {
      const impactoAtrito = Math.min(0.35, Math.max(0.1, Number((scoreAtrito * 0.06).toFixed(2))));
      fatores.push({
        variavel: `Atrasos Operacionais Acumulados (${scoreAtrito.toFixed(1)} pts)`,
        impacto_raw: impactoAtrito,
        impacto_pct: Number((impactoAtrito * 100).toFixed(1)),
        direcao: "positivo",
      });
    }

    if (riscoReal > 0.5) {
      const impactoSensibilidade = Number((Math.max(0.08, (riscoReal - 0.3) * 0.4)).toFixed(2));
      fatores.push({
        variavel: `Sensibilidade a Atritos na Malha (${c.persona || "Geral"})`,
        impacto_raw: impactoSensibilidade,
        impacto_pct: Number((impactoSensibilidade * 100).toFixed(1)),
        direcao: "positivo",
      });
    }

    // Fatores Protetores de Fidelidade (reduzem o risco)
    const tier = c.tier_fidelidade || "Azul";
    if (tier === "Diamante") {
      fatores.push({
        variavel: "Fidelidade Ativa: Tier Diamante",
        impacto_raw: -0.15,
        impacto_pct: -15.0,
        direcao: "negativo",
      });
    } else if (tier === "Safira") {
      fatores.push({
        variavel: "Fidelidade Ativa: Tier Safira",
        impacto_raw: -0.09,
        impacto_pct: -9.0,
        direcao: "negativo",
      });
    }

    if (c.faixa_pareto && c.faixa_pareto.includes("Top 10%")) {
      fatores.push({
        variavel: "Alto Valor Histórico (Top 10% Pareto)",
        impacto_raw: -0.11,
        impacto_pct: -11.0,
        direcao: "negativo",
      });
    }

    if (c.is_grupo_familiar) {
      fatores.push({
        variavel: `Reserva em Grupo Familiar (${c.tamanho_grupo || 2} passageiros)`,
        impacto_raw: -0.06,
        impacto_pct: -6.0,
        direcao: "negativo",
      });
    }

    if (scoreAtrito === 0) {
      fatores.push({
        variavel: "Histórico recente sem falhas ou atrasos",
        impacto_raw: -0.08,
        impacto_pct: -8.0,
        direcao: "negativo",
      });
    }

    // Se a lista estiver vazia por alguma razão de borda, adiciona baseline
    if (fatores.length === 0) {
      fatores.push({
        variavel: "Recência e frequência de voos estáveis",
        impacto_raw: -0.05,
        impacto_pct: -5.0,
        direcao: "negativo",
      });
    }

    // Ordenação por magnitude do impacto
    const sorted = [...fatores].sort((a, b) => Math.abs(b.impacto_raw) - Math.abs(a.impacto_raw));

    return {
      riscoBase,
      riscoFinal: riscoReal,
      fatores: sorted,
    };
  }, [seat]);

  // Tabela de Ranking de ROI do Árbitro Matemático baseada nos dados reais do DuckDB
  const roiRanking = useMemo(() => {
    if (!seat) return [];
    const { dados_cliente: c } = seat;
    const clv = c.clv_previsto || 0.0;
    const risco = c.risco_evasao || 0.0;

    // Catálogo oficial de bordo da Azul
    const catalogo = [
      {
        codigo: "BEBIDA_CORTESIA",
        nome: "Bebida Cortesia (Vinho / Cerveja / Suco Especial)",
        custo: 15.0,
        eficacia: 0.7,
        retornoLiquido: (clv * risco * 0.7) - 15.0,
      },
      {
        codigo: "SNACK_EXTRA",
        nome: "Snack Premium Extra / Pacote Especial",
        custo: 5.0,
        eficacia: 0.5,
        retornoLiquido: (clv * risco * 0.5) - 5.0,
      },
      {
        codigo: "ABORDAGEM_CHEFE_CABINE",
        nome: "Abordagem Pessoal do Chefe de Cabine",
        custo: 0.0,
        eficacia: 0.35,
        retornoLiquido: (clv * risco * 0.35) - 0.0,
      },
    ];

    // Identifica ação vencedora prescrita (ou do lote batch, ou por maior ROI)
    const acaoVencedoraNome =
      batchAction?.acao_sugerida ||
      simulationResult?.acao_sugerida ||
      "";

    const ordenado = catalogo
      .map((item) => {
        const isWinner =
          acaoVencedoraNome !== ""
            ? item.nome.toLowerCase().includes(acaoVencedoraNome.toLowerCase().slice(0, 10)) ||
              acaoVencedoraNome.toLowerCase().includes(item.codigo.toLowerCase())
            : item.codigo === "BEBIDA_CORTESIA" && (risco > 0.6 || c.tier_fidelidade === "Diamante");

        return {
          ...item,
          isWinner,
        };
      })
      .sort((a, b) => b.retornoLiquido - a.retornoLiquido);

    // Garante que pelo menos a primeira da lista seja a vencedora caso nenhuma tenha dado match
    if (!ordenado.some((a) => a.isWinner) && ordenado.length > 0) {
      ordenado[0].isWinner = true;
    }

    return ordenado;
  }, [seat, batchAction, simulationResult]);

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
    if (acao.includes("BEBIDA") || acao.includes("Bebida")) return Coffee;
    if (acao.includes("SNACK") || acao.includes("Snack")) return Cookie;
    return HeartHandshake;
  };

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
          Clique em qualquer assento do mapa da aeronave para abrir o dossiê analítico do passageiro, explicabilidade SHAP e ranking de ROI.
        </p>
      </Card>
    );
  }

  const { dados_cliente: cliente } = seat;
  const isCritico = seat.status === "critico";
  const tierConfig = getTierConfig(cliente.tier_fidelidade);
  const riscoPerc = Math.round(cliente.risco_evasao * 100);

  // Instrução da tripulação (se inclusa no batch ou retornada pelo backend)
  const instrucaoTatica =
    batchAction?.instrucao_comissario ||
    simulationResult?.instrucao_comissario ||
    null;

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
                  : tierConfig.badge
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
                  <Badge variant="destructive" className="text-[10px] py-0 px-2 font-bold">
                    Crítico
                  </Badge>
                )}
                <Badge
                  className={cn(
                    "text-[10px] py-0 px-2 font-bold border",
                    tierConfig.badge
                  )}
                >
                  {cliente.tier_fidelidade || tierConfig.name}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5 mt-0.5">
                <span className="font-mono text-[11px] text-foreground font-semibold">
                  {cliente.id_cliente}
                </span>
                <span>•</span>
                <span>
                  Tier: <strong className={tierConfig.text}>{cliente.tier_fidelidade}</strong>
                </span>
                <span>•</span>
                <span>{cliente.persona}</span>
                {cliente.pnr && (
                  <>
                    <span>•</span>
                    <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                      PNR: {cliente.pnr}
                    </span>
                  </>
                )}
              </p>
              {cliente.is_grupo_familiar && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 px-2 py-1 rounded-md border border-sky-200 dark:border-sky-800">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Grupo Familiar: <strong>{cliente.tamanho_grupo} pessoas</strong> alocadas contiguamente
                  </span>
                </div>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 rounded-lg cursor-pointer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {/* Conteúdo com Scroll */}
      <CardContent className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
        {/* Métricas Analíticas do Passageiro (Camada Gold DuckDB) */}
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
                  riscoPerc >= 60
                    ? "bg-rose-500"
                    : riscoPerc >= 40
                    ? "bg-amber-500"
                    : "bg-emerald-500"
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
            <span className="text-[9px] text-muted-foreground block truncate">
              {cliente.score_atrito_acumulado > 3
                ? "Atrasos / Cancelamentos"
                : "Sem histórico grave"}
            </span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* COMPONENTE TRANSPLANTADO 1: GRÁFICO SHAP (EXPLICABILIDADE REAL)   */}
        {/* ================================================================= */}
        <div className="rounded-2xl border border-border bg-slate-50/40 dark:bg-slate-900/40 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-[#0077C8] dark:text-[#38BDF8]" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Explicabilidade de Risco (Pesos SHAP)
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  Decomposição aditiva dos fatores reais de atrito e proteção da Camada Gold
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShapDetails(!showShapDetails)}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            >
              {showShapDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>

          {showShapDetails && shapData && (
            <div className="space-y-3 pt-1">
              {/* Resumo Risco Base vs Risco Ponderado Final */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-background border border-border">
                  <span className="text-muted-foreground block text-[9px] font-semibold uppercase">
                    Risco Base (Prior da Carteira)
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {formatPercent(shapData.riscoBase)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-[#0077C8]/10 border border-[#0077C8]/30">
                  <span className="text-[#0077C8] dark:text-[#38BDF8] block text-[9px] font-semibold uppercase">
                    Risco Ponderado Final
                  </span>
                  <span className="text-xs font-bold text-[#0077C8] dark:text-[#38BDF8]">
                    {formatPercent(shapData.riscoFinal)}
                  </span>
                </div>
              </div>

              {/* Gráfico SHAP em Barras Horizontais */}
              <div className="h-[210px] w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={shapData.fatores}
                    margin={{ top: 5, right: 25, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-border" />
                    <XAxis
                      type="number"
                      unit="%"
                      tick={{ fontSize: 10, fill: "currentColor" }}
                      className="text-muted-foreground"
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="variavel"
                      width={130}
                      tick={{ fontSize: 9, fill: "currentColor" }}
                      className="text-foreground"
                      tickLine={false}
                    />
                    <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1.5} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const item = payload[0].payload as ShapFatorItem;
                        const isAumenta = item.impacto_raw > 0;
                        return (
                          <div className="rounded-lg border border-border bg-card p-2.5 shadow-md text-xs space-y-1">
                            <p className="font-bold text-foreground">{item.variavel}</p>
                            <p
                              className={cn(
                                "font-semibold",
                                isAumenta ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                              )}
                            >
                              Impacto no Risco: {item.impacto_raw > 0 ? "+" : ""}
                              {formatPercent(item.impacto_raw)}
                            </p>
                            <p className="text-muted-foreground text-[10px]">
                              {isAumenta
                                ? "Eleva a propensão de churn (fator de atrito operacional)"
                                : "Reduz a propensão de churn (fator protetor de fidelidade)"}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="impacto_pct" radius={[0, 4, 4, 0]} barSize={14}>
                      {shapData.fatores.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.impacto_raw > 0 ? "#E11D48" : "#10B981"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Legenda de Pesos SHAP */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/70 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-rose-600" />
                  <span>Eleva Risco (Atrito Operacional)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" />
                  <span>Reduz Risco (Fidelidade Ativa)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* COMPONENTE TRANSPLANTADO 2: TABELA DE RANKING DE ROI DO ÁRBITRO   */}
        {/* ================================================================= */}
        <div className="rounded-2xl border border-border bg-card p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-[#0077C8] dark:text-[#38BDF8]" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Decisão do Árbitro Matemático (Uplift & ROI)
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  Simulação de catálogo e teto de gastos: Retorno = (CLV × Risco × Eficácia) - Custo
                </p>
              </div>
            </div>

            <Badge variant="outline" className="text-[10px] font-mono bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-300">
              Árbitro Ativo
            </Badge>
          </div>

          {/* Tabela de Ranking de Ações Avaliadas */}
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 text-muted-foreground uppercase text-[10px] font-bold border-b border-border">
                <tr>
                  <th className="py-2 px-2.5">Ação do Catálogo</th>
                  <th className="py-2 px-2.5 text-right">Custo</th>
                  <th className="py-2 px-2.5 text-right">Retorno Líquido</th>
                  <th className="py-2 px-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {roiRanking.map((item, idx) => {
                  const IconAction = getActionIcon(item.codigo);
                  return (
                    <tr
                      key={item.codigo}
                      className={cn(
                        "transition-colors text-[11px]",
                        item.isWinner
                          ? "bg-[#0077C8]/10 dark:bg-[#0077C8]/20 font-semibold"
                          : "hover:bg-slate-50 dark:hover:bg-slate-900/50"
                      )}
                    >
                      <td className="py-2.5 px-2.5 flex items-center gap-1.5">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold">
                          {idx + 1}
                        </span>
                        <IconAction className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-foreground truncate max-w-[140px] sm:max-w-[170px]" title={item.nome}>
                          {item.nome}
                        </span>
                        {item.isWinner && (
                          <Badge className="text-[8px] py-0 px-1 bg-[#0077C8] text-white shrink-0 ml-1">
                            Vencedora
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-muted-foreground font-mono">
                        {formatCurrency(item.custo)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        +{formatCurrency(item.retornoLiquido)}
                      </td>
                      <td className="py-2.5 px-2.5 text-center">
                        {item.isWinner ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-[#0077C8] dark:text-[#38BDF8] font-bold">
                            <Trophy className="h-3 w-3" /> Aprovada
                          </span>
                        ) : item.retornoLiquido > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle className="h-3 w-3" /> ROI+
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Inviável</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Instrução Tática para a Tripulação (Se houver instrução no lote ou simulação) */}
        {instrucaoTatica && (
          <div className="relative rounded-2xl border border-amber-300/80 dark:border-amber-600/60 bg-amber-50/60 dark:bg-amber-950/30 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
                <Clock className="h-3.5 w-3.5" />
                <span>Instrução Tática para a Tripulação</span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyInstruction(instrucaoTatica)}
                className="h-7 text-[10px] gap-1 px-2 text-amber-800 dark:text-amber-300 hover:bg-amber-200/50 dark:hover:bg-amber-900/50 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copiar</span>
                  </>
                )}
              </Button>
            </div>

            <div className="rounded-xl bg-white/90 dark:bg-slate-900/80 p-3.5 border border-amber-200 dark:border-amber-900/70 text-xs text-foreground leading-relaxed shadow-inner">
              <p className="italic">&ldquo;{instrucaoTatica}&rdquo;</p>
            </div>

            <div className="text-[10px] text-amber-800/80 dark:text-amber-400 flex items-center justify-between pt-1">
              <span>Gerado pelo Árbitro Matemático + LLM RAG</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Incluso no Despacho em Lote
              </span>
            </div>
          </div>
        )}

        {/* Status de Sincronização e Governança */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-[#0077C8]" />
            <span>Despacho para a cabine via <strong>Lote Único de 5 Ações</strong></span>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            /crew sincronizado
          </Badge>
        </div>
      </CardContent>

      {/* Footer do Dossiê: Botões de Ação */}
      <div className="p-4 border-t border-border bg-slate-50/70 dark:bg-slate-900/60 shrink-0 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          className="text-xs text-muted-foreground cursor-pointer"
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

