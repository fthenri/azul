"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Search,
  ChevronRight,
  Shield,
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
    if (Boolean(pathname?.startsWith("/offboard"))) {
      return {
        title: "Ações Off-Board (Fora do Voo)",
        category: "IA no Pós-Voo & Canais Digitais",
        tag: "Multicanal + LGPD",
      };
    }
<<<<<<< HEAD
=======
    if (
      pathname?.startsWith("/dashboard/flights") ||
      pathname?.startsWith("/flights") ||
      pathname === "/dashboard/dispatch" ||
      pathname === "/flight-dispatch" ||
      pathname === "/dispatch"
    ) {
      return {
        title: "Ações On-Board (Em Voo)",
        category: "IA na Cabine & Mapa de Assentos",
        tag: "DuckDB + Batch IA",
      };
    }
>>>>>>> bcb603bf1267d6f180abedd0e55ec8357eadc39e
    return {
      title: "Painel de Valor",
      category: "Visão Executiva & Financeira",
      tag: "Pareto & KPIs",
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
        "bg-card/80 backdrop-blur-xl shadow-xs transition-all duration-300 ease-in-out",
        isCollapsed ? "lg:left-20" : "lg:left-72"
      )}
    >
      {/* Feixe de Luz Superior em Gradiente (Subtle Highlight Beam - Enterprise Pattern) */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/30 to-transparent pointer-events-none" />

      {/* Header com altura executiva de 80px (h-20) */}
      <div className="flex h-20 items-center justify-between px-4 sm:px-8 gap-4">
        {/* Esquerda: Menu Móvel (<lg) + Breadcrumb Contextual */}
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 border border-border/80"
            aria-label="Abrir menu lateral"
            title="Abrir menu lateral"
          >
            <Menu className="h-4.5 w-4.5 text-primary" />
          </button>

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
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
              <Search className="h-3.5 w-3.5" />
            </div>
            <input
              type="text"
              readOnly
              placeholder="Buscar passageiro, PNR ou voo..."
              className="w-full h-9 pl-8 pr-12 rounded-xl border border-border/80 bg-background/60 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer"
            />
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground">
                ⌘K
              </kbd>
            </div>
          </div>
        </div>

        {/* Direita: Badge de Contexto, PWA, ThemeToggle e Perfil */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/40 border border-border text-secondary-foreground text-[11px] font-semibold">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span>{context.tag}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground font-medium px-2 border-l border-border/80">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-medium text-foreground/80">
              API Real
            </span>
          </div>

          <PwaInstallButton size="sm" className="hidden sm:inline-flex h-8" />
          <ThemeToggle />

          {/* User Profile Pill */}
          <div className="flex items-center gap-3 pl-3 border-l border-border/80">
            <UserAvatar name={displayUser.name} size="md" />

            <div className="hidden sm:flex flex-col text-left">
              <span className="text-sm font-bold text-foreground leading-tight truncate max-w-[140px]">
                {displayUser.name}
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                {displayUser.role === "manager" ? "Gestor CRM" : "Operações"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
