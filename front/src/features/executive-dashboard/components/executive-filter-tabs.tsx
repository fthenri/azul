"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { LayoutGrid, Layers, Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabType = "all" | "pareto" | "personas" | "roi";

interface TabItem {
  id: TabType;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const TABS: TabItem[] = [
  {
    id: "all",
    label: "Visão Geral Completa",
    icon: LayoutGrid,
    badge: "360°",
  },
  {
    id: "pareto",
    label: "Curva de Concentração (Pareto)",
    icon: Layers,
    badge: "80/20",
  },
  {
    id: "personas",
    label: "Matriz de Personas",
    icon: Users,
    badge: "Clusters",
  },
  {
    id: "roi",
    label: "Análise de ROI (Top 20%)",
    icon: Zap,
    badge: "Comprovado",
  },
];

interface ExecutiveFilterTabsProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
  className?: string;
}

export function ExecutiveFilterTabs({
  activeTab,
  onChange,
  className,
}: ExecutiveFilterTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Posição e dimensões da pílula deslizante ativa
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
    opacity: number;
  }>({ left: 0, width: 0, opacity: 0 });

  const updateIndicator = useCallback(() => {
    const container = containerRef.current;
    const currentTab = tabRefs.current[activeTab];

    if (container && currentTab) {
      const containerRect = container.getBoundingClientRect();
      const tabRect = currentTab.getBoundingClientRect();

      setIndicatorStyle({
        left: tabRect.left - containerRect.left + container.scrollLeft,
        width: tabRect.width,
        opacity: 1,
      });
    }
  }, [activeTab]);

  useEffect(() => {
    updateIndicator();
  }, [activeTab, updateIndicator]);

  useEffect(() => {
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  return (
    <div className={cn("relative w-full", className)}>
      {/* Container Principal dos Botões com Trilho Interligador Sóbrio (Sem Glow) */}
      <div
        ref={containerRef}
        className={cn(
          "relative flex items-center p-1.5 rounded-2xl overflow-x-auto scrollbar-none",
          "border border-slate-200/90 dark:border-white/10",
          "bg-slate-100/80 dark:bg-[#071322]/90 backdrop-blur-xl shadow-none"
        )}
      >
        {/* ─────────────────────────────────────────────────────────────
            TRILHO CONTÍNUO QUE INTERLIGA TODOS OS BOTÕES (SUTIL E SEM GLOW)
           ───────────────────────────────────────────────────────────── */}
        <div className="absolute inset-x-5 top-1/2 -translate-y-1/2 h-[1px] bg-slate-200 dark:bg-white/10 pointer-events-none" />

        {/* ─────────────────────────────────────────────────────────────
            PÍLULA DESLIZANTE ATIVA (DESLIZA ENTRE OS BOTÕES SEM GLOW)
           ───────────────────────────────────────────────────────────── */}
        <div
          className={cn(
            "absolute top-1.5 bottom-1.5 rounded-xl pointer-events-none z-10",
            // Estilo visual limpo, nítido e sem sombras neon
            "bg-white dark:bg-[#0c223c]",
            "border border-slate-200/90 dark:border-sky-500/30",
            "shadow-xs"
          )}
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
            opacity: indicatorStyle.opacity,
            transition:
              "left 300ms cubic-bezier(0.16, 1, 0.3, 1), width 300ms cubic-bezier(0.16, 1, 0.3, 1), opacity 150ms ease",
          }}
        />

        {/* ─────────────────────────────────────────────────────────────
            BOTÕES INTERLIGADOS
           ───────────────────────────────────────────────────────────── */}
        <div className="relative z-20 flex items-center gap-1 w-full sm:w-auto">
          {TABS.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <React.Fragment key={tab.id}>
                {/* Nó conector sutil no trilho entre os botões */}
                {idx > 0 && (
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-white/15 shrink-0 -mx-0.5 pointer-events-none z-0" />
                )}

                <button
                  ref={(el) => {
                    tabRefs.current[tab.id] = el;
                  }}
                  type="button"
                  onClick={() => onChange(tab.id)}
                  className={cn(
                    "relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap",
                    "transition-colors duration-200 cursor-pointer select-none outline-none",
                    "focus-visible:ring-1 focus-visible:ring-sky-400",
                    isActive
                      ? "text-[#003B7A] dark:text-white font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/[0.04]"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                      isActive
                        ? "text-[#0077C8] dark:text-sky-400"
                        : "text-slate-400 dark:text-slate-400"
                    )}
                  />

                  <span>{tab.label}</span>

                  {tab.badge && (
                    <span
                      className={cn(
                        "text-[9px] font-bold px-1.5 py-0.2 rounded-full border transition-colors leading-tight",
                        isActive
                          ? "bg-[#0077C8]/10 text-[#003B7A] border-[#0077C8]/25 dark:bg-sky-400/15 dark:text-sky-300 dark:border-sky-400/30"
                          : "bg-slate-200/60 text-slate-500 border-slate-300/60 dark:bg-white/[0.04] dark:text-slate-400 dark:border-white/10"
                      )}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ExecutiveFilterTabs;
