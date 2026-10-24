"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Menu, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  const pathname = usePathname();

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
    if (
      pathname === "/dashboard/dispatch" ||
      pathname === "/flight-dispatch" ||
      pathname === "/dispatch" ||
      pathname === "/crew-view"
    ) {
      return {
        title: "Despacho de Voo (Mapa)",
        category: "Simulação de Cabine",
        tag: "Mapa de Assentos",
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
    <header className="sticky top-0 z-30 flex flex-col border-b border-border bg-card/95 backdrop-blur-xs">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {/* Botão Hambúrguer para telas menores */}
          <button
            onClick={onOpenMobileMenu}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted lg:hidden cursor-pointer"
            aria-label="Abrir Menu de Navegação"
          >
            <Menu className="h-5 w-5 text-azul-action" />
          </button>

          {/* Breadcrumb e Contexto */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-azul-action">
                {context.category}
              </span>
              <span className="text-xs text-muted-foreground">/</span>
              <span className="text-sm font-bold text-foreground">
                {context.title}
              </span>
            </div>
          </div>
        </div>

        {/* Indicadores do Header & ThemeToggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary border border-border text-secondary-foreground text-[11px] font-semibold">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span>{context.tag}</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium px-2 border-l border-border">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="hidden md:inline font-medium text-foreground/80">
              API Real
            </span>
          </div>

          {/* Botão de Troca de Tema (Claro / Escuro Shadcn) */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
