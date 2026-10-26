import React from "react";
import {
  MessageSquare,
  Mail,
  Bell,
  ShieldCheck,
  Sparkles,
  HeartHandshake,
  CheckCircle2,
  TrendingUp,
  Lock,
  Smartphone,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Ações Off-Board (Fora do Voo) | Azul Retenção de Alto Valor",
  description: "IA no Pós-Voo & Canais Digitais Multicanal em conformidade com LGPD e IA Responsável.",
};

export default function OffBoardPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-6 px-2.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 text-[11px] font-bold border border-sky-300 dark:border-sky-800 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-sky-600 dark:text-sky-400" />
              Roadmap Multicanal
            </span>
            <span className="h-6 px-2.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              Conformidade LGPD (Zero Viés)
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Ações Off-Board (Fora do Voo)
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed">
            IA generativa no pós-voo para retenção proativa nos canais digitais (WhatsApp, E-mail e Push).
            Modelagem calibrada com ANAC VRA, Regras Azul Fidelidade e Análise de Sentimento Público.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs text-right">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">
              Recuperação de Churn
            </span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              +48 pts NPS
            </span>
          </div>
        </div>
      </div>

      {/* Grid de Canais Digitais Multicanal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Canal 1: WhatsApp Concierge */}
        <Card className="border-border hover:border-primary/50 transition-all shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <MessageSquare className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300">
                WhatsApp Oficial
              </Badge>
            </div>
            <CardTitle className="text-base font-bold">Concierge WhatsApp RAG</CardTitle>
            <CardDescription className="text-xs">
              Mensagens humanizadas enviadas em D+0 para clientes que sofreram atrito operacional.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5 font-mono">
              <span className="text-[10px] text-muted-foreground block font-sans font-semibold">Exemplo Gerado pelo Modelo:</span>
              <p className="text-muted-foreground leading-relaxed italic">
                &ldquo;[RAG: Azul Fidelidade Res. 400] Olá, Sr. Lucas Pereira! Vimos que seu desembarque ocorreu há pouco. Para compensar o atraso da mala, já creditamos 1.000 pontos em seu TudoAzul.&rdquo;
              </p>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border">
              <span>Gatilho: Desembarque Concluído</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Entrega Instantânea</span>
            </div>
          </CardContent>
        </Card>

        {/* Canal 2: E-mail Transacional de Retenção */}
        <Card className="border-border hover:border-primary/50 transition-all shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Mail className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300">
                E-mail Transacional
              </Badge>
            </div>
            <CardTitle className="text-base font-bold">Acolhimento com Voucher</CardTitle>
            <CardDescription className="text-xs">
              Compensação automatizada com voucher de pontos ou upgrade para viagens futuras.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5 font-mono">
              <span className="text-[10px] text-muted-foreground block font-sans font-semibold">Assunto do E-mail:</span>
              <p className="text-foreground font-bold">
                Um pedido de desculpas e um benefício exclusivo em sua conta Azul
              </p>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Roteiro validado com regras de negócio e ROI calibrado pelo Árbitro Matemático.
              </p>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border">
              <span>SLA: Em até 2 horas</span>
              <span className="font-semibold text-sky-600 dark:text-sky-400">Zero Intervenção Manual</span>
            </div>
          </CardContent>
        </Card>

        {/* Canal 3: Push Notification App Azul */}
        <Card className="border-border hover:border-primary/50 transition-all shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Bell className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300">
                App Mobile
              </Badge>
            </div>
            <CardTitle className="text-base font-bold">Push Notification Smart</CardTitle>
            <CardDescription className="text-xs">
              Notificação geolocalizada no terminal de desembarque com suporte proativo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5 font-mono">
              <span className="text-[10px] text-muted-foreground block font-sans font-semibold">Notificação Push:</span>
              <p className="text-foreground font-bold flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-primary" />
                Azul Fidelidade • Desembarque
              </p>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                &ldquo;Seu pet viajou seguro conosco! Acesse seu voucher de boas-vindas no aplicativo.&rdquo;
              </p>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border">
              <span>Abertura estimada: 84%</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">Context-Aware</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Banner de Governança, LGPD e IA Responsável */}
      <Card className="border-border bg-gradient-to-br from-slate-900 via-slate-900 to-[#002855] text-white overflow-hidden shadow-md">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-[#38BDF8]/20 text-[#38BDF8] flex items-center justify-center">
                  <Lock className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-base text-white">
                  Governança, IA Responsável & Conformidade LGPD
                </h3>
              </div>
              <p className="text-xs text-white/80 leading-relaxed max-w-2xl">
                A camada analítica opera sob princípios estritos de <strong>Zero Viés</strong> e minimização de dados.
                Nenhum dado sensível (como gênero, etnia ou idade) é utilizado para precificação ou priorização de ações.
                A inferência baseia-se exclusivamente em histórico transacional, risco analítico de evasão e regras regulatórias (ANAC Resolução 400).
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="px-2.5 py-1 rounded-md bg-white/10 text-[10px] font-semibold text-white/90 border border-white/15 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  Anonimização de Identificadores
                </span>
                <span className="px-2.5 py-1 rounded-md bg-white/10 text-[10px] font-semibold text-white/90 border border-white/15 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  Sentimento Público ANAC VRA
                </span>
                <span className="px-2.5 py-1 rounded-md bg-white/10 text-[10px] font-semibold text-white/90 border border-white/15 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  Auditabilidade SQLite Transacional
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 text-center lg:text-right">
              <span className="text-[10px] text-white/60 uppercase font-bold tracking-wider block">
                Métrica de Equidade
              </span>
              <span className="text-3xl font-black text-[#38BDF8] block">
                100%
              </span>
              <span className="text-[11px] text-white/70 block">
                Auditoria de Paridade Estatística (Zero Viés Demográfico)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
