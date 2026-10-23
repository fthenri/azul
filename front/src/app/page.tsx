"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BarChart3,
  Plane,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Users,
  Cpu,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function GatewayPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001733] via-[#002855] to-[#003B7A] text-white flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden font-sans antialiased">
      {/* Elementos Decorativos de Fundo (Aviation Aesthetic) */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#0077C8]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#38BDF8]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header com Logo Oficial da Azul */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between z-10 pt-2">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-32 flex items-center">
            <Image
              src="/logo.png"
              alt="Azul Linhas Aéreas"
              width={128}
              height={48}
              className="object-contain filter brightness-110"
              priority
            />
          </div>
          <div className="hidden sm:flex flex-col border-l border-white/25 pl-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-white/80 leading-tight">
              Motor de Retenção
            </span>
            <span className="text-[10px] uppercase font-black tracking-wider text-[#38BDF8] leading-tight">
              Alto Valor & IA
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-white/10 hover:bg-white/15 text-white/90 border-white/20 text-[11px] font-medium py-1 px-3">
            <Lock className="h-3 w-3 mr-1.5 text-[#38BDF8]" />
            Portal Corporativo Seguro
          </Badge>
        </div>
      </header>

      {/* Conteúdo Central: Seleção de Perfil */}
      <main className="w-full max-w-5xl mx-auto my-auto py-8 z-10 flex flex-col items-center">
        {/* Título e Chamada */}
        <div className="text-center space-y-3 mb-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#38BDF8]/15 border border-[#38BDF8]/30 text-[#38BDF8] text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Seleção de Perfil Operacional</span>
          </div>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            Bem-vindo ao Ecossistema Azul
          </h1>
          <p className="text-sm sm:text-base text-white/80 font-normal leading-relaxed">
            Selecione a sua estação de trabalho para acessar as ferramentas analíticas de retencão ou a assistência em voo da comissária.
          </p>
        </div>

        {/* Grid com os 2 Grandes Cards de Perfil */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {/* Card 1: Portal do Gestor */}
          <Link
            href="/dashboard"
            className="group relative flex flex-col justify-between rounded-3xl border border-white/15 bg-white/10 backdrop-blur-md p-6 sm:p-8 hover:bg-white/15 hover:border-[#38BDF8]/60 transition-all duration-300 shadow-xl hover:shadow-[#0077C8]/20 hover:-translate-y-1"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="h-14 w-14 rounded-2xl bg-[#0077C8] flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                  <BarChart3 className="h-7 w-7" />
                </div>
                <Badge className="bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8]/40 text-xs font-bold px-2.5 py-0.5">
                  CRM & MLOps
                </Badge>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-[#38BDF8] transition-colors flex items-center gap-2">
                  <span>Portal do Gestor</span>
                </h2>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#38BDF8] mt-0.5">
                  CRM & Analytics Estratégico
                </p>
                <p className="text-xs sm:text-sm text-white/75 mt-2.5 leading-relaxed">
                  Visão executiva com métricas de ROI, central de decisões com Árbitro Matemático (Uplift) e auditoria regulatória de intervenções.
                </p>
              </div>

              {/* Destaques do Módulo */}
              <div className="pt-3 border-t border-white/15 space-y-2 text-xs text-white/80">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8]" />
                  <span>Painel de Valor, KPIs e Curva de Pareto em Tempo Real</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8]" />
                  <span>Simulador de Decisão com Uplift Modeling e Mensagens LLM</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8]" />
                  <span>Auditoria e Explicabilidade de Risco via Pesos SHAP</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 flex items-center justify-between font-bold text-sm text-[#38BDF8] group-hover:text-white transition-colors">
              <span>Acessar Portal do Gestor</span>
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-[#38BDF8] group-hover:text-[#002855] transition-all">
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </Link>

          {/* Card 2: Guest Service Tool */}
          <Link
            href="/crew"
            className="group relative flex flex-col justify-between rounded-3xl border border-white/15 bg-white/10 backdrop-blur-md p-6 sm:p-8 hover:bg-white/15 hover:border-emerald-400/60 transition-all duration-300 shadow-xl hover:shadow-emerald-500/20 hover:-translate-y-1"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                  <Plane className="h-7 w-7" />
                </div>
                <Badge className="bg-emerald-400/20 text-emerald-300 border-emerald-400/40 text-xs font-bold px-2.5 py-0.5">
                  Operação de Bordo
                </Badge>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-emerald-300 transition-colors flex items-center gap-2">
                  <span>Guest Service Tool</span>
                </h2>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300 mt-0.5">
                  Assistente da Tripulação
                </p>
                <p className="text-xs sm:text-sm text-white/75 mt-2.5 leading-relaxed">
                  Interface tática para comissárias receberem missões de atendimento proativo da IA, acolhendo clientes com atritos ou celebrando fidelidade VIP.
                </p>
              </div>

              {/* Destaques do Módulo */}
              <div className="pt-3 border-t border-white/15 space-y-2 text-xs text-white/80">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Voo AD4231 (VCP ➔ REC) em Cruzeiro • Altitude FL360</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Feed de Missões de IA com Instruções Diretas do Copiloto</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Layout Nativo Responsivo para Tablet de Bordo ou Desktop</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 flex items-center justify-between font-bold text-sm text-emerald-300 group-hover:text-white transition-colors">
              <span>Acessar Operação de Bordo</span>
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-emerald-400 group-hover:text-[#002855] transition-all">
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </Link>
        </div>
      </main>

      {/* Footer Institucional */}
      <footer className="w-full max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-white/60 gap-3 border-t border-white/10 pt-4 z-10">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#38BDF8]" />
          <span>Azul Linhas Aéreas Brasileiras • Retenção de Alto Valor B2B</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Hackathon Azul 2026</span>
          <span>•</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            API em Tempo Real Conectada
          </span>
        </div>
      </footer>
    </div>
  );
}
