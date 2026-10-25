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
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

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
  const { user, logout } = useAuth();

  const navItems = [
    {
      href: "/dashboard",
      label: "Painel de Valor",
      sublabel: "Visão Executiva & ROI",
      icon: BarChart3,
      badge: "KPIs",
      badgeLight: "bg-[#0077C8]/10 text-[#003B7A] border-[#0077C8]/25",
      badgeDark: "dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40",
      active: pathname === "/dashboard" || pathname === "/executive",
    },
    {
      href: "/simulator",
      label: "Central de Decisões",
      sublabel: "Simulador Árbitro & LLM",
      icon: Cpu,
      badge: "Uplift",
      badgeLight: "bg-purple-500/10 text-purple-700 border-purple-500/25",
      badgeDark: "dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/40",
      active: pathname === "/simulator",
    },
    {
      href: "/audit-logs",
      label: "Logs & Explicabilidade",
      sublabel: "Auditoria & Pesos SHAP",
      icon: FileText,
      badge: "Audit",
      badgeLight: "bg-amber-500/10 text-amber-700 border-amber-500/25",
      badgeDark: "dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40",
      active: pathname === "/audit-logs",
    },
    {
      href: "/dashboard/dispatch",
      label: "Despacho de Voo (Mapa)",
      sublabel: "Simulador de Assentos & Ações",
      icon: Plane,
      badge: "Ao Vivo",
      badgeLight: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
      badgeDark: "dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40",
      active:
        pathname === "/dashboard/dispatch" ||
        pathname === "/flight-dispatch" ||
        pathname === "/dispatch" ||
        pathname === "/crew-view",
    },
  ];

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AZ";

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
          // Opção 2: Full Dynamic Light/Dark
          "bg-white/95 dark:bg-[#071120]/95 backdrop-blur-2xl text-slate-800 dark:text-white",
          "border-slate-200/90 dark:border-white/10",
          "shadow-[4px_0_24px_rgba(0,59,122,0.04)] dark:shadow-[4px_0_30px_rgba(0,0,0,0.6)]",
          isCollapsed ? "lg:w-[72px]" : "lg:w-64",
          "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Feixe Lateral Sutil */}
        <div className="absolute top-0 right-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-sky-400/30 to-transparent pointer-events-none" />

        {/* Top Branding Header com Logo Oficial da Azul */}
        <div
          className={cn(
            "flex h-16 shrink-0 items-center justify-between border-b transition-all px-4",
            "border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#050e1b]",
            isCollapsed && "lg:px-2 lg:justify-center"
          )}
        >
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2.5 group overflow-hidden transition-transform duration-200 hover:scale-[1.02]",
              isCollapsed && "lg:justify-center"
            )}
            title="Azul Linhas Aéreas - Motor de Retenção"
          >
            {isCollapsed ? (
              <div className="relative h-9 w-9 shrink-0 flex items-center justify-center rounded-xl bg-sky-500/10 dark:bg-sky-500/20 border border-sky-400/30">
                <Plane className="h-5 w-5 text-azul-action dark:text-sky-400 -rotate-45" />
              </div>
            ) : (
              <>
                <div className="relative h-9 w-24 shrink-0 flex items-center">
                  <Image
                    src="/logo.png"
                    alt="Azul Linhas Aéreas"
                    width={96}
                    height={34}
                    className="object-contain filter dark:brightness-125"
                    priority
                  />
                </div>
                <div className="flex flex-col border-l border-slate-300 dark:border-white/20 pl-2">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 dark:text-white/80 leading-tight">
                    Motor de
                  </span>
                  <span className="text-[10px] uppercase font-black tracking-wider text-azul-action dark:text-[#38BDF8] leading-tight">
                    Retenção
                  </span>
                </div>
              </>
            )}
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-none">
          <div>
            {!isCollapsed && (
              <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400/80">
                Módulos do Sistema
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
                    title={isCollapsed ? `${item.label} (${item.badge})` : undefined}
                    className={cn(
                      "group relative flex items-center rounded-xl text-xs transition-all duration-200 overflow-hidden",
                      isCollapsed
                        ? "justify-center p-3"
                        : "justify-between px-3.5 py-2.5",
                      item.active
                        ? cn(
                            // Active em Light Mode
                            "bg-[#EAF4FC] text-[#003B7A] border border-[#0077C8]/25 font-bold shadow-xs",
                            // Active em Dark Mode (Aero-Navy Glassmorphism refinado)
                            "dark:bg-sky-500/15 dark:text-white dark:border-sky-500/40 dark:shadow-[0_0_20px_rgba(56,189,248,0.2)]",
                            // Indicador lateral luminoso
                            "before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full",
                            "before:bg-[#0077C8] dark:before:bg-sky-400"
                          )
                        : cn(
                            // Inactive em Light Mode
                            "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80",
                            // Inactive em Dark Mode
                            "dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.05]"
                          )
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                          item.active
                            ? "text-[#0077C8] dark:text-sky-400"
                            : "text-slate-400 dark:text-slate-400 group-hover:text-[#0077C8] dark:group-hover:text-white"
                        )}
                      />
                      {!isCollapsed && (
                        <div className="flex flex-col text-left">
                          <span className={cn(
                            "leading-tight font-semibold",
                            item.active ? "text-[#003B7A] dark:text-white font-bold" : "text-slate-700 dark:text-slate-300"
                          )}>
                            {item.label}
                          </span>
                          <span className={cn(
                            "text-[10px] font-normal",
                            item.active ? "text-[#0077C8] dark:text-sky-300" : "text-slate-400 dark:text-slate-500"
                          )}>
                            {item.sublabel}
                          </span>
                        </div>
                      )}
                    </div>

                    {!isCollapsed && (
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-md border",
                            item.badgeLight,
                            item.badgeDark
                          )}
                        >
                          {item.badge}
                        </span>
                        <ChevronRight
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                            item.active
                              ? "opacity-100 translate-x-0.5 text-[#0077C8] dark:text-sky-400"
                              : "opacity-30 group-hover:opacity-100 group-hover:translate-x-0.5"
                          )}
                        />
                      </div>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Seção Governança & Compliance */}
          {!isCollapsed ? (
            <div className="rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/80 dark:bg-black/35 p-3 text-[11px] space-y-2 shadow-xs">
              <div className="flex items-center gap-1.5 text-slate-800 dark:text-white/90 font-semibold text-xs">
                <ShieldCheck className="h-4 w-4 text-[#0077C8] dark:text-[#38BDF8]" />
                <span>Governança Analítica</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] leading-relaxed">
                Modelagem calibrada ANAC VRA & Regras Azul Fidelidade (Res. 400).
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200 dark:border-white/10">
                <Database className="h-3 w-3 text-azul-action dark:text-sky-400" />
                <span>Camada Gold (Feature Store)</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div
                className="h-8 w-8 rounded-lg bg-sky-500/10 dark:bg-white/[0.04] border border-sky-500/20 flex items-center justify-center text-azul-action dark:text-sky-400"
                title="Governança Analítica: ANAC VRA & Res. 400"
              >
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
          )}
        </div>

        {/* Footer da Sidebar: Perfil, Status & Colapso */}
        <div
          className={cn(
            "p-3.5 border-t space-y-3",
            "border-slate-200/90 dark:border-white/10 bg-slate-50/70 dark:bg-[#050e1b]"
          )}
        >
          {/* Status da Origem dos Dados */}
          {!isCollapsed && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Origem dos Dados:
              </span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                DuckDB Gold
              </span>
            </div>
          )}

          {/* Card Consolidado de Perfil Autenticado */}
          {user && (
            <div
              className={cn(
                "rounded-xl border transition-all duration-200",
                "bg-white dark:bg-black/35 border-slate-200/90 dark:border-white/10 shadow-xs",
                isCollapsed ? "p-1.5 flex justify-center" : "p-2.5 flex items-center justify-between"
              )}
            >
              {isCollapsed ? (
                <button
                  type="button"
                  onClick={logout}
                  title={`${user.name} (${user.role}) - Clique para encerrar sessão`}
                  className="h-8 w-8 rounded-lg bg-sky-500/15 dark:bg-sky-500/20 text-[#003B7A] dark:text-sky-300 font-bold text-xs flex items-center justify-center hover:bg-rose-500/15 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  {userInitials}
                </button>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    <div className="h-8 w-8 rounded-lg bg-sky-500/15 dark:bg-sky-500/20 text-[#003B7A] dark:text-sky-300 font-bold text-xs flex items-center justify-center shrink-0 border border-sky-400/25">
                      {userInitials}
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="font-bold text-slate-900 dark:text-white truncate text-xs leading-snug">
                        {user.name}
                      </span>
                      <span className="text-[10px] text-azul-action dark:text-sky-400 font-semibold tracking-wider uppercase">
                        {user.role === "manager" ? "Gestor CRM" : "Tripulação"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={logout}
                    title="Encerrar sessão corporativa"
                    className="p-1.5 rounded-lg border border-transparent hover:border-rose-500/30 bg-transparent hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer shrink-0"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          )}

          {/* Botão de Colapso da Sidebar (Desktop) */}
          <div className="hidden lg:flex items-center justify-between pt-1">
            {!isCollapsed && (
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                v2.4 Enterprise
              </span>
            )}
            <button
              type="button"
              onClick={onToggleCollapse}
              title={isCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
              className={cn(
                "p-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 hover:text-azul-action dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer",
                isCollapsed && "mx-auto"
              )}
            >
              {isCollapsed ? (
                <ChevronsRight className="h-4 w-4" />
              ) : (
                <ChevronsLeft className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
