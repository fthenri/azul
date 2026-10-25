"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Cpu,
  FileText,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Database,
  Plane,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { PulsoLogo } from "@/components/shared/pulso-logo";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();

  const navItems = [
    {
      href: "/dashboard",
      label: "Painel de Valor",
      sublabel: "Visão Executiva & ROI",
      icon: BarChart3,
      active: pathname === "/dashboard" || pathname === "/executive",
    },
    {
      href: "/simulator",
      label: "Central de Decisões",
      sublabel: "Simulador Árbitro & LLM",
      icon: Cpu,
      active: pathname === "/simulator",
    },
    {
      href: "/audit-logs",
      label: "Logs & Explicabilidade",
      sublabel: "Auditoria & Pesos SHAP",
      icon: FileText,
      active: pathname === "/audit-logs",
    },
    {
      href: "/dashboard/dispatch",
      label: "Despacho de Voo (Mapa)",
      sublabel: "Simulador de Assentos & Ações",
      icon: Plane,
      active:
        pathname === "/dashboard/dispatch" ||
        pathname === "/flight-dispatch" ||
        pathname === "/dispatch" ||
        pathname === "/crew-view",
    },
  ];

  return (
    <>
      {/* Overlay para Mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity duration-200"
        />
      )}

    <TooltipProvider delayDuration={80} skipDelayDuration={150}>
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out",
          "bg-card text-foreground shadow-xl",
          isCollapsed ? "w-20" : "w-72",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Floating Pill Toggle na Borda da Sidebar (Estilo Figma / Stripe / Raycast) com nosso Tooltip */}
            <button
              type="button"
              onClick={onToggleCollapse}
              className={cn(
                "hidden lg:flex absolute -right-3 top-7 z-50 h-8 w-8 items-center justify-center rounded-full",
                "bg-card text-muted-foreground hover:text-primary",
                "border border-border/80 hover:border-primary/50 shadow-md hover:shadow-primary/20",
                "transition-all duration-200 cursor-pointer active:scale-90 hover:scale-110 group"
              )}
              aria-label={isCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              ) : (
                <ChevronLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
              )}
            </button>

        {/* Top Header: Logo Oficial Pulso + Ecossistema Azul */}
        <div
          className={cn(
            "flex h-20 shrink-0 items-center transition-all px-4 bg-card border-b border-border/80",
            isCollapsed && "justify-center px-2"
          )}
        >
          {isCollapsed ? (
            /* Ícone Pulso Oficial Centralizado no Colapso com nosso Tooltip */
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/dashboard"
                  className="relative h-10 w-10 shrink-0 flex items-center justify-center rounded-xl hover:bg-muted/70 transition-all"
                  aria-label="pulso — Antecipe o risco. Preserve o valor."
                >
                  <PulsoLogo width={72} height={48} priority />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-foreground">pulso</span>
                  <span className="text-[11px] text-muted-foreground">Antecipe o risco. Preserve o valor.</span>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            /* Logo Oficial Pulso + Separador + Branding Corporativo Azul */
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 group overflow-hidden transition-transform duration-200"
            >
              <div className="relative h-9 w-12 shrink-0 flex items-center justify-center">
                <PulsoLogo width={46} height={30} priority />
              </div>

              <div className="h-6 w-[1px] bg-border mx-0.5" />

              <div className="flex flex-col text-left">
                <span className="text-2xl font-semibold tracking-tight text-foreground lowercase font-outfit leading-none">
                  pulso
                </span>
                <span className="text-[10px] text-muted-foreground font-medium leading-none mt-1">
                  Motor de Retenção
                </span>
              </div>
            </Link>
          )}
        </div>

        {/* Área Central: Módulos do Sistema e Seção Governança */}
        <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col justify-between scrollbar-none gap-6">
          {/* Navegação Superior */}
          <div>
            {!isCollapsed && (
              <div className="px-2 mb-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400/80">
                MÓDULOS DO SISTEMA
              </div>
            )}

            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const linkElement = (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "group relative flex items-center rounded-2xl text-xs transition-all duration-200 overflow-hidden",
                      isCollapsed
                        ? "justify-center p-3 mx-auto"
                        : "justify-between px-3.5 py-3",
                      item.active
                        ? "border border-secondary text-secondary-foreground font-bold shadow-xl"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    {isCollapsed ? (
                      <div className="relative flex items-center justify-center">
                        <Icon
                          className={cn(
                            "h-7 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105",
                            item.active
                              ? "text-surface"
                              : "text-muted-foreground group-hover:text-primary"
                          )}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <Icon
                            className={cn(
                              "h-7 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105",
                              item.active
                                ? "text-surface"
                                : "text-muted-foreground group-hover:text-primary"
                            )}
                          />
                          <div className="flex flex-col text-left">
                            <span
                              className={cn(
                                "leading-tight font-bold text-xs",
                                item.active
                                  ? "text-foreground font-black"
                                  : "text-foreground/80"
                              )}
                            >
                              {item.label}
                            </span>
                            <span
                              className={cn(
                                "text-[11px] font-normal leading-tight mt-0.5",
                                item.active
                                  ? "text-primary font-medium"
                                  : "text-muted-foreground"
                              )}
                            >
                              {item.sublabel}
                            </span>
                          </div>
                        </div>

                        <ChevronRight
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform duration-200",
                            item.active
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5"
                          )}
                        />
                      </>
                    )}
                  </Link>
                );

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>{linkElement}</TooltipTrigger>
                      <TooltipContent side="right" sideOffset={12}>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-foreground">{item.label}</span>
                          <span className="text-[11px] text-muted-foreground">{item.sublabel}</span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return linkElement;
              })}
            </nav>
          </div>

          {/* Seção Governança Analítica & Camada Gold (Fiel à Imagem de Referência) */}
          <div className="pt-2">
            {/* Divisória sutil */}
            <div className="border-t border-slate-200 dark:border-white/10 mb-3.5" />

            {!isCollapsed ? (
              <div className="space-y-3 px-1">
                {/* Linha 1: Governança Analítica + Ícone Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="h-5 w-5 text-azul-action dark:text-sky-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 dark:text-white">
                      Governança Analítica
                    </span>
                  </div>
                  <InfoTooltip
                    title="Governança Regulatória"
                    badge="ANAC VRA"
                    text="Modelagem calibrada ANAC VRA & Regras Azul Fidelidade (Res. 400)."
                    side="right"
                  />
                </div>

                {/* Linha 2: Camada Gold (Feature Store) */}
                <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                  <Database className="h-5 w-5 text-slate-400 dark:text-slate-400 shrink-0" />
                  <span>Camada Gold (Feature Store)</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help p-1 rounded-lg hover:bg-muted/60 transition-colors">
                      <ShieldCheck className="h-5 w-5 text-azul-action dark:text-sky-400" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={12}>
                    <div className="flex flex-col gap-0.5 max-w-[200px]">
                      <span className="font-bold text-foreground">Governança Analítica</span>
                      <span className="text-[11px] text-muted-foreground">Calibrado ANAC VRA & Regras Azul Fidelidade (Res. 400).</span>
                    </div>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help p-1 rounded-lg hover:bg-muted/60 transition-colors">
                      <Database className="h-5 w-5 text-slate-400" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={12}>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-foreground">Camada Gold</span>
                      <span className="text-[11px] text-muted-foreground">Feature Store centralizado</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </div>

        {/* Footer: Dados: DuckDB Gold | v2.4 + Botão Encerrar Sessão */}
        <div
          className={cn(
            "p-3.5 border-t space-y-3",
            "border-border bg-card",
            isCollapsed && "p-2.5"
          )}
        >
          {/* Status da Origem dos Dados */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium text-xs">
                  Dados:
                </span>
                <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  DuckDB Gold
                </span>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                v2.4
              </span>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center py-1 cursor-help">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-foreground">DuckDB Gold</span>
                  <span className="text-[11px] text-muted-foreground">Origem conectada (v2.4)</span>
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Botão de Exit / Encerrar Sessão */}
          {!isCollapsed ? (
            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center justify-center gap-2.5 h-10 px-3.5 rounded-xl bg-muted/20 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all duration-200 cursor-pointer text-xs font-semibold shadow-sm group active:scale-[0.98]"
            >
              <LogOut className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
              <span>Encerrar Sessão</span>
            </button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={logout}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/20 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all duration-200 cursor-pointer mx-auto shadow-sm group active:scale-95"
                  aria-label="Encerrar Sessão"
                >
                  <LogOut className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                <span className="font-semibold text-destructive">Encerrar Sessão</span>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </TooltipProvider>
    </>
  );
}
