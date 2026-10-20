"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Cpu,
  FileText,
  Plane,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Database,
} from "lucide-react";
import { useDemoMode } from "@/components/providers/demo-mode-context";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { isDemoMode, toggleDemoMode } = useDemoMode();

  const navItems = [
    {
      href: "/executive",
      label: "Painel de Valor",
      sublabel: "Visão Executiva & ROI",
      icon: BarChart3,
      badge: "KPIs",
      active: pathname === "/executive" || pathname === "/",
    },
    {
      href: "/simulator",
      label: "Central de Decisões",
      sublabel: "Simulador Árbitro & LLM",
      icon: Cpu,
      badge: "Uplift",
      active: pathname === "/simulator",
    },
    {
      href: "/audit-logs",
      label: "Logs & Explicabilidade",
      sublabel: "Auditoria & Pesos SHAP",
      icon: FileText,
      badge: "Audit",
      active: pathname === "/audit-logs",
    },
  ];

  return (
    <>
      {/* Overlay para Mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-[#002855] bg-[#003B7A] text-white transition-transform duration-200 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Top Branding Header */}
        <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-white/10 bg-[#002855]">
          <Link href="/executive" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0077C8] text-white shadow-md shadow-black/20 group-hover:bg-[#005fa0] transition-colors">
              <Plane className="h-5 w-5 rotate-[-45deg]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center text-lg font-black tracking-wider text-white">
                AZ<span className="text-[#0077C8]">U</span>L
              </div>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-white/70">
                Retenção Alto Valor
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-white/50">
              Módulos do Sistema
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "group flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all",
                      item.active
                        ? "bg-[#0077C8] text-white shadow-sm font-semibold"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          item.active ? "text-white" : "text-white/70 group-hover:text-white"
                        )}
                      />
                      <div className="flex flex-col text-left">
                        <span className="leading-tight">{item.label}</span>
                        <span className="text-[10px] opacity-75 font-normal">
                          {item.sublabel}
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-transform",
                        item.active ? "opacity-100 translate-x-0.5" : "opacity-40 group-hover:opacity-100"
                      )}
                    />
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Seção Governança & Compliance */}
          <div className="rounded-xl border border-white/10 bg-black/15 p-3 text-[11px] space-y-2">
            <div className="flex items-center gap-1.5 text-white/90 font-semibold text-xs">
              <ShieldCheck className="h-4 w-4 text-[#0077C8]" />
              <span>Governança Analítica</span>
            </div>
            <p className="text-white/70 text-[10px] leading-relaxed">
              Modelagem calibrada ANAC VRA & Regras Azul Fidelidade (Res. 400).
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-white/60 pt-1 border-t border-white/10">
              <Database className="h-3 w-3" />
              <span>Camada Gold (Feature Store)</span>
            </div>
          </div>
        </div>

        {/* Footer da Sidebar: Demo Mode & Status */}
        <div className="p-4 border-t border-white/10 bg-[#002855]/90 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-white/80 font-medium">Origem dos Dados:</span>
            <button
              onClick={toggleDemoMode}
              type="button"
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-semibold transition-colors cursor-pointer",
                isDemoMode
                  ? "border-amber-400 bg-amber-500/20 text-amber-200"
                  : "border-emerald-400 bg-emerald-500/20 text-emerald-200"
              )}
            >
              {isDemoMode ? (
                <>
                  <ToggleRight className="h-3.5 w-3.5 text-amber-300" />
                  <span>Demo (Mock)</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="h-3.5 w-3.5 text-emerald-300" />
                  <span>API Real</span>
                </>
              )}
            </button>
          </div>

          <div className="text-[9px] text-white/40 flex items-center justify-between">
            <span>Azul B2B v1.2</span>
            <span>Zero Refactoring</span>
          </div>
        </div>
      </aside>
    </>
  );
}
