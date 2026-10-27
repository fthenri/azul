"use client";

import React from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface InfoTooltipProps {
  /** Texto simples explicativo do tooltip */
  text?: string;
  /** Título do tooltip em destaque (opcional para tooltips elaborados) */
  title?: string;
  /** Badge ou micro-categoria no topo (ex: "Compliance", "Fórmula", "ANAC") */
  badge?: string;
  /** Gatilho customizado (se não fornecido, usa o ícone Info padrão com hover interativo) */
  trigger?: React.ReactNode;
  /** Conteúdo React customizado completo */
  children?: React.ReactNode;
  /** Lado de posicionamento do tooltip */
  side?: "top" | "bottom" | "left" | "right";
  /** Alinhamento */
  align?: "start" | "center" | "end";
  /** Classes CSS adicionais para o gatilho */
  className?: string;
  /** Classes CSS para o balão de conteúdo */
  contentClassName?: string;
  /** Atraso para exibição em ms (padrão 150ms) */
  delayDuration?: number;
  /** Exibir ou ocultar a seta indicadora */
  showArrow?: boolean;
}

/**
 * Componente de Tooltip corporativo completo e elaborado baseado no Shadcn UI Tooltip (@radix-ui/react-tooltip).
 * Substitui o antigo CSS tooltip simples por um componente com portais acessíveis,
 * suporte a títulos, badges, descrições ricas, posicionamento inteligente e animações suaves.
 */
export function InfoTooltip({
  text,
  title,
  badge,
  trigger,
  children,
  side = "top",
  align = "center",
  className,
  contentClassName,
  delayDuration = 150,
  showArrow = true,
}: InfoTooltipProps) {
  const hasContent = Boolean(text || title || badge || children);

  const defaultTrigger = (
    <span
      role="button"
      tabIndex={0}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-0.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-help focus:outline-none focus-visible:ring-1 focus-visible:ring-primary shrink-0 select-none",
        className
      )}
      aria-label={title || "Informações adicionais"}
    >
      <Info className="h-3.5 w-3.5" aria-hidden="true" />
    </span>
  );

  if (!hasContent) {
    return trigger ? <>{trigger}</> : defaultTrigger;
  }

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>
          {trigger || defaultTrigger}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          showArrow={showArrow}
          className={cn(
            "space-y-1.5 p-3 text-left max-w-xs",
            contentClassName
          )}
        >
          {(title || badge) && (
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-border/60">
              {title && (
                <span className="font-bold text-foreground text-xs leading-tight">
                  {title}
                </span>
              )}
              {badge && (
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  {badge}
                </span>
              )}
            </div>
          )}

          {text && (
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              {text}
            </p>
          )}

          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default InfoTooltip;
