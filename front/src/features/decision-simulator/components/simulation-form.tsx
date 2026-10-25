"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Play,
  Sparkles,
  AlertCircle,
  Crown,
  ShieldCheck,
  User,
  Plane,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { Momento } from "@/types/api";
import { formatCurrency, formatPercent } from "@/lib/formatters";

export const simularSchema = z.object({
  momento_id: z.string().min(1, "É obrigatório selecionar ou informar o ID de um momento"),
});

export type SimularFormData = z.infer<typeof simularSchema>;

interface SimulationFormProps {
  selectedMomento: Momento | null;
  onSimulate: (momentoId: string) => void;
  isSimulating: boolean;
  simulationError: Error | null;
  isSimulated?: boolean;
}

export function SimulationForm({
  selectedMomento,
  onSimulate,
  isSimulating,
  simulationError,
  isSimulated = false,
}: SimulationFormProps) {
  const [showManualInput, setShowManualInput] = useState(false);
  const [isDossierExpanded, setIsDossierExpanded] = useState(!isSimulated);

  // Ao mudar de passageiro ou quando a simulação conclui, ajusta o estado padrão
  useEffect(() => {
    if (isSimulated) {
      setIsDossierExpanded(false);
    } else {
      setIsDossierExpanded(true);
    }
  }, [isSimulated, selectedMomento?.id]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SimularFormData>({
    resolver: zodResolver(simularSchema),
    defaultValues: {
      momento_id: selectedMomento?.id || "",
    },
  });

  const currentMomentoId = watch("momento_id");

  useEffect(() => {
    if (selectedMomento) {
      setValue("momento_id", selectedMomento.id, { shouldValidate: true });
    }
  }, [selectedMomento, setValue]);

  const onSubmit = (data: SimularFormData) => {
    onSimulate(data.momento_id);
  };

  const tier = (() => {
    if (!selectedMomento) return "Diamante";
    const clv = selectedMomento.clv_previsto;
    if (clv >= 8000) return "Diamante";
    if (clv >= 5000) return "Safira";
    if (clv >= 3000) return "Topázio";
    return "Básico";
  })();

  const paretoDecil = (() => {
    if (!selectedMomento) return "Top 10%";
    const clv = selectedMomento.clv_previsto;
    if (clv >= 8000) return "Top 10% Receita";
    if (clv >= 4000) return "Top 20% Receita";
    return "Cauda Longa";
  })();

  return (
    <Card className="rounded-2xl border border-border/80 dark:border-white/10 bg-card/80 dark:bg-[#071120]/80 backdrop-blur-md shadow-xs overflow-hidden transition-all duration-300">
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* ─────────────────────────────────────────────────────────────
            MODO COMPACTO ATIVO (QUANDO A SIMULAÇÃO JÁ FOI EXECUTADA)
           ───────────────────────────────────────────────────────────── */}
        {isSimulated && selectedMomento && !isDossierExpanded ? (
          <div className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-muted/20">
            {/* Esquerda: Identificação do Passageiro */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#003B7A] text-white font-bold text-xs shadow-xs border border-sky-400/30">
                <User className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-foreground">
                    Passageiro #{selectedMomento.cliente_id}
                  </span>
                  <Badge className="bg-[#003B7A] dark:bg-sky-950 text-white dark:text-sky-300 border-sky-400/30 text-[9px] font-bold px-1.5 py-0">
                    <Crown className="h-2.5 w-2.5 mr-1 text-sky-400" />
                    {tier}
                  </Badge>
                  <span className="text-[11px] font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0 rounded">
                    {paretoDecil}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate max-w-sm sm:max-w-md">
                  {selectedMomento.persona} • <span className="text-foreground font-medium">{selectedMomento.descricao}</span>
                </p>
              </div>
            </div>

            {/* Centro: Métricas Rápidas */}
            <div className="flex items-center gap-4 text-xs">
              <div className="hidden sm:block text-right">
                <span className="text-[10px] text-muted-foreground uppercase block font-bold">CLV:</span>
                <span className="font-mono font-black text-foreground">
                  {formatCurrency(selectedMomento.clv_previsto)}
                </span>
              </div>
              <div className="hidden sm:block text-right">
                <span className="text-[10px] text-muted-foreground uppercase block font-bold">Risco:</span>
                <span
                  className={`font-mono font-black ${
                    selectedMomento.risco_evasao_atual >= 0.7 ? "text-rose-600" : "text-amber-600"
                  }`}
                >
                  {formatPercent(selectedMomento.risco_evasao_atual)}
                </span>
              </div>

              {/* Botões de Ação Rápida */}
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSimulating}
                  className="h-8 px-3 rounded-xl bg-gradient-to-r from-[#003B7A] to-[#0077C8] hover:from-[#002855] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`h-3 w-3 ${isSimulating ? "animate-spin" : ""}`} />
                  <span>{isSimulating ? "Recalculando..." : "Re-executar"}</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDossierExpanded(true)}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                  title="Expandir Dossiê Completo"
                >
                  <span>Detalhes</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────
              MODO COMPLETO DO DOSSIÊ
             ───────────────────────────────────────────────────────────── */
          <div>
            <CardHeader className="pb-3 border-b border-border/60 dark:border-white/5 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-400/20 text-[#0077C8] dark:text-sky-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-black tracking-tight text-foreground">
                      Dossiê do Passageiro & Disparo do Motor
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground flex items-center gap-1">
                      <span>Arbitragem matemática de Uplift integrada com agente RAG LLM</span>
                      <InfoTooltip text="Calcula o retorno líquido esperado para cada benefício e seleciona a melhor intervenção dentro do teto orçamentário." />
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {isSimulated && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsDossierExpanded(false)}
                      className="text-xs text-muted-foreground hover:text-foreground h-7 px-2 cursor-pointer"
                    >
                      <span>Recolher</span>
                      <ChevronUp className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowManualInput((prev) => !prev)}
                    className="text-[11px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer underline underline-offset-4"
                  >
                    <span>{showManualInput ? "Ocultar Input Manual" : "ID Manual / Debug"}</span>
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${showManualInput ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* Seletor Manual de ID */}
              {showManualInput && (
                <div className="p-3 rounded-xl bg-muted/40 border border-border/70 space-y-2 animate-in fade-in-50 duration-200">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-foreground">
                      Identificador Alvo (Momento ou Cliente)
                    </label>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <span>Exemplos:</span>
                      <button
                        type="button"
                        onClick={() => setValue("momento_id", "mom_789", { shouldValidate: true })}
                        className="font-mono text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                      >
                        mom_789
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setValue("momento_id", "mom_790", { shouldValidate: true })}
                        className="font-mono text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                      >
                        mom_790
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setValue("momento_id", "cli_123", { shouldValidate: true })}
                        className="font-mono text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                      >
                        cli_123
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Informe mom_789, mom_790 ou cli_123..."
                      {...register("momento_id")}
                      className={`flex-1 rounded-xl border px-3 py-2 text-xs font-mono bg-background focus:outline-none focus:ring-2 focus:ring-sky-500/30 ${
                        errors.momento_id
                          ? "border-destructive focus:ring-destructive"
                          : "border-border/80 dark:border-white/10"
                      }`}
                    />
                  </div>

                  {errors.momento_id && (
                    <p className="text-xs text-destructive font-medium">
                      {errors.momento_id.message}
                    </p>
                  )}
                </div>
              )}

              {/* Dossiê Visual Completo */}
              {selectedMomento ? (
                <div className="rounded-xl border border-border/80 dark:border-white/10 bg-card p-4 space-y-3 shadow-xs">
                  {/* Cabeçalho */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/60">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#003B7A] text-white font-bold text-sm shadow-xs border border-sky-400/30">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-foreground">
                            Passageiro #{selectedMomento.cliente_id}
                          </h4>
                          <Badge className="bg-[#003B7A] dark:bg-sky-950 text-white dark:text-sky-300 border-sky-400/30 text-[10px] font-bold px-2">
                            <Crown className="h-2.5 w-2.5 mr-1 text-sky-400" />
                            Tier {tier}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Cluster: <span className="font-semibold text-foreground">{selectedMomento.persona}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <Badge variant="outline" className="text-[11px] font-mono font-bold text-azul-action dark:text-sky-300 border-sky-500/30 bg-sky-500/5">
                        {paretoDecil}
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                        <ShieldCheck className="h-3 w-3" />
                        LGPD Consentida
                      </span>
                    </div>
                  </div>

                  {/* Grid de Métricas */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">
                        CLV Previsto
                      </span>
                      <p className="text-base font-black font-mono text-[#003B7A] dark:text-sky-300">
                        {formatCurrency(selectedMomento.clv_previsto)}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">
                        Risco de Evasão
                      </span>
                      <p
                        className={`text-base font-black font-mono ${
                          selectedMomento.risco_evasao_atual >= 0.7
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {formatPercent(selectedMomento.risco_evasao_atual)}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">
                        Perda Esperada
                      </span>
                      <p className="text-base font-black font-mono text-rose-600 dark:text-rose-400">
                        {formatCurrency(
                          selectedMomento.clv_previsto * selectedMomento.risco_evasao_atual
                        )}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">
                        Tipo de Evento
                      </span>
                      <p className="text-xs font-black text-foreground mt-1">
                        {selectedMomento.tipo_simulacao}
                      </p>
                    </div>
                  </div>

                  {/* Ocorrência */}
                  <div className="rounded-xl bg-sky-500/5 dark:bg-sky-950/30 border border-sky-400/20 p-3 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-sky-900 dark:text-sky-200 mb-1">
                      <Plane className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                      <span>Ocorrência Registrada na Jornada</span>
                    </div>
                    <p className="text-foreground leading-relaxed">
                      {selectedMomento.descricao}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/80 p-6 text-center text-muted-foreground text-xs space-y-2">
                  <User className="h-7 w-7 mx-auto opacity-40 text-sky-500" />
                  <p className="font-semibold text-foreground">Nenhum evento selecionado</p>
                  <p className="text-[11px] max-w-sm mx-auto">
                    Selecione um passageiro da fila à esquerda para carregar o dossiê analítico.
                  </p>
                </div>
              )}

              {/* Alerta de Erro */}
              {simulationError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  <div>
                    <p className="font-bold">Falha no processamento da simulação:</p>
                    <p className="mt-0.5">{simulationError.message}</p>
                  </div>
                </div>
              )}

              {/* Botão de Disparo */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSimulating || !currentMomentoId}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-[#003B7A] via-[#00529B] to-[#0077C8] hover:from-[#002855] hover:to-[#00529B] text-white font-bold text-xs shadow-md transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Play className={`h-4 w-4 fill-white ${isSimulating ? "animate-pulse" : ""}`} />
                  <span>
                    {isSimulating
                      ? "Executando Árbitro Matemático & Agente LLM..."
                      : "Executar Arbitragem IA & Simular Retenção"}
                  </span>
                </Button>
              </div>
            </CardContent>
          </div>
        )}
      </form>
    </Card>
  );
}
