"use client";

import React from "react";
import Link from "next/link";
import {
  Users,
  Briefcase,
  User,
  Plane,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PersonaData } from "@/types/api";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/formatters";

interface PersonaMatrixProps {
  data?: PersonaData[];
}

export function PersonaMatrix({ data }: PersonaMatrixProps) {
  if (!data || data.length === 0) return null;

  const totalBase = data.reduce((acc, curr) => acc + curr.tamanho_bolha, 0);

  const getPersonaIcon = (nome: string) => {
    if (nome.includes("Corporativo")) return Briefcase;
    if (nome.includes("Solo")) return User;
    if (nome.includes("Familiar")) return Users;
    return Plane;
  };

  const getFaixaValor = (clv: number) => {
    if (clv >= 25000) {
      return {
        label: "Tier Diamante (Alto Valor)",
        badgeClass: "bg-sky-500/15 text-[#003B7A] dark:text-sky-300 border-sky-500/30",
      };
    }
    if (clv >= 7000) {
      return {
        label: "Tier Safira (Médio-Alto)",
        badgeClass: "bg-blue-500/10 text-[#0077C8] dark:text-blue-300 border-blue-500/30",
      };
    }
    return {
      label: "Tier Entrada / Ocasional",
      badgeClass: "bg-muted text-muted-foreground border-border",
    };
  };

  const getCriticidade = (risco: number) => {
    if (risco >= 0.4) {
      return {
        label: "Crítico",
        icon: ShieldAlert,
        badgeClass: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
        barColor: "bg-rose-500",
      };
    }
    if (risco >= 0.28) {
      return {
        label: "Atenção",
        icon: AlertTriangle,
        badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
        barColor: "bg-amber-500",
      };
    }
    return {
      label: "Estável",
      icon: CheckCircle2,
      badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      barColor: "bg-emerald-500",
    };
  };

  return (
    <div className="group relative rounded-2xl border border-border/80 dark:border-white/10 bg-card/80 dark:bg-[#071120]/80 backdrop-blur-xl shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
      {/* Feixe Superior Luminous Edge Highlight */}
      <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#0077C8]/50 dark:via-sky-400/80 to-transparent" />

      {/* Header da Tabela */}
      <div className="p-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/10 dark:bg-sky-500/15 text-[#0077C8] dark:text-sky-400 border border-sky-500/20">
                <Users className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-foreground">
                Matriz Estratégica de Personas & Diretrizes de Ação
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Clusterização preditiva de passageiros: priorização de contramedidas por CLV e risco de perda
            </p>
          </div>

          <Badge className="w-fit bg-[#EAF4FC] dark:bg-sky-950/60 text-[#003B7A] dark:text-sky-300 border border-[#0077C8]/25 dark:border-sky-500/30 text-[11px] font-semibold py-1 px-3">
            {data.length} Clusters Ativos
          </Badge>
        </div>
      </div>

      {/* Conteúdo da Tabela */}
      <div className="px-6 pb-6 pt-0">
        <div className="overflow-x-auto rounded-xl border border-border/70 dark:border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/60 dark:bg-white/[0.03] text-secondary-foreground uppercase text-[10px] font-bold tracking-wider border-b border-border/70 dark:border-white/10">
              <tr>
                <th className="py-3 px-4">Persona & Perfil</th>
                <th className="py-3 px-4">Faixa de Valor (CLV)</th>
                <th className="py-3 px-4">Risco de Evasão (Churn)</th>
                <th className="py-3 px-4 text-right">Base de Clientes</th>
                <th className="py-3 px-4">Diretriz Estratégica</th>
                <th className="py-3 px-4 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 dark:divide-white/5">
              {data.map((item) => {
                const faixa = getFaixaValor(item.clv_medio);
                const criticidade = getCriticidade(item.risco_evasao_medio);
                const CritIcon = criticidade.icon;
                const PersonaIcon = getPersonaIcon(item.persona);
                const pctBase = totalBase > 0 ? (item.tamanho_bolha / totalBase) * 100 : 0;

                return (
                  <tr
                    key={item.persona}
                    className="hover:bg-muted/30 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Persona & Perfil */}
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/20 flex items-center justify-center text-azul-action dark:text-sky-400 shrink-0">
                          <PersonaIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-sm">{item.persona}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <span>Influência: {item.score_influencia ?? 50}/100</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Faixa de Valor */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="font-black text-sm text-[#003B7A] dark:text-sky-300">
                          {formatCurrency(item.clv_medio)}
                        </div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-semibold ${faixa.badgeClass}`}
                        >
                          {faixa.label}
                        </span>
                      </div>
                    </td>

                    {/* Risco de Evasão */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1.5 min-w-[130px]">
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={`inline-flex items-center gap-1 font-bold ${
                              criticidade.label === "Crítico"
                                ? "text-rose-600 dark:text-rose-400"
                                : criticidade.label === "Atenção"
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            <CritIcon className="h-3.5 w-3.5" />
                            <span>{formatPercent(item.risco_evasao_medio)}</span>
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {criticidade.label}
                          </span>
                        </div>
                        {/* Barra de Progresso do Risco */}
                        <div className="h-1.5 w-full bg-muted dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${criticidade.barColor} rounded-full`}
                            style={{ width: `${Math.min(item.risco_evasao_medio * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Base de Clientes */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold text-foreground text-sm">
                        {formatNumber(item.tamanho_bolha)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {pctBase.toFixed(1)}% da carteira
                      </div>
                    </td>

                    {/* Diretriz Estratégica */}
                    <td className="py-3.5 px-4">
                      {item.clv_medio >= 20000 ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0077C8] dark:text-sky-400">
                          <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                          <span>Blindagem Imediata: Upgrades & RAG Dedicado</span>
                        </div>
                      ) : item.risco_evasao_medio >= 0.3 ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>Mitigação Operacional & Recuperação de Falhas</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          <span>Fidelização e Engajamento Contínuo</span>
                        </div>
                      )}
                    </td>

                    {/* Ação */}
                    <td className="py-3.5 px-4 text-center">
                      <Link
                        href="/simulator"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-azul-action dark:text-sky-300 border border-sky-500/25 text-[11px] font-semibold transition-all group-hover:border-sky-500/50"
                      >
                        <span>Simular</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
