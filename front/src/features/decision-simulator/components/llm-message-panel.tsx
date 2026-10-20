"use client";

import React from "react";
import { Bot, BookOpen, MessageSquare, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DecisaoFinal } from "@/types/api";

interface LlmMessagePanelProps {
  decisaoFinal?: DecisaoFinal;
}

export function LlmMessagePanel({ decisaoFinal }: LlmMessagePanelProps) {
  const [copied, setCopied] = React.useState(false);

  if (!decisaoFinal) return null;

  const handleCopy = () => {
    if (decisaoFinal.mensagem_llm) {
      navigator.clipboard.writeText(decisaoFinal.mensagem_llm);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* 1. Mensagem Gerada pelo Agente LLM */}
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-base font-semibold">
                Comunicação Gerada (Agente LLM)
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px] text-purple-700 border-purple-200 dark:text-purple-300">
              RAG Guardrail Ativo
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Mensagem personalizada e empática calibrada sem alucinação de benefícios
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col justify-between space-y-4">
          <div className="rounded-xl bg-slate-900 text-slate-100 p-4 font-sans text-xs sm:text-sm leading-relaxed border border-slate-800 shadow-inner">
            <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-mono border-b border-slate-800 pb-2">
              <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
              <span>Canal Push / E-mail / WhatsApp</span>
            </div>
            <p className="whitespace-pre-wrap">{decisaoFinal.mensagem_llm}</p>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="text-xs gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copiar Mensagem</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Evidência Regulatória / RAG Consultada */}
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base font-semibold">
                Evidência Regulatória & Regra RAG
              </CardTitle>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              Azul Fidelidade
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Trecho do manual e regulamento consultado pelo agente antes da concessão
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col justify-between">
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900 p-4 text-xs sm:text-sm leading-relaxed text-foreground">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold text-xs mb-2">
              <BookOpen className="h-4 w-4" />
              <span>Diretriz Institucional de Retenção</span>
            </div>
            <p className="italic text-slate-700 dark:text-slate-300">
              &quot;{decisaoFinal.regra_rag_consultada}&quot;
            </p>
          </div>

          <p className="text-[11px] text-muted-foreground mt-4">
            Em conformidade com a Resolução ANAC 400 e os termos contratuais do programa de passageiro frequente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
