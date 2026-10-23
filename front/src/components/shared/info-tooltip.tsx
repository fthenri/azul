"use client";

import React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  text: string;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
}

/**
 * Componente de Tooltip Informativo para métricas complexas de UX e Gestão (CLV, Pareto, Uplift).
 * Renderiza ícone Info do lucide-react com tooltip responsivo via CSS group-hover.
 */
export function InfoTooltip({ text, className, side = "top" }: InfoTooltipProps) {
  return (
    <span className={cn("relative inline-flex items-center group cursor-help ml-1 align-middle", className)}>
      <Info
        className="h-3.5 w-3.5 text-muted-foreground/70 hover:text-foreground transition-colors shrink-0"
        aria-hidden="true"
      />
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 invisible opacity-0 transition-all duration-150 ease-out",
          "group-hover:visible group-hover:opacity-100",
          "w-64 max-w-xs rounded-lg bg-popover text-popover-foreground border border-border p-2.5 text-xs shadow-md font-normal text-left normal-case tracking-normal leading-relaxed",
          side === "top" && "bottom-full left-1/2 -translate-x-1/2 mb-2",
          side === "bottom" && "top-full left-1/2 -translate-x-1/2 mt-2",
          side === "right" && "left-full top-1/2 -translate-y-1/2 ml-2",
          side === "left" && "right-full top-1/2 -translate-y-1/2 mr-2"
        )}
      >
        {text}
      </span>
    </span>
  );
}

