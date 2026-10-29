"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface PulsoLogoProps {
  className?: string;
  width?: number;
  height?: number;
  variant?: "auto" | "light" | "dark";
  priority?: boolean;
}

/**
 * Componente oficial do Logo do produto Pulso
 * - Light Mode: utiliza /pulso-branco.svg (renderização com contraste para fundos claros)
 * - Dark Mode: utiliza /pulso-preto.svg (vetor com fill branco para fundos escuros)
 */
export function PulsoLogo({
  className,
  width = 60,
  height = 40,
  variant = "auto",
  priority = false,
}: PulsoLogoProps) {
  if (variant === "dark") {
    // Forçar versão branca para fundos escuros
    return (
      <Image
        src="/pulso-preto.svg"
        alt="Logo Pulso"
        width={width}
        height={height}
        className={cn("object-contain", className)}
        priority={priority}
      />
    );
  }

  if (variant === "light") {
    // Forçar versão preta para fundos claros
    return (
      <Image
        src="/pulso-branco.svg"
        alt="Logo Pulso"
        width={width}
        height={height}
        className={cn("object-contain", className)}
        priority={priority}
      />
    );
  }

  // Modo automático adaptativo (Dark / Light via classes Tailwind)
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <Image
        src="/pulso-branco.svg"
        alt="Logo Pulso"
        width={width}
        height={height}
        className="block dark:hidden object-contain"
        priority={priority}
      />
      <Image
        src="/pulso-preto.svg"
        alt="Logo Pulso"
        width={width}
        height={height}
        className="hidden dark:block object-contain"
        priority={priority}
      />
    </div>
  );
}
