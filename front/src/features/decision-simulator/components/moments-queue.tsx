"use client";

import React from "react";
import { AlertCircle, Clock, CheckCircle2, ChevronRight, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Momento } from "@/types/api";
import { formatCurrency, formatPercent } from "@/lib/formatters";

interface MomentsQueueProps {
  momentos?: Momento[];
  isLoading: boolean;
  selectedMomento: Momento | null;
  onSelectMomento: (m: Momento) => void;
}

export function MomentsQueue({
  momentos,
  isLoading,
  selectedMomento,
  onSelectMomento,
}: MomentsQueueProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!momentos || momentos.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base">Fila de Momentos e Gatilhos</CardTitle>
          <CardDescription className="text-xs">
            Nenhum evento pendente para simulação no momento.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground text-sm">
          <Clock className="h-8 w-8 mb-2 opacity-50" />
          <p>Nenhum gatilho operacional ou comportamental detectado.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-base font-semibold">
              Fila de Momentos Detectados
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-xs font-semibold">
            {momentos.length} {momentos.length === 1 ? "evento" : "eventos"}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Selecione um evento da fila para acionar o Árbitro Matemático e o Agente LLM
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5 flex-1 overflow-y-auto max-h-[560px] pr-1">
        {momentos.map((m) => {
          const isSelected = selectedMomento?.id === m.id;
          const isReativo = m.tipo_simulacao.toLowerCase() === "reativa";

          return (
            <div
              key={m.id}
              onClick={() => onSelectMomento(m)}
              className={`p-3.5 rounded-lg border transition-all cursor-pointer text-xs ${
                isSelected
                  ? "border-blue-600 bg-blue-50/80 shadow-sm dark:bg-blue-950/40 dark:border-blue-500 ring-1 ring-blue-500"
                  : "border-border bg-card hover:bg-muted/40 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={isReativo ? "destructive" : "secondary"}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {m.tipo_simulacao}
                  </Badge>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {m.cliente_id}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                  <span>CLV:</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(m.clv_previsto)}
                  </span>
                </div>
              </div>

              <p className="font-medium text-foreground text-xs leading-snug line-clamp-2 mb-2">
                {m.descricao}
              </p>

              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-border/50 text-muted-foreground">
                <span className="font-medium">{m.persona}</span>
                <div className="flex items-center gap-1.5">
                  <span>Risco:</span>
                  <span
                    className={`font-bold ${
                      m.risco_evasao_atual >= 0.7
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {formatPercent(m.risco_evasao_atual)}
                  </span>
                  <ChevronRight
                    className={`h-3.5 w-3.5 transition-transform ${
                      isSelected ? "translate-x-0.5 text-blue-600" : "text-muted-foreground"
                    }`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
