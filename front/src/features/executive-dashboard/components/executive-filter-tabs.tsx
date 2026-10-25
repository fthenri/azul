"use client";

import React from "react";
import { LayoutGrid, Layers, Users, Zap } from "lucide-react";
import { AnimatedTabs, type TabItem } from "@/components/ui/animated-tabs";

export type TabType = "all" | "pareto" | "personas" | "roi";

export const TABS: TabItem<TabType>[] = [
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

export interface ExecutiveFilterTabsProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
  className?: string;
}

export function ExecutiveFilterTabs({
  activeTab,
  onChange,
  className,
}: ExecutiveFilterTabsProps) {
  return (
    <AnimatedTabs<TabType>
      tabs={TABS}
      activeTab={activeTab}
      onChange={onChange}
      className={className}
    />
  );
}

export default ExecutiveFilterTabs;
