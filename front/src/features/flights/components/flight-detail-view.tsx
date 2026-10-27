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
  Send,
  Clock,
  RefreshCw,
  ShieldAlert,
  User,
  X,
  Database,
} from "lucide-react";
import { api } from "@/lib/api";
import { useDemoMode } from "@/components/providers/demo-mode-context";
import { getDemoFlightDetail } from "@/lib/demo-data";
import { AssentoVoo, VooDetalheResponse } from "@/types/api";
import { SeatMap, SeatFilter } from "./seat-map";
import { PassengerDrawer } from "./passenger-drawer";
import {
  dispatchBatchFlightAndMissions,
  getActiveFlight,
  SyncMission,
  ActiveFlight,
} from "@/lib/sync-storage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  // Clique de inspeção no assento
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

  // Aprovação em Lote (Batch) do Plano de Ações
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
        acao.llm_mensagem_comissaria ||
        acao.instrucao_comissario;
      const rawMsgStr = typeof rawBatchMsg === "string" ? rawBatchMsg : "";
      const isVetada =
        acao.acao_sugerida === "Nenhuma Ação" ||
        acao.retorno_liquido <= 0 ||
        rawMsgStr.includes("Decisão Analítica") ||
        rawMsgStr.includes("Intervenção cancelada") ||
        rawMsgStr.includes("Veto");

      const instrucaoTexto =
        rawMsgStr.trim().length > 0
          ? rawMsgStr.trim()
          : (acao.instrucao_comissario || "Instrução pendente. Siga o protocolo padrão do Tier.");

      return {
        id: acao.id_missao,
        assento: acao.assento,
        passageiro: acao.passageiro,
        instrucao: instrucaoTexto,
        status: isVetada ? "concluida" : "pendente",
        tipo: acao.tipo,
        persona: acao.persona,
        tier: acao.tier,
        statusBadge: isVetada ? "Intervenção Dispensada" : acao.status_badge,
        gatilho: acao.gatilho,
        acao: isVetada ? "Nenhuma Ação" : acao.acao_sugerida,
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
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-semibold text-foreground font-sans">
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
        <h2 className="text-lg font-bold text-foreground font-sans">Falha ao carregar voo</h2>
        <p className="text-xs text-muted-foreground max-w-md">
          {error?.message || "Não foi possível carregar os dados deste voo."}
        </p>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/flights">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 rounded-xl">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Voltar para a Malha</span>
            </Button>
          </Link>
          <Button size="sm" onClick={() => refetch()} className="text-xs rounded-xl">
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-7 selection:bg-primary/30 selection:text-primary">
      {/* ─────────────────────────────────────────────────────────────
          ATMOSFERA VISUAL SUPERIOR (AERO GLOW)
         ───────────────────────────────────────────────────────────── */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-full max-w-5xl h-64 bg-primary/5 blur-[120px] pointer-events-none -z-10 rounded-full" />

      {/* ─────────────────────────────────────────────────────────────
          BARRA SUPERIOR DE NAVEGAÇÃO E STATUS DO VOO
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/80">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/flights">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl border-border bg-card/80 hover:bg-muted text-foreground cursor-pointer shadow-xs"
              aria-label="Voltar para a malha aérea"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-foreground font-sans tracking-tight">
                Voo {flight.numero_voo}
              </h1>
              <Badge className="bg-secondary text-secondary-foreground border border-border text-xs font-mono font-bold px-2.5 py-0.5 rounded-md">
                {flight.rota}
              </Badge>
              {isThisFlightDispatched && (
                <Badge className="bg-emerald-600 text-white gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-md shadow-xs">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Sincronizado na Cabine</span>
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
              <span className="font-medium text-foreground/80">{metadata?.modelo || "Airbus A320neo"}</span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono text-primary">
                <Clock className="h-3 w-3 opacity-70" />
                {flight.partida_prevista.replace("T", " ")}
              </span>
              <span>•</span>
              <span>{seats.length} passageiros alocados</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={handleBatchApproveAndSync}
            className="text-xs gap-2 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Aprovar Plano de Ações</span>
          </Button>
        </div>
      </div>

      {/* Alerta de Sucesso de Sincronização */}
      {isSyncSuccess && (
        <Alert className="rounded-2xl bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200 animate-in fade-in slide-in-from-top-2 shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <AlertTitle className="text-xs font-bold">Lote Aprovado com Sucesso!</AlertTitle>
          <AlertDescription className="text-xs leading-relaxed text-emerald-700 dark:text-emerald-300">
            O plano tático com as ações recomendadas e a planta de cabine foram sincronizados e estão disponíveis para a tripulação.
          </AlertDescription>
        </Alert>
      )}

      {/* ─────────────────────────────────────────────────────────────
          GRID PRINCIPAL: LOTE DE AÇÕES + PLANTA DA CABINE
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda: Lote de Ações IA ou Dossiê do Passageiro */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          {/* Seletor de abas quando há passageiro selecionado */}
          {selectedSeat && (
            <div className="flex items-center justify-between p-1.5 bg-muted/60 backdrop-blur-xl rounded-2xl border border-border/80 shadow-xs">
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant={activeLeftTab === "lote" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveLeftTab("lote")}
                  className={cn(
                    "text-xs h-8 rounded-xl gap-1.5 cursor-pointer font-semibold transition-all",
                    activeLeftTab === "lote"
                      ? "bg-primary text-primary-foreground shadow-xs"
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
                    "text-xs h-8 rounded-xl gap-1.5 cursor-pointer font-semibold transition-all",
                    activeLeftTab === "dossie"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Assento {selectedSeat.assento}</span>
                  {selectedSeat.dados_cliente?.is_grupo_familiar && (
                    <Badge variant="outline" className="text-[9px] py-0 px-1 bg-primary/10 text-primary border-primary/30 font-mono">
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
                className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl cursor-pointer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Dossiê do Passageiro OU Lote de Ações */}
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
            <div className="group relative rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
              {/* Feixe Superior Luminous Edge Highlight */}
              <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

              {/* Cabeçalho do Card */}
              <div className="p-5 border-b border-border/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                      <Sparkles className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground font-sans">
                        5 Ações Recomendadas pela IA
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Priorização matemática por Valor em Risco (CLV × Evasão)
                      </p>
                    </div>
                  </div>

                  <Badge className="bg-primary/10 text-primary border border-primary/20 font-mono text-[10px]">
                    Batch Único
                  </Badge>
                </div>

                {/* Resumo Macro Financeiro do Lote */}
                {loteAcoes?.resumo && (
                  <div className="grid grid-cols-3 gap-2.5 mt-4 pt-3 border-t border-border/70">
                    <div className="p-2.5 rounded-xl bg-background/60 border border-border/80">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                        Custo Total
                      </span>
                      <span className="text-xs font-black text-foreground block mt-0.5 font-sans">
                        {formatCurrency(loteAcoes.resumo.custo_total)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase block">
                        Retorno Líquido
                      </span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block mt-0.5 font-sans">
                        {formatCurrency(loteAcoes.resumo.retorno_liquido_total)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                      <span className="text-[10px] font-semibold text-primary uppercase block">
                        ROI Estimado
                      </span>
                      <span className="text-xs font-black text-primary block mt-0.5 font-sans">
                        {loteAcoes.resumo.roi_projetado}x
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Lista de Ações */}
              <div className="p-4 space-y-3 max-h-[580px] overflow-y-auto scrollbar-thin">
                {loteAcoes?.acoes.map((acao, idx) => {
                  const matchingSeat = seats.find((s) => s.assento === acao.assento);
                  const passenger = matchingSeat?.dados_cliente;
                  const rawBatchMsg =
                    passenger?.mensagem_llm_batch ||
                    (passenger as any)?.llm_mensagem_comissaria ||
                    acao.mensagem_llm_batch ||
                    acao.llm_mensagem_comissaria ||
                    acao.instrucao_comissario;

                  const rawMsgStr = typeof rawBatchMsg === "string" ? rawBatchMsg : "";

                  const isVetoPolitica =
                    rawMsgStr.includes("Veto de Política") ||
                    rawMsgStr.includes("Categoria Básico") ||
                    (acao.acao_sugerida === "Nenhuma Ação" &&
                      (acao.tier === "Basico" || acao.tier === "Básico" || acao.persona === "Turista Eventual") &&
                      (passenger?.score_atrito_acumulado ?? 0) <= 0);

                  const isAcaoVetada =
                    isVetoPolitica ||
                    acao.acao_sugerida === "Nenhuma Ação" ||
                    acao.retorno_liquido <= 0 ||
                    rawMsgStr.includes("Decisão Analítica") ||
                    rawMsgStr.includes("Intervenção cancelada") ||
                    rawMsgStr.includes("Veto");

                  const isCritico = acao.tipo === "atrito" && !isAcaoVetada;

                  const instrucaoTexto =
                    rawMsgStr.trim().length > 0
                      ? rawMsgStr.trim()
                      : isVetoPolitica
                      ? "Decisão Analítica: Veto de Política. Categoria Básico sem histórico de atrito operacional não é elegível a cortesias proativas."
                      : isAcaoVetada
                      ? "Decisão Analítica: Intervenção cancelada. O custo da ação supera a projeção do valor recuperado (ROI Negativo)."
                      : "Instrução pendente. Siga o protocolo padrão do Tier.";

                  return (
                    <div
                      key={acao.id_missao || idx}
                      onClick={() => matchingSeat && handleSelectSeat(matchingSeat)}
                      className={cn(
                        "p-3.5 rounded-xl border text-xs space-y-2.5 transition-all hover:shadow-xs cursor-pointer hover:border-primary/50",
                        isVetoPolitica
                          ? "bg-purple-500/5 border-purple-500/25"
                          : isAcaoVetada
                          ? "bg-amber-500/5 border-amber-500/25"
                          : isCritico
                          ? "bg-rose-500/5 border-rose-500/25"
                          : "bg-muted/40 border-border/80"
                      )}
                    >
                      {/* Header do Card de Ação */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="h-7 w-9 rounded-lg bg-foreground text-background font-mono font-black text-center leading-7 shrink-0 text-xs shadow-xs">
                            {acao.assento}
                          </span>
                          <div>
                            <div className="font-bold text-foreground flex items-center gap-1.5 font-sans text-sm">
                              <span>{acao.passageiro}</span>
                              <span className="text-[10px] text-muted-foreground font-mono font-normal">
                                (PNR: {acao.pnr})
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <span className="font-semibold text-primary">{acao.tier}</span>
                              <span>•</span>
                              <span>{acao.persona}</span>
                            </div>
                          </div>
                        </div>

                        {isVetoPolitica ? (
                          <Badge
                            variant="outline"
                            className="text-[9px] py-0.5 px-2 shrink-0 bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-400/30 font-bold rounded-md"
                          >
                            Veto de Política
                          </Badge>
                        ) : isAcaoVetada ? (
                          <Badge
                            variant="outline"
                            className="text-[9px] py-0.5 px-2 shrink-0 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-400/30 font-bold rounded-md"
                          >
                            Veto Analítico
                          </Badge>
                        ) : (
                          <Badge
                            variant={isCritico ? "destructive" : "default"}
                            className={cn(
                              "text-[9px] py-0.5 px-2 shrink-0 font-bold rounded-md",
                              !isCritico && "bg-indigo-600 text-white"
                            )}
                          >
                            {acao.status_badge}
                          </Badge>
                        )}
                      </div>

                      {/* Ação Prescrita pelo Árbitro */}
                      <div className="flex items-center justify-between text-[11px] bg-background/80 p-2.5 rounded-lg border border-border/70">
                        <div>
                          <span className="text-muted-foreground text-[10px] block font-medium">Ação do Árbitro:</span>
                          <strong className={cn(
                            "font-sans",
                            isVetoPolitica ? "text-purple-700 dark:text-purple-400" : isAcaoVetada ? "text-amber-700 dark:text-amber-400" : "text-foreground"
                          )}>
                            {isAcaoVetada ? "Nenhuma Ação" : acao.acao_sugerida}
                          </strong>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground block font-medium">Retorno Líquido:</span>
                          <strong className={cn(
                            "font-sans",
                            isAcaoVetada ? "text-muted-foreground" : "text-emerald-600 dark:text-emerald-400"
                          )}>
                            {isAcaoVetada ? "R$ 0,00" : formatCurrency(acao.retorno_liquido)}
                          </strong>
                        </div>
                      </div>

                      {/* Instrução Tática Gerada pela IA */}
                      <div className={cn(
                        "text-[11px] leading-relaxed p-2.5 rounded-lg border flex items-start gap-2",
                        isVetoPolitica
                          ? "text-purple-900 dark:text-purple-200 bg-purple-500/10 border-purple-500/20 font-medium"
                          : isAcaoVetada
                          ? "text-amber-900 dark:text-amber-200 bg-amber-500/10 border-amber-500/20 font-medium"
                          : "text-muted-foreground bg-background/60 border-dashed border-border"
                      )}>
                        {isVetoPolitica ? (
                          <ShieldAlert className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                        ) : isAcaoVetada ? (
                          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        ) : (
                          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        )}
                        <span>{instrucaoTexto}</span>
                      </div>
                    </div>
                  );
                })}

                <Button
                  onClick={handleBatchApproveAndSync}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-2 h-10 rounded-xl cursor-pointer mt-2 shadow-xs transition-all active:scale-[0.99]"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Aprovar Todo o Lote e Sincronizar</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Coluna Direita: Planta da Cabine com Agrupamento por PNR */}
        <div className="lg:col-span-7 space-y-4">
          <div className="group relative rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
            {/* Feixe Superior Luminous Edge Highlight */}
            <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

            <div className="p-5 border-b border-border/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground font-sans">
                  Planta da Cabine & Agrupamento por PNR
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Famílias e reservas em grupo alocadas contiguamente. Clique em um assento para inspecionar.
                </p>
              </div>

              {/* Filtros de Assento */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  variant={filter === "todos" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("todos")}
                  className={cn(
                    "text-xs h-8 px-3 rounded-xl font-semibold transition-all cursor-pointer",
                    filter === "todos" ? "bg-primary text-primary-foreground shadow-xs" : "border-border hover:bg-muted"
                  )}
                >
                  Todos ({seatCounts.total})
                </Button>
                <Button
                  variant={filter === "critico" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("critico")}
                  className={cn(
                    "text-xs h-8 px-3 rounded-xl font-semibold transition-all cursor-pointer",
                    filter === "critico" ? "bg-rose-600 hover:bg-rose-700 text-white shadow-xs" : "border-border hover:bg-muted"
                  )}
                >
                  Críticos ({seatCounts.criticos})
                </Button>
                <Button
                  variant={filter === "vip" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("vip")}
                  className={cn(
                    "text-xs h-8 px-3 rounded-xl font-semibold transition-all cursor-pointer",
                    filter === "vip" ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs" : "border-border hover:bg-muted"
                  )}
                >
                  Diamante / Safira ({seatCounts.vips})
                </Button>
              </div>
            </div>

            <div className="p-5 flex flex-col items-center">
              {/* Legenda Visual com Categorias Oficiais */}
              <div className="w-full flex flex-wrap items-center justify-between gap-2.5 text-[11px] text-muted-foreground mb-5 p-3 rounded-xl bg-muted/40 border border-border/80">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-rose-500 shadow-xs" />
                  <span>Crítico (Risco &gt; 60%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-indigo-900 border border-indigo-950 dark:bg-indigo-500/20 dark:border-indigo-400 shadow-xs" />
                  <span>Diamante</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-blue-200 border border-blue-500 dark:bg-blue-800/40 dark:border-blue-600 shadow-xs" />
                  <span>Safira</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-cyan-100 border border-cyan-400 dark:bg-cyan-900/30 dark:border-cyan-700 shadow-xs" />
                  <span>Topázio</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-sky-100 border border-sky-300 dark:bg-sky-900/30 dark:border-sky-800 shadow-xs" />
                  <span>Azul Fidelidade</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span>Grupo Familiar</span>
                </div>
              </div>

              {/* Renderização do Mapa de Assentos */}
              <div className="w-full flex justify-center overflow-x-auto py-2">
                <SeatMap
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
            </div>
          </div>
        </div>
      </div>

      {/* Drawer Mobile */}
      {selectedSeat && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 max-h-[85vh] bg-card border-t border-border shadow-2xl rounded-t-3xl overflow-y-auto animate-in slide-in-from-bottom duration-200 p-3">
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
