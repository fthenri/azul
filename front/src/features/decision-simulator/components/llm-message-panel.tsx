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
      <Card className="flex flex-col bg-white border border-[#E2E8F0] shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-[#0077C8]" />
              <CardTitle className="text-base font-bold text-[#243447]">
                Comunicação Gerada (Agente LLM)
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px] text-[#003B7A] border-[#0077C8]/30 bg-[#EAF4FC] font-semibold">
              RAG Guardrail Ativo
            </Badge>
          </div>
          <CardDescription className="text-xs text-[#5B6E84]">
            Mensagem personalizada e empática calibrada sem alucinação de benefícios
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col justify-between space-y-4">
          <div className="rounded-xl bg-[#002855] text-white p-4 font-sans text-xs sm:text-sm leading-relaxed border border-[#003B7A] shadow-inner">
            <div className="flex items-center gap-2 mb-2 text-[#EAF4FC]/70 text-xs font-mono border-b border-white/10 pb-2">
              <MessageSquare className="h-3.5 w-3.5 text-[#0077C8]" />
              <span>Canal Push / E-mail / WhatsApp</span>
            </div>
            <p className="whitespace-pre-wrap">{decisaoFinal.mensagem_llm}</p>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="text-xs gap-1.5 cursor-pointer border-[#E2E8F0] hover:bg-[#EAF4FC] hover:text-[#003B7A]"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#16805D]" />
                  <span className="text-[#16805D] font-bold">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-[#0077C8]" />
                  <span>Copiar Mensagem</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Evidência Regulatória / RAG Consultada */}
      <Card className="flex flex-col bg-white border border-[#E2E8F0] shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#003B7A]" />
              <CardTitle className="text-base font-bold text-[#243447]">
                Evidência Regulatória & Regra RAG
              </CardTitle>
            </div>
            <Badge variant="secondary" className="text-[10px] bg-[#EAF4FC] text-[#003B7A] font-bold">
              Azul Fidelidade
            </Badge>
          </div>
          <CardDescription className="text-xs text-[#5B6E84]">
            Trecho do manual e regulamento consultado pelo agente antes da concessão
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col justify-between">
          <div className="rounded-xl border border-[#0077C8]/30 bg-[#EAF4FC] p-4 text-xs sm:text-sm leading-relaxed text-[#243447]">
            <div className="flex items-center gap-2 text-[#003B7A] font-bold text-xs mb-2">
              <BookOpen className="h-4 w-4 text-[#0077C8]" />
              <span>Diretriz Institucional de Retenção</span>
            </div>
            <p className="italic text-[#243447]">
              &quot;{decisaoFinal.regra_rag_consultada}&quot;
            </p>
          </div>

          <p className="text-[11px] text-[#5B6E84] mt-4">
            Em conformidade com a Resolução ANAC 400 e os termos contratuais do programa de passageiro frequente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
