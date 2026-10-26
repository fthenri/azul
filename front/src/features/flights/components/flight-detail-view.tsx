"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Plane,
  AlertTriangle,
  Crown,
  Users,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Smartphone,
  Send,
  Clock,
  DollarSign,
  TrendingUp,
  RefreshCw,
  ShieldCheck,
  Check,
  Eye,
  User,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useDemoMode } from "@/components/providers/demo-mode-context";
import { getDemoFlightDetail } from "@/lib/demo-data";
import { AssentoVoo, VooDetalheResponse } from "@/types/api";
import { CrewSeatMap, SeatMapRole } from "@/features/crew-view/components/crew-seat-map";
import { PassengerDrawer } from "./passenger-drawer";
import { SeatFilter } from "@/features/crew-view/hooks/use-crew-flight";
import {
  dispatchBatchFlightAndMissions,
  getActiveFlight,
  SyncMission,
  ActiveFlight,
} from "@/lib/sync-storage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface FlightDetailViewProps {
  flightId: string;
}

export function FlightDetailView({ flightId }: FlightDetailViewProps) {
  const { isDemoMode } = useDemoMode();

  // Estados locais
  const [selectedSeat, setSelectedSeat] = useState<AssentoVoo | null>(null);
  const [activeLeftTab, setActiveLeftTab] = useState<"lote" | "dossie">("lote");
  const [filter, setFilter] = useState<SeatFilter>("todos");
  const [attendedSeats, setAttendedSeats] = useState<Set<string>>(new Set());
  const [isSyncSuccess, setIsSyncSuccess] = useState(false);
  const [activeFlightStorage, setActiveFlightStorage] = useState<ActiveFlight | null>(null);

  // Monitora se o voo atual já está despachado no storage local
  useEffect(() => {
    const current = getActiveFlight();
    setActiveFlightStorage(current);

    const handleSync = () => {
      setActiveFlightStorage(getActiveFlight());
    };

    window.addEventListener("storage", handleSync);
    window.addEventListener("local-storage-update", handleSync);

    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("local-storage-update", handleSync);
    };
  }, []);

  // Busca detalhes do voo, passageiros reais do DuckDB e o lote de ações recomendadas
  const {
    data: flight,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<VooDetalheResponse, Error>({
    queryKey: ["flight-detail", flightId, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        return getDemoFlightDetail(flightId);
      }
      return api.getFlightById(flightId);
    },
    staleTime: 1000 * 60, // 1 minuto
  });

  const seats = useMemo(() => flight?.assentos || [], [flight?.assentos]);
  const metadata = flight?.metadata_aeronave;
  const loteAcoes = flight?.lote_acoes;

  // Verificação de despacho ativo para este voo
  const isThisFlightDispatched = useMemo(() => {
    if (!activeFlightStorage) return false;
    const cleanId = String(flightId).replace("AD", "").replace(" ", "").trim();
    const storageId = String(activeFlightStorage.id).replace("AD", "").replace(" ", "").trim();
    return cleanId === storageId;
  }, [activeFlightStorage, flightId]);

  // Contadores de cabine
  const seatCounts = useMemo(() => {
    let criticos = 0;
    let vips = 0;
    let familias = 0;

    seats.forEach((s) => {
      if (s.status === "critico") criticos++;
      if (s.status === "vip") vips++;
      if (s.dados_cliente?.is_grupo_familiar) familias++;
    });

    return {
      total: seats.length,
      criticos,
      vips,
      familias,
    };
  }, [seats]);

  // Clique de inspeção pura no assento (SEM disparar mutação nem sincronização automática)
  const handleSelectSeat = (seat: AssentoVoo) => {
    setSelectedSeat(seat);
    setActiveLeftTab("dossie");
  };

  const handleCloseDrawer = () => {
    setSelectedSeat(null);
    setActiveLeftTab("lote");
  };

  const handleMarkAttended = (assento: string) => {
    setAttendedSeats((prev) => {
      const next = new Set(prev);
      if (next.has(assento)) {
        next.delete(assento);
      } else {
        next.add(assento);
      }
      return next;
    });
  };

  // Aprovação em Lote (Batch) e Sincronização Única com a Cabine (/crew)
  const handleBatchApproveAndSync = () => {
    if (!flight || !loteAcoes) return;

    const aircraftModel = metadata?.modelo || "Airbus A320neo";
    const layout = metadata?.layout?.length === 4 ? "2x2" : "3x3";
    const totalRows = metadata?.fileiras || 29;

    const missionsToDispatch: Partial<SyncMission>[] = loteAcoes.acoes.map((acao) => {
      const matchingSeat = seats.find((s) => s.assento === acao.assento);
      const passenger = matchingSeat?.dados_cliente;
      const rawBatchMsg =
        passenger?.mensagem_llm_batch ||
        (passenger as any)?.llm_mensagem_comissaria ||
        acao.mensagem_llm_batch ||
        acao.llm_mensagem_comissaria;
      const instrucaoTexto =
        rawBatchMsg && typeof rawBatchMsg === "string" && rawBatchMsg.trim().length > 0
          ? rawBatchMsg.trim()
          : (acao.instrucao_comissario || "Instrução pendente. Siga o protocolo padrão do Tier.");

      return {
        id: acao.id_missao,
        assento: acao.assento,
        passageiro: acao.passageiro,
        instrucao: instrucaoTexto,
        status: "pendente",
        tipo: acao.tipo,
        persona: acao.persona,
        tier: acao.tier,
        statusBadge: acao.status_badge,
        gatilho: acao.gatilho,
        acao: acao.acao_sugerida,
        criadaEm: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      };
    });

    dispatchBatchFlightAndMissions(
      {
        id: flight.id,
        rota: flight.rota,
        origem: flight.origem,
        destino: flight.destino,
        status: "ativo",
        despachado: true,
        despachadoEm: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        aeronave: aircraftModel,
        aircraft_model: aircraftModel,
        layout: layout,
        total_rows: totalRows,
        fileiras: totalRows,
        totalPassageiros: seats.length,
        assentos: seats,
        metadata: {
          ...metadata,
          aircraft_model: aircraftModel,
          layout: layout,
          modelo: aircraftModel,
          codigo: metadata?.codigo || "A320neo",
          fileiras: totalRows,
          total_assentos: metadata?.total_assentos || 174,
        },
      },
      missionsToDispatch
    );

    setIsSyncSuccess(true);
    setTimeout(() => setIsSyncSuccess(false), 5000);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-[#0077C8]" />
        <p className="text-sm font-semibold text-foreground">
          Carregando dados reais do voo no DuckDB e processando lote de IA...
        </p>
        <p className="text-xs text-muted-foreground">
          Calculando Valor em Risco e agrupando reservas por PNR
        </p>
      </div>
    );
  }

  if (isError || !flight) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <AlertTriangle className="h-10 w-10 text-rose-600" />
        <h2 className="text-lg font-bold text-foreground">Falha ao carregar voo</h2>
        <p className="text-xs text-muted-foreground max-w-md">
          {error?.message || "Não foi possível carregar os dados deste voo."}
        </p>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/flights">
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Voltar para a Malha</span>
            </Button>
          </Link>
          <Button size="sm" onClick={() => refetch()} className="text-xs">
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barra Superior de Navegação e Status do Voo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/flights">
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" aria-label="Voltar">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-foreground">
                Voo {flight.numero_voo}
              </h1>
              <Badge variant="outline" className="text-xs font-mono font-bold">
                {flight.rota}
              </Badge>
              {isThisFlightDispatched && (
                <Badge className="bg-emerald-600 text-white gap-1 text-[11px]">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Sincronizado na Cabine</span>
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
              <span>{metadata?.modelo || "Airbus A320neo"}</span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono">
                <Clock className="h-3 w-3 opacity-60" />
                {flight.partida_prevista.replace("T", " ")}
              </span>
              <span>•</span>
              <span>{seats.length} passageiros alocados</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleBatchApproveAndSync}
            className="text-xs gap-2 h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Aprovar e Sincronizar com a Cabine</span>
          </Button>

          <Link href="/crew" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 h-9">
              <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
              <span>Ver App Comissária</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Alerta de Sucesso de Sincronização */}
      {isSyncSuccess && (
        <Alert className="bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <AlertTitle className="text-xs font-bold">Lote Aprovado com Sucesso!</AlertTitle>
          <AlertDescription className="text-xs text-emerald-800 dark:text-emerald-200">
            O plano tático com as 5 ações recomendadas e a planta de cabine foram despachados para a tripulação de bordo em tempo real.
          </AlertDescription>
        </Alert>
      )}

      {/* Grid Principal: Lote de Ações Recomendadas (Batch) + Mapa de Cabine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda/Topo: Painel de Decisão (Lote de Ações da IA ou Dossiê do Passageiro) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4">
          {/* Seletor de visualização quando há passageiro selecionado */}
          {selectedSeat && (
            <div className="flex items-center justify-between p-1.5 bg-slate-100 dark:bg-slate-900 rounded-xl border border-border">
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant={activeLeftTab === "lote" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveLeftTab("lote")}
                  className={cn(
                    "text-xs h-8 gap-1.5 cursor-pointer",
                    activeLeftTab === "lote"
                      ? "bg-[#0077C8] text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>5 Ações da IA</span>
                </Button>

                <Button
                  type="button"
                  variant={activeLeftTab === "dossie" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveLeftTab("dossie")}
                  className={cn(
                    "text-xs h-8 gap-1.5 cursor-pointer",
                    activeLeftTab === "dossie"
                      ? "bg-[#0077C8] text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Assento {selectedSeat.assento}</span>
                  {selectedSeat.dados_cliente?.is_grupo_familiar && (
                    <Badge variant="outline" className="text-[9px] py-0 px-1 bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-300 dark:border-sky-800 font-mono">
                      PNR: {selectedSeat.dados_cliente.pnr}
                    </Badge>
                  )}
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseDrawer}
                title="Fechar dossiê e voltar ao lote de ações"
                className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Renderização Condicional: Dossiê do Passageiro OU Lote de Ações */}
          {selectedSeat && activeLeftTab === "dossie" ? (
            <div className="max-h-[calc(100vh-10rem)] flex flex-col">
              <PassengerDrawer
                seat={selectedSeat}
                flightId={flight?.id || flightId}
                loteAcoes={loteAcoes}
                simulationResult={null}
                isSimulating={false}
                simulationError={null}
                onClose={handleCloseDrawer}
                onRerun={() => {}}
                onMarkAttended={handleMarkAttended}
                isAttended={attendedSeats.has(selectedSeat.assento)}
              />
            </div>
          ) : (
            <Card className="border-border shadow-sm overflow-hidden">
              <CardHeader className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/60 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-[#0077C8]/10 text-[#0077C8] dark:text-[#38BDF8] flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">
                        5 Ações Recomendadas pela IA
                      </CardTitle>
                      <p className="text-[11px] text-muted-foreground">
                        Priorização matemática por Valor em Risco (CLV × Evasão)
                      </p>
                    </div>
                  </div>

                  <Badge variant="outline" className="bg-[#0077C8]/10 text-[#0077C8] dark:text-[#38BDF8] border-[#0077C8]/20 font-mono text-[10px]">
                    Batch Único
                  </Badge>
                </div>

                {/* Resumo Macro Financeiro do Lote */}
                {loteAcoes?.resumo && (
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/60">
                    <div className="p-2 rounded-lg bg-background border border-border">
                      <span className="text-[9px] font-semibold text-muted-foreground uppercase block">
                        Custo Total
                      </span>
                      <span className="text-xs font-bold text-foreground block mt-0.5">
                        {formatCurrency(loteAcoes.resumo.custo_total)}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-background border border-border">
                      <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase block">
                        Retorno Líquido
                      </span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                        {formatCurrency(loteAcoes.resumo.retorno_liquido_total)}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-background border border-border">
                      <span className="text-[9px] font-semibold text-sky-600 dark:text-sky-400 uppercase block">
                        ROI Estimado
                      </span>
                      <span className="text-xs font-bold text-sky-600 dark:text-sky-400 block mt-0.5">
                        {loteAcoes.resumo.roi_projetado}x
                      </span>
                    </div>
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                {loteAcoes?.acoes.map((acao, idx) => {
                  const isCritico = acao.tipo === "atrito";
                  const matchingSeat = seats.find((s) => s.assento === acao.assento);
                  const passenger = matchingSeat?.dados_cliente;
                  const rawBatchMsg =
                    passenger?.mensagem_llm_batch ||
                    (passenger as any)?.llm_mensagem_comissaria ||
                    acao.mensagem_llm_batch ||
                    acao.llm_mensagem_comissaria;
                  const instrucaoTexto =
                    rawBatchMsg && typeof rawBatchMsg === "string" && rawBatchMsg.trim().length > 0
                      ? rawBatchMsg.trim()
                      : "Instrução pendente. Siga o protocolo padrão do Tier.";

                  return (
                    <div
                      key={acao.id_missao || idx}
                      onClick={() => matchingSeat && handleSelectSeat(matchingSeat)}
                      className={cn(
                        "p-3 rounded-xl border text-xs space-y-2 transition-all hover:shadow-xs cursor-pointer hover:border-primary/50",
                        isCritico
                          ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50"
                          : "bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800"
                      )}
                    >
                      {/* Header do Card de Ação */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-8 rounded-md bg-foreground text-background font-mono font-black text-center leading-6 shrink-0 text-xs">
                            {acao.assento}
                          </span>
                          <div>
                            <div className="font-bold text-foreground flex items-center gap-1.5">
                              <span>{acao.passageiro}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                (PNR: {acao.pnr})
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <span className="font-semibold text-primary">{acao.tier}</span>
                              <span>•</span>
                              <span>{acao.persona}</span>
                            </div>
                          </div>
                        </div>

                        <Badge
                          variant={isCritico ? "destructive" : "default"}
                          className={cn(
                            "text-[9px] py-0 px-1.5 shrink-0",
                            !isCritico && "bg-indigo-900 hover:bg-indigo-950 text-white dark:bg-indigo-600"
                          )}
                        >
                          {acao.status_badge}
                        </Badge>
                      </div>

                      {/* Ação Prescrita pelo Árbitro */}
                      <div className="flex items-center justify-between text-[11px] bg-background/80 p-2 rounded-lg border border-border/60">
                        <div>
                          <span className="text-muted-foreground text-[10px] block">Ação do Árbitro:</span>
                          <strong className="text-foreground">{acao.acao_sugerida}</strong>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground block">Retorno Líquido:</span>
                          <strong className="text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(acao.retorno_liquido)}
                          </strong>
                        </div>
                      </div>

                      {/* Instrução Tática Gerada pela IA */}
                      <div className="text-[11px] text-muted-foreground leading-relaxed bg-background/50 p-2 rounded-lg border border-dashed border-border/80 flex items-start gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-[#0077C8] dark:text-[#38BDF8] shrink-0 mt-0.5" />
                        <span>{instrucaoTexto}</span>
                      </div>
                    </div>
                  );
                })}

                <Button
                  onClick={handleBatchApproveAndSync}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 h-9 cursor-pointer mt-2 shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Aprovar Todo o Lote e Sincronizar</span>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Coluna Direita: Mapa de Assentos com Agrupamento por PNR (7 cols no desktop) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-border">
            <CardHeader className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Planta da Cabine & Agrupamento por PNR
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Famílias e reservas em grupo alocadas contiguamente (ícone de grupo). Clique em um assento para inspecionar.
                </p>
              </div>

              {/* Filtros de Assento */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant={filter === "todos" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("todos")}
                  className={cn("text-xs h-7 px-2.5", filter === "todos" && "bg-[#0077C8]")}
                >
                  Todos ({seatCounts.total})
                </Button>
                <Button
                  variant={filter === "critico" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("critico")}
                  className={cn("text-xs h-7 px-2.5", filter === "critico" && "bg-rose-600 text-white")}
                >
                  Críticos ({seatCounts.criticos})
                </Button>
                <Button
                  variant={filter === "vip" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("vip")}
                  className={cn("text-xs h-7 px-2.5", filter === "vip" && "bg-indigo-900 text-white dark:bg-indigo-600 dark:text-white")}
                >
                  Diamante / Safira ({seatCounts.vips})
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 flex flex-col items-center">
              {/* Legenda Visual com Categorias Oficiais Azul Fidelidade */}
              <div className="w-full flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground mb-4 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-border">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-xs bg-rose-500" />
                  <span>Crítico (Risco &gt; 60%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-xs bg-indigo-900 border border-indigo-950 dark:bg-indigo-500/20 dark:border-indigo-400" />
                  <span>Diamante</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-xs bg-blue-200 border border-blue-500 dark:bg-blue-800/40 dark:border-blue-600" />
                  <span>Safira</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-xs bg-cyan-100 border border-cyan-400 dark:bg-cyan-900/30 dark:border-cyan-700" />
                  <span>Topázio</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-xs bg-sky-100 border border-sky-300 dark:bg-sky-900/30 dark:border-sky-800" />
                  <span>Azul Fidelidade</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3 w-3 text-sky-500" />
                  <span>Grupo Familiar</span>
                </div>
              </div>

              {/* Renderização do Mapa */}
              <div className="w-full flex justify-center overflow-x-auto py-2">
                <CrewSeatMap
                  metadata={metadata}
                  seats={seats}
                  selectedSeat={selectedSeat}
                  onSelectSeat={handleSelectSeat}
                  filter={filter}
                  attendedSeats={attendedSeats}
                  role="gestor"
                  aircraftModel={metadata?.modelo}
                  layout={metadata?.layout}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Drawer Mobile (apenas em telas pequenas < lg, estilo bottom sheet para não cobrir a cabine horizontalmente) */}
      {selectedSeat && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 max-h-[80vh] bg-background border-t border-border shadow-2xl rounded-t-2xl overflow-y-auto animate-in slide-in-from-bottom duration-200 p-2">
          <div className="w-12 h-1.5 bg-muted rounded-full mx-auto my-2" />
          <PassengerDrawer
            seat={selectedSeat}
            flightId={flight?.id || flightId}
            loteAcoes={loteAcoes}
            simulationResult={null}
            isSimulating={false}
            simulationError={null}
            onClose={handleCloseDrawer}
            onRerun={() => {}}
            onMarkAttended={handleMarkAttended}
            isAttended={attendedSeats.has(selectedSeat.assento)}
          />
        </div>
      )}
    </div>
  );
}

