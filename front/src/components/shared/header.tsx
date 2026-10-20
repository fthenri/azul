"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Menu, Sparkles, Activity, Shield } from "lucide-react";
import { useDemoMode } from "@/components/providers/demo-mode-context";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  const pathname = usePathname();
  const { isDemoMode } = useDemoMode();

  const getPageContext = () => {
    if (pathname === "/simulator") {
      return {
        title: "Central de Decisões",
        category: "Simulação & Arbitragem",
        tag: "Uplift + LLM RAG",
      };
    }
    if (pathname === "/audit-logs") {
      return {
        title: "Logs & Explicabilidade",
        category: "Auditoria Regulatória",
        tag: "SHAP + Compliance",
      };
    }
    return {
      title: "Painel de Valor",
      category: "Visão Executiva & Financeira",
      tag: "Pareto & KPIs",
    };
  };

  const context = getPageContext();

  return (
    <header className="sticky top-0 z-30 flex flex-col border-b border-border bg-white dark:bg-card">
      {/* Banner de Demonstração quando ativo */}
      {isDemoMode && (
        <div className="bg-[#B96B08]/10 border-b border-[#B96B08]/20 px-4 py-1 text-center text-xs font-semibold text-[#B96B08] dark:text-amber-300 flex items-center justify-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[#B96B08]" />
          <span>
            <strong>MODO DE DEMONSTRAÇÃO ATIVO:</strong> Visualizando dados sintéticos calibrados de acordo com o contrato da API (`contract.md`).
          </span>
        </div>
      )}

      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {/* Botão Hambúrguer para telas menores */}
          <button
            onClick={onOpenMobileMenu}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted lg:hidden"
            aria-label="Abrir Menu de Navegação"
          >
            <Menu className="h-5 w-5 text-azul-navy" />
          </button>

          {/* Breadcrumb e Contexto */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-azul-action">
                {context.category}
              </span>
              <span className="text-xs text-muted-foreground">/</span>
              <span className="text-sm font-bold text-azul-text dark:text-foreground">
                {context.title}
              </span>
            </div>
          </div>
        </div>

        {/* Indicadores do Header */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-azul-soft border border-blue-200 text-azul-navy text-[11px] font-semibold">
            <Shield className="h-3.5 w-3.5 text-azul-action" />
            <span>{context.tag}</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium pl-2 border-l border-border">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isDemoMode ? "bg-amber-400" : "bg-emerald-400"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isDemoMode ? "bg-amber-500" : "bg-emerald-500"
                }`}
              />
            </span>
            <span className="hidden md:inline">
              {isDemoMode ? "Mock /contract.md" : "Backend /api/v1"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
