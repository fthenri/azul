"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Search,
  BarChart3,
  Cpu,
  FileText,
  Plane,
  ChevronRight,
} from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onToggleSidebar?: () => void;
  isCollapsed?: boolean;
}

export function Header({
  onOpenMobileMenu,
  onToggleSidebar,
  isCollapsed = false,
}: HeaderProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const getPageContext = () => {
    if (pathname === "/simulator") {
      return {
        title: "Central de Decisões",
        category: "Simulação & Arbitragem",
      };
    }
    if (pathname === "/audit-logs") {
      return {
        title: "Logs & Explicabilidade",
        category: "Auditoria Regulatória",
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
      };
    }
    return {
      title: "Painel de Valor",
      category: "Visão Executiva & Financeira",
    };
  };

  const context = getPageContext();

  const displayUser = user || {
    name: "Carlos Silveira",
    role: "manager" as const,
  };

  return (
    <header
      className={cn(
        "fixed top-0 right-0 left-0 z-30 flex flex-col border-b border-border/80 dark:border-white/10",
        "bg-white/90 dark:bg-[#071120]/90 backdrop-blur-xl shadow-xs transition-all duration-300 ease-in-out",
        isCollapsed ? "lg:left-20" : "lg:left-72"
      )}
    >
      {/* Feixe de Luz Superior em Gradiente (Subtle Highlight Beam - Enterprise Pattern) */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#0077C8]/40 dark:via-sky-400/80 to-transparent pointer-events-none" />

      {/* Header aumentado para 80px (h-20) com espaçamento executivo */}
      <div className="flex h-20 items-center justify-between px-4 sm:px-8 gap-4">
        {/* Esquerda: Hambúrguer para Abrir/Fechar Sidebar + Contexto/Breadcrumb */}
        <div className="flex items-center gap-3.5">
          {/* Hambúrguer responsável por abrir e fechar/colapsar o sidebar (sem bordas) */}
          <button
            type="button"
            onClick={onToggleSidebar || onOpenMobileMenu}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-foreground hover:text-azul-action dark:hover:text-sky-400 hover:bg-slate-100/80 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label={isCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
            title={isCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
          >
            <Menu className="h-5 w-5 text-azul-action dark:text-sky-400 transition-transform duration-200" />
          </button>

          {/* Breadcrumb e Título da Página (sem o ícone prévio do começo) */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-xs">
              <Link
                href="/dashboard"
                className="font-medium text-slate-500 dark:text-slate-400 hover:text-azul-action dark:hover:text-sky-300 transition-colors"
              >
                {context.category}
              </Link>
              <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
              <span className="font-bold text-foreground">
                {context.title}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline-block">
              Portal Corporativo de Retenção e Decisão
            </span>
          </div>
        </div>

        {/* Centro: Barra Rápida de Pesquisa */}
        <div className="hidden md:flex items-center flex-1 max-w-sm mx-4">
          <div className="relative w-full group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-azul-action dark:group-focus-within:text-sky-400 transition-colors">
              <Search className="h-3.5 w-3.5" />
            </div>
            <input
              type="text"
              readOnly
              onClick={() => {
                // Micro-feedback para navegação rápida
              }}
              placeholder="Buscar passageiro, PNR ou voo..."
              className="w-full h-9 pl-8 pr-12 rounded-xl border border-border/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.04] text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-azul-action dark:focus:border-sky-400 focus:ring-1 focus:ring-azul-action/20 transition-all cursor-pointer"
            />
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground">
                ⌘K
              </kbd>
            </div>
          </div>
        </div>

        {/* Direita: ThemeToggle e Identidade do Usuário (sem tags 'DuckDB'/'Pareto' e sem botão de exit) */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Botão de Troca de Tema (Claro / Escuro) */}
          <ThemeToggle />

          {/* User Profile Pill centralizado no Header com Shadcn UserAvatar */}
          <div className="flex items-center gap-3 pl-3 border-l border-border/80 dark:border-white/10">
            <UserAvatar name={displayUser.name} size="md" />

            <div className="hidden sm:flex flex-col text-left">
              <span className="text-sm font-bold text-foreground leading-tight truncate max-w-[140px]">
                {displayUser.name}
              </span>
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                {displayUser.role === "manager" ? "Gestor CRM" : "Tripulação"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
