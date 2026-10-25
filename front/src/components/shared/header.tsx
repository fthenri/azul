"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Shield,
  Search,
  BarChart3,
  Cpu,
  FileText,
  Plane,
  ChevronRight,
  Sparkles,
  LogOut,
} from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useAuth } from "@/lib/auth-context";

interface HeaderProps {
  onOpenMobileMenu: () => void;
  isCollapsed?: boolean;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const getPageContext = () => {
    if (pathname === "/simulator") {
      return {
        title: "Central de Decisões",
        category: "Simulação & Arbitragem",
        tag: "Uplift + LLM RAG",
        icon: Cpu,
      };
    }
    if (pathname === "/audit-logs") {
      return {
        title: "Logs & Explicabilidade",
        category: "Auditoria Regulatória",
        tag: "SHAP + Compliance",
        icon: FileText,
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
        icon: Plane,
      };
    }
    return {
      title: "Painel de Valor",
      category: "Visão Executiva & Financeira",
      tag: "Pareto & KPIs",
      icon: BarChart3,
    };
  };

  const context = getPageContext();
  const PageIcon = context.icon;

  const displayUser = user || {
    name: "Carlos Silveira",
    role: "manager" as const,
  };

  return (
    <header className="sticky top-0 z-30 flex flex-col border-b border-border/80 dark:border-white/10 bg-white/85 dark:bg-[#071120]/85 backdrop-blur-xl shadow-xs transition-colors duration-200">
      {/* Feixe de Luz Superior em Gradiente (Subtle Highlight Beam - Enterprise Pattern) */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#0077C8]/40 dark:via-sky-400/80 to-transparent pointer-events-none" />

      <div className="flex h-16 items-center justify-between px-4 sm:px-6 gap-3">
        {/* Esquerda: Botão Mobile + Breadcrumb Inteligente */}
        <div className="flex items-center gap-3">
          {/* Botão Hambúrguer para telas menores */}
          <button
            onClick={onOpenMobileMenu}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-foreground hover:bg-muted lg:hidden transition-colors cursor-pointer"
            aria-label="Abrir Menu de Navegação"
          >
            <Menu className="h-5 w-5 text-azul-action dark:text-sky-400" />
          </button>

          {/* Breadcrumb e Contexto de Página com Ícone Dinâmico */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 dark:bg-sky-500/20 text-[#0077C8] dark:text-sky-400 border border-sky-500/20">
              <PageIcon className="h-4 w-4" />
            </div>

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
            </div>
          </div>
        </div>

        {/* Centro: Barra Rápida de Pesquisa (Simulada / Command Palette Trigger) */}
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
              className="w-full h-8 pl-8 pr-12 rounded-xl border border-border/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.04] text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-azul-action dark:focus:border-sky-400 focus:ring-1 focus:ring-azul-action/20 transition-all cursor-pointer"
            />
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground">
                ⌘K
              </kbd>
            </div>
          </div>
        </div>

        {/* Direita: Telemetria, ThemeToggle e Identidade do Usuário */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Micro-tag do Módulo */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EAF4FC] dark:bg-sky-950/60 border border-[#0077C8]/25 dark:border-sky-500/30 text-[#003B7A] dark:text-sky-300 text-[11px] font-semibold">
            <Shield className="h-3 w-3 text-azul-action dark:text-sky-400" />
            <span>{context.tag}</span>
          </div>

          {/* Status do Backend DuckDB */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/80 dark:border-white/10 bg-muted/40 dark:bg-white/[0.03] text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-semibold text-foreground">
              DuckDB Online
            </span>
          </div>

          {/* Botão de Troca de Tema (Claro / Escuro) */}
          <ThemeToggle />

          {/* User Profile Pill centralizado exclusivamente no Header */}
          <div className="flex items-center gap-2 pl-2 border-l border-border/80 dark:border-white/10">
            <UserAvatar name={displayUser.name} size="sm" />

            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-foreground leading-tight truncate max-w-[120px]">
                {displayUser.name.split(" ")[0]}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                {displayUser.role === "manager" ? "Gestor CRM" : "Tripulação"}
              </span>
            </div>

            <button
              type="button"
              onClick={user ? logout : () => (window.location.href = "/login")}
              title={user ? "Encerrar sessão" : "Acessar autenticação"}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
