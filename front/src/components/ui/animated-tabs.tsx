"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }> | React.ElementType;
  badge?: string | number | React.ReactNode;
  badgeClassName?: string;
  activeBadgeClassName?: string;
  disabled?: boolean;
}

export interface AnimatedTabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
  containerClassName?: string;
  tabClassName?: string;
  showTrack?: boolean;
  showConnectors?: boolean;
  size?: "sm" | "default";
}

export function AnimatedTabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className,
  containerClassName,
  tabClassName,
  showTrack = true,
  showConnectors = true,
  size = "default",
}: AnimatedTabsProps<T>) {
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
  }, [activeTab, tabs, updateIndicator]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    window.addEventListener("resize", updateIndicator);
    container.addEventListener("scroll", updateIndicator);

    // ResizeObserver para manter o indicador sincronizado em carregamento de fontes e dados dinâmicos
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateIndicator();
      });

      resizeObserver.observe(container);

      Object.values(tabRefs.current).forEach((el) => {
        if (el) resizeObserver?.observe(el);
      });
    }

    return () => {
      window.removeEventListener("resize", updateIndicator);
      container.removeEventListener("scroll", updateIndicator);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [updateIndicator, tabs]);

  // Rolagem suave para manter a aba ativa visível em telas com overflow
  useEffect(() => {
    const container = containerRef.current;
    const currentTab = tabRefs.current[activeTab];
    if (!container || !currentTab) return;

    const containerRect = container.getBoundingClientRect();
    const tabRect = currentTab.getBoundingClientRect();

    if (tabRect.left < containerRect.left) {
      container.scrollTo({
        left: container.scrollLeft + (tabRect.left - containerRect.left) - 16,
        behavior: "smooth",
      });
    } else if (tabRect.right > containerRect.right) {
      container.scrollTo({
        left: container.scrollLeft + (tabRect.right - containerRect.right) + 16,
        behavior: "smooth",
      });
    }
  }, [activeTab]);

  const isSmall = size === "sm";

  return (
    <div className={cn("relative w-full", className)}>
      {/* Container Principal dos Botões com Trilho Interligador Sóbrio */}
      <div
        ref={containerRef}
        role="tablist"
        aria-orientation="horizontal"
        className={cn(
          "relative flex items-center p-1.5 rounded-2xl overflow-x-auto scrollbar-none",
          "border border-border/80",
          "bg-muted/60 backdrop-blur-xl shadow-none",
          containerClassName
        )}
      >
        {/* ─────────────────────────────────────────────────────────────
            TRILHO CONTÍNUO QUE INTERLIGA TODOS OS BOTÕES (SUTIL E SEM GLOW)
           ───────────────────────────────────────────────────────────── */}
        {showTrack && (
          <div className="absolute inset-x-5 top-1/2 -translate-y-1/2 h-[1px] bg-border/60 pointer-events-none" />
        )}

        {/* ─────────────────────────────────────────────────────────────
            PÍLULA DESLIZANTE ATIVA (DESLIZA ENTRE OS BOTÕES SEM GLOW)
           ───────────────────────────────────────────────────────────── */}
        <div
          className={cn(
            "absolute top-1.5 bottom-1.5 rounded-xl pointer-events-none z-10",
            "bg-card",
            "border border-border",
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
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <React.Fragment key={tab.id}>
                {/* Nó conector sutil no trilho entre os botões */}
                {showConnectors && idx > 0 && (
                  <span className="h-1 w-1 rounded-full bg-border shrink-0 -mx-0.5 pointer-events-none z-0" />
                )}

                <button
                  ref={(el) => {
                    tabRefs.current[tab.id] = el;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  disabled={tab.disabled}
                  onClick={() => onChange(tab.id)}
                  className={cn(
                    "relative flex items-center gap-2 rounded-xl font-semibold whitespace-nowrap",
                    "transition-colors duration-200 cursor-pointer select-none outline-none",
                    "focus-visible:ring-1 focus-visible:ring-primary",
                    isSmall ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-xs",
                    tab.disabled && "opacity-50 cursor-not-allowed",
                    isActive
                      ? "text-foreground font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
                    tabClassName
                  )}
                >
                  {Icon && (
                    <Icon
                      className={cn(
                        "shrink-0 transition-transform duration-200",
                        isSmall ? "h-3.5 w-3.5" : "h-3.5 w-3.5",
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}
                    />
                  )}

                  <span>{tab.label}</span>

                  {tab.badge !== undefined && (
                    <span
                      className={cn(
                        "text-[9px] font-bold px-1.5 py-0.2 rounded-full border transition-colors leading-tight",
                        isActive
                          ? (tab.activeBadgeClassName || "bg-primary/10 text-primary border-primary/20")
                          : (tab.badgeClassName || "bg-muted text-muted-foreground border-border/60")
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

export default AnimatedTabs;
