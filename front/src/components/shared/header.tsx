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
import { PwaInstallButton } from "@/components/shared/pwa-install-button";
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

  // Atalho de teclado global ⌘B / Ctrl+B para expandir/recolher sidebar (Padrão Linear / IDE)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        if (onToggleSidebar) {
          onToggleSidebar();
        } else if (onOpenMobileMenu) {
          onOpenMobileMenu();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToggleSidebar, onOpenMobileMenu]);

  return (
    <header
      className={cn(
        "fixed top-0 right-0 left-0 z-30 flex flex-col border-b border-border/80",
        "bg-card/10 backdrop-blur-xl shadow-xs transition-all duration-300 ease-in-out",
        isCollapsed ? "lg:left-20" : "lg:left-72"
      )}
    >
      {/* Feixe de Luz Superior em Gradiente (Subtle Highlight Beam - Enterprise Pattern) */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/30 to-transparent pointer-events-none" />

      {/* Header aumentado para 80px (h-20) com espaçamento executivo */}
      <div className="flex h-20 items-center justify-between px-4 sm:px-8 gap-4">
        {/* Esquerda: Menu Móvel (<lg) + Contexto/Breadcrumb (Desktop 100% limpo com floating pill na sidebar) */}
        <div className="flex items-center gap-3.5">
          {/* Mobile only: Botão para abrir o drawer da sidebar em telas pequenas */}
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 border border-border/80"
            aria-label="Abrir menu lateral"
            title="Abrir menu lateral"
          >
            <Menu className="h-4.5 w-4.5 text-primary" />
          </button>

          {/* Breadcrumb e Título da Página */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-xs">
              <Link
                href="/dashboard"
                className="font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {context.category}
              </Link>
              <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
              <span className="font-bold text-foreground">
                {context.title}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline-block">
              pulso • Antecipe o risco. Preserve o valor.
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
          <PwaInstallButton size="sm" className="hidden sm:inline-flex h-8" />
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
