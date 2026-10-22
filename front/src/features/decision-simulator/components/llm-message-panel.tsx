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

  const mensagemCliente = decisaoFinal.mensagem_crm || decisaoFinal.mensagem_llm;
  const notificacaoInterna = decisaoFinal.notificacao_interna;

  const handleCopy = () => {
    if (mensagemCliente) {
      navigator.clipboard.writeText(mensagemCliente);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* 1. Mensagem Gerada pelo Agente LLM */}
      <Card className="flex flex-col bg-card border-border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-azul-action" />
              <CardTitle className="text-base font-bold text-foreground">
                Comunicação Gerada (Agente LLM)
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px] text-azul-navy dark:text-[#38BDF8] border-border bg-secondary font-semibold">
              RAG Guardrail Ativo
            </Badge>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Mensagem personalizada e empática calibrada sem alucinação de benefícios
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col justify-between space-y-4">
          {notificacaoInterna && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20 p-3 text-xs leading-relaxed text-amber-950 dark:text-amber-200">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300 mb-1">
                <Bot className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>Notificação Interna (Equipe / ROI)</span>
              </div>
              <p>{notificacaoInterna}</p>
            </div>
          )}

          <div className="rounded-xl bg-[#002855] text-white p-4 font-sans text-xs sm:text-sm leading-relaxed border border-[#003B7A] dark:border-border shadow-inner">
            <div className="flex items-center gap-2 mb-2 text-[#EAF4FC]/70 text-xs font-mono border-b border-white/10 pb-2">
              <MessageSquare className="h-3.5 w-3.5 text-[#38BDF8]" />
              <span>Mensagem CRM (Push / E-mail / WhatsApp)</span>
            </div>
            <p className="whitespace-pre-wrap">{mensagemCliente}</p>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="text-xs gap-1.5 cursor-pointer border-border hover:bg-muted"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-azul-success" />
                  <span className="text-azul-success font-bold">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-azul-action" />
                  <span>Copiar Mensagem</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Evidência Regulatória / RAG Consultada */}
      <Card className="flex flex-col bg-card border-border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-azul-navy dark:text-[#38BDF8]" />
              <CardTitle className="text-base font-bold text-foreground">
                Evidência Regulatória & Regra RAG
              </CardTitle>
            </div>
            <Badge variant="secondary" className="text-[10px] bg-secondary text-secondary-foreground font-bold">
              Azul Fidelidade
            </Badge>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Trecho do manual e regulamento consultado pelo agente antes da concessão
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col justify-between">
          <div className="rounded-xl border border-border bg-secondary/70 p-4 text-xs sm:text-sm leading-relaxed text-foreground">
            <div className="flex items-center gap-2 text-azul-navy dark:text-[#38BDF8] font-bold text-xs mb-2">
              <BookOpen className="h-4 w-4 text-azul-action" />
              <span>Diretriz Institucional de Retenção</span>
            </div>
            <p className="italic text-foreground">
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
