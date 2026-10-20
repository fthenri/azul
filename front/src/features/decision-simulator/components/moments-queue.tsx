"use client";

import React from "react";
import { Clock, ChevronRight, Zap } from "lucide-react";
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
      <Card className="h-full bg-white border border-[#E2E8F0] shadow-xs">
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
      <Card className="h-full bg-card border-border shadow-xs">
        <CardHeader>
          <CardTitle className="text-base text-foreground">Fila de Momentos e Gatilhos</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Nenhum evento pendente para simulação no momento.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground text-sm">
          <Clock className="h-8 w-8 mb-2 opacity-50 text-azul-action" />
          <p>Nenhum gatilho operacional ou comportamental detectado.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col bg-card border-border shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-azul-warning" />
            <CardTitle className="text-base font-bold text-foreground">
              Fila de Momentos Detectados
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-xs font-bold text-azul-navy dark:text-[#38BDF8] border-border bg-secondary">
            {momentos.length} {momentos.length === 1 ? "evento" : "eventos"}
          </Badge>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
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
                  ? "border-primary bg-secondary/80 shadow-sm ring-1 ring-primary"
                  : "border-border bg-card hover:bg-muted/40 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={isReativo ? "destructive" : "secondary"}
                    className="text-[10px] px-1.5 py-0 font-bold"
                  >
                    {m.tipo_simulacao}
                  </Badge>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {m.cliente_id}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                  <span>CLV:</span>
                  <span className="font-bold text-azul-navy dark:text-[#38BDF8]">
                    {formatCurrency(m.clv_previsto)}
                  </span>
                </div>
              </div>

              <p className="font-medium text-foreground text-xs leading-snug line-clamp-2 mb-2">
                {m.descricao}
              </p>

              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-border text-muted-foreground">
                <span className="font-semibold text-foreground">{m.persona}</span>
                <div className="flex items-center gap-1.5">
                  <span>Risco:</span>
                  <span
                    className={`font-bold ${
                      m.risco_evasao_atual >= 0.7
                        ? "text-azul-danger"
                        : "text-azul-warning"
                    }`}
                  >
                    {formatPercent(m.risco_evasao_atual)}
                  </span>
                  <ChevronRight
                    className={`h-3.5 w-3.5 transition-transform ${
                      isSelected ? "translate-x-0.5 text-primary" : "text-muted-foreground"
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
