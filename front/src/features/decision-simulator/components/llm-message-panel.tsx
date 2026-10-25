"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bot,
  BookOpen,
  MessageSquare,
  Copy,
  Check,
  Smartphone,
  ShieldCheck,
  Send,
  Plane,
  Sparkles,
  ExternalLink,
  Crown,
  FileCheck2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DecisaoFinal, Momento } from "@/types/api";

interface LlmMessagePanelProps {
  decisaoFinal?: DecisaoFinal;
  selectedMomento?: Momento | null;
  dadosCliente?: {
    id_cliente?: string;
    tier_fidelidade?: string;
    persona?: string;
  };
}

type ChannelTab = "whatsapp" | "internal" | "crew" | "rag";

export function LlmMessagePanel({
  decisaoFinal,
  selectedMomento,
  dadosCliente,
}: LlmMessagePanelProps) {
  const [activeChannel, setActiveChannel] = useState<ChannelTab>("whatsapp");
  const [copied, setCopied] = useState(false);

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

  const tierNome = dadosCliente?.tier_fidelidade || "Diamante";
  const personaNome = selectedMomento?.persona || dadosCliente?.persona || "Executivo Frequente";
  const clienteId = selectedMomento?.cliente_id || dadosCliente?.id_cliente || "cli_123";

  return (
    <Card className="rounded-2xl border border-border/80 bg-card/80 backdrop-blur-md shadow-xs overflow-hidden">
      {/* ─────────────────────────────────────────────────────────────
          HEADER DO HUB OMNICANAL
         ───────────────────────────────────────────────────────────── */}
      <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-black tracking-tight text-foreground">
                  Hub Omnicanal & Agente RAG LLM
                </CardTitle>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                  GPT-4o-mini RAG
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Geração de comunicação personalizada, empática e calibrada sem alucinação de benefícios
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              <ShieldCheck className="h-3 w-3" />
              RAG Guardrail Ativo
            </span>
          </div>
        </div>

        {/* Seletor de Canais (Abas) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 text-xs scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveChannel("whatsapp")}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeChannel === "whatsapp"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>WhatsApp & Push CRM</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChannel("internal")}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeChannel === "internal"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Notificação da Diretoria</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChannel("crew")}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeChannel === "crew"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Plane className="h-3.5 w-3.5" />
            <span>Missão de Bordo (Tripulação)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChannel("rag")}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeChannel === "rag"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Regra RAG & ANAC</span>
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* ─────────────────────────────────────────────────────────────
            ABA 1: WHATSAPP / PUSH CRM
           ───────────────────────────────────────────────────────────── */}
        {activeChannel === "whatsapp" && (
          <div className="space-y-3 animate-in fade-in-50 duration-200">
            {/* Moldura Estilo Smartphone / Mensageria Flat */}
            <div className="rounded-2xl bg-card border border-border/80 text-foreground p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white font-bold text-xs">
                    Az
                  </div>
                  <div>
                    <span className="font-bold text-foreground">Azul Linhas Aéreas</span>
                    <span className="block text-[10px] text-muted-foreground">Canal Oficial Verificado ✓</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">Hoje, há instantes</span>
              </div>

              {/* Balão de Mensagem */}
              <div className="bg-muted/40 rounded-xl p-4 border border-border/60 text-xs sm:text-sm leading-relaxed text-foreground font-sans">
                <p className="whitespace-pre-wrap">{mensagemCliente}</p>
              </div>

              <div className="flex items-center justify-between pt-3 mt-1 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Em conformidade com as salvaguardas da Resolução ANAC 400</span>
                </div>
                <span className="font-mono text-[10px]">Azul Fidelidade</span>
              </div>
            </div>

            {/* Ações do Canal */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-muted-foreground">
                Disponível para disparo via API de mensageria (Meta WhatsApp Cloud / Infobip).
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="h-9 px-3.5 rounded-xl border-border hover:bg-muted text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Copiado para Área de Transferência!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-azul-action dark:text-sky-400" />
                    <span>Copiar Mensagem CRM</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            ABA 2: NOTIFICAÇÃO INTERNA DA DIRETORIA
           ───────────────────────────────────────────────────────────── */}
        {activeChannel === "internal" && (
          <div className="space-y-3 animate-in fade-in-50 duration-200">
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/20 p-4 text-xs leading-relaxed text-amber-950 dark:text-amber-100 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
                <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300">
                  <Bot className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm">Alerta Gerencial Interno (Diretoria & Operações)</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold border-amber-500/30 text-amber-800 dark:text-amber-200">
                  Ação Concedida
                </Badge>
              </div>

              <p className="font-medium">
                {notificacaoInterna ||
                  `Ação de retenção arbitrada para o cliente #${clienteId} (${personaNome}, ${tierNome}). A intervenção preserva o orçamento de retenção com ROI positivo, garantindo prioridade de atendimento na central de contingência.`}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                <div className="p-2 rounded-lg bg-card/60 border border-amber-500/20">
                  <span className="text-muted-foreground block text-[10px]">Passageiro Alvo:</span>
                  <span className="font-bold text-foreground">{clienteId} ({tierNome})</span>
                </div>
                <div className="p-2 rounded-lg bg-card/60 border border-amber-500/20">
                  <span className="text-muted-foreground block text-[10px]">Ação Executada:</span>
                  <span className="font-bold text-foreground">{decisaoFinal.acao_vencedora}</span>
                </div>
                <div className="p-2 rounded-lg bg-card/60 border border-amber-500/20">
                  <span className="text-muted-foreground block text-[10px]">Status de Auditoria:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Persistido no DuckDB</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            ABA 3: MISSÃO DE BORDO (TRIPULAÇÃO / TABLET)
           ───────────────────────────────────────────────────────────── */}
        {activeChannel === "crew" && (
          <div className="space-y-3 animate-in fade-in-50 duration-200">
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/20 p-4 text-xs text-emerald-950 dark:text-emerald-100 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-500/25">
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-bold text-sm">Despacho para o Tablet da Comissária (Em Voo)</span>
                </div>
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                  Sincronizado via Storage
                </Badge>
              </div>

              <p className="leading-relaxed">
                Esta decisão foi convertida em uma missão de bordo prioritária para a tripulação no voo <strong>AD4231</strong>. A comissária-chefe recebe a instrução humanizada com indicação do assento do passageiro.
              </p>

              <div className="p-3 rounded-xl bg-card border border-emerald-500/30 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-foreground">
                  <span>Assento 1A • {personaNome}</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">Status: Pendente de Abordagem</span>
                </div>
                <p className="text-xs text-muted-foreground italic">
                  &quot;{mensagemCliente}&quot;
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-muted-foreground">
                  A comissária de bordo pode marcar como &quot;Concluída&quot; diretamente pelo CrewApp.
                </span>
                <Link
                  href="/crew"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shrink-0 shadow-xs"
                >
                  <span>Abrir Azul CrewApp</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            ABA 4: REGRA RAG & ANAC 400
           ───────────────────────────────────────────────────────────── */}
        {activeChannel === "rag" && (
          <div className="space-y-3 animate-in fade-in-50 duration-200">
            <div className="rounded-2xl border border-border/80 bg-muted/40 p-4 text-xs leading-relaxed text-foreground space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2 text-primary font-bold text-xs">
                  <BookOpen className="h-4 w-4" />
                  <span>Diretriz Institucional Consultada (RAG)</span>
                </div>
                <Badge variant="secondary" className="text-[10px] font-bold">
                  Azul Fidelidade • Regra Oficial
                </Badge>
              </div>

              <div className="p-3.5 rounded-xl bg-card border border-border/70 text-xs italic text-foreground leading-relaxed">
                &quot;{decisaoFinal.regra_rag_consultada}&quot;
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <FileCheck2 className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Arquivo base: regras_azul_fidelidade.md (Carregado na inicialização)</span>
                </div>
                <span className="font-semibold text-foreground">Resolução ANAC 400</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
