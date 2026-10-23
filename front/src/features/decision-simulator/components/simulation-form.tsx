"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Play, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { Momento } from "@/types/api";

const simularSchema = z.object({
  momento_id: z.string().min(1, "É obrigatório selecionar ou informar o ID de um momento"),
});

type SimularFormData = z.infer<typeof simularSchema>;

interface SimulationFormProps {
  selectedMomento: Momento | null;
  onSimulate: (momentoId: string) => void;
  isSimulating: boolean;
  simulationError: Error | null;
}

export function SimulationForm({
  selectedMomento,
  onSimulate,
  isSimulating,
  simulationError,
}: SimulationFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SimularFormData>({
    resolver: zodResolver(simularSchema),
    defaultValues: {
      momento_id: selectedMomento?.id || "",
    },
  });

  useEffect(() => {
    if (selectedMomento) {
      setValue("momento_id", selectedMomento.id, { shouldValidate: true });
    }
  }, [selectedMomento, setValue]);

  const onSubmit = (data: SimularFormData) => {
    onSimulate(data.momento_id);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <CardTitle className="text-base font-semibold">
            Parâmetros da Simulação
          </CardTitle>
        </div>
        <CardDescription className="text-xs flex items-center">
          <span>O motor aciona o Árbitro Matemático (Uplift) e o Agente LLM para arbitrar a melhor ação</span>
          <InfoTooltip text="Cálculo de probabilidade de mudança de comportamento do cliente após receber o benefício." />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              ID do Momento / Evento Alvo
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: mom_789"
                {...register("momento_id")}
                className={`flex-1 rounded-md border px-3 py-2 text-xs font-mono bg-background focus:outline-none focus:ring-1 ${
                  errors.momento_id
                    ? "border-destructive focus:ring-destructive"
                    : "border-input focus:ring-primary"
                }`}
              />
              <Button
                type="submit"
                disabled={isSimulating}
                className="gap-2 text-xs font-semibold"
              >
                <Play className={`h-3.5 w-3.5 ${isSimulating ? "animate-pulse" : ""}`} />
                <span>{isSimulating ? "Arbitrando..." : "Executar Simulação"}</span>
              </Button>
            </div>
            {errors.momento_id && (
              <p className="mt-1 text-xs text-destructive">
                {errors.momento_id.message}
              </p>
            )}
          </div>

          {selectedMomento && (
            <div className="rounded-lg bg-muted/40 border border-border/80 p-3 text-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Cliente: <strong className="text-foreground">{selectedMomento.cliente_id}</strong></span>
                <span>Persona: <strong className="text-foreground">{selectedMomento.persona}</strong></span>
              </div>
              <p className="text-foreground font-medium pt-1">
                {selectedMomento.descricao}
              </p>
            </div>
          )}

          {simulationError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Erro ao processar simulação:</p>
                <p>{simulationError.message}</p>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
