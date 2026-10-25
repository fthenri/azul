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
  Database,
  Plane,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { InfoTooltip } from "@/components/shared/info-tooltip";

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

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r transition-all duration-300 ease-in-out",
          "bg-card text-foreground border-border shadow-xs",
          isCollapsed ? "w-20" : "w-72",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Top Header: Logo Azul + MOTOR DE RETENÇÃO (sem hambúrguer interno) */}
        <div
          className={cn(
            "flex h-20 shrink-0 items-center border-b transition-all px-4",
            "border-border bg-card",
            isCollapsed && "justify-center px-2"
          )}
        >
          {isCollapsed ? (
            /* Ícone colorido da bandeira do Brasil da Azul centralizado */
            <div className="relative h-8 w-8 shrink-0 flex items-center justify-center">
              <Image
                src="/aba.png"
                alt="Azul Linhas Aéreas"
                width={28}
                height={28}
                className="object-contain"
                priority
              />
            </div>
          ) : (
            /* Logo Completo Azul com mapa + Separador + Motor de Retenção */
            <Link
              href="/dashboard"
              className="flex items-center gap-2 group overflow-hidden transition-transform duration-200 hover:scale-[1.01]"
              title="Azul Linhas Aéreas - Motor de Retenção"
            >
              <div className="relative h-8 w-20 shrink-0 flex items-center">
                <Image
                  src="/logo.png"
                  alt="Azul Linhas Aéreas"
                  width={80}
                  height={30}
                  className="object-contain filter dark:brightness-125"
                  priority
                />
              </div>

              <div className="h-6 w-[1px] bg-slate-300 dark:bg-white/15 mx-0.5" />

              <div className="flex flex-col text-left pl-1">
                <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground leading-tight">
                  MOTOR DE
                </span>
                <span className="text-[11px] uppercase font-black tracking-wider text-primary leading-tight">
                  RETENÇÃO
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
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    title={isCollapsed ? item.label : undefined}
                    className={cn(
                      "group relative flex items-center rounded-2xl text-xs transition-all duration-200 overflow-hidden",
                      isCollapsed
                        ? "justify-center p-3 mx-auto"
                        : "justify-between px-3.5 py-3",
                      item.active
                        ? "bg-secondary text-secondary-foreground border border-border font-bold shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    {isCollapsed ? (
                      <div className="relative flex items-center justify-center">
                        {item.active && (
                          <span className="absolute -left-2 top-0 bottom-0 w-1 rounded-full bg-primary" />
                        )}
                        <Icon
                          className={cn(
                            "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105",
                            item.active
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-primary"
                          )}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          {item.active && (
                            <span className="w-1.5 h-6 rounded-full bg-primary shrink-0 -ml-1 mr-0.5" />
                          )}
                          <Icon
                            className={cn(
                              "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105",
                              item.active
                                ? "text-primary"
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
                <div
                  className="cursor-help"
                  title="Governança Analítica: ANAC VRA & Res. 400"
                >
                  <ShieldCheck className="h-5 w-5 text-azul-action dark:text-sky-400" />
                </div>
                <div title="Camada Gold (Feature Store)">
                  <Database className="h-5 w-5 text-slate-400" />
                </div>
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
            <div
              className="flex justify-center py-1"
              title="Dados: DuckDB Gold (v2.4)"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            </div>
          )}

          {/* Botão de Exit / Encerrar Sessão (Estilo idêntico à imagem de referência) */}
          {!isCollapsed ? (
            <button
              type="button"
              onClick={logout}
              title="Encerrar sessão corporativa"
              className="w-full flex items-center justify-center gap-2.5 h-11 px-4 rounded-xl border border-destructive/30 bg-destructive/10 hover:bg-destructive/15 text-destructive transition-all cursor-pointer text-xs font-semibold shadow-xs group"
            >
              <LogOut className="h-4 w-4 text-destructive transition-transform duration-200 group-hover:-translate-x-0.5" />
              <span>Encerrar Sessão</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={logout}
              title="Encerrar Sessão (Sair)"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10 hover:bg-destructive/15 text-destructive transition-all cursor-pointer mx-auto shadow-xs"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
