"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * Extrai e une as duas primeiras letras a partir de uma string de nome/identificador.
 * Exemplos:
 * - "Carlos Silveira" -> "CS"
 * - "Admin" -> "AD"
 * - "Azul Linhas Aéreas" -> "AL"
 * - "" / undefined -> "AZ"
 */
export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "AZ";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return words[0].slice(0, 2).toUpperCase();
}

export interface UserAvatarProps
  extends React.ComponentPropsWithoutRef<typeof Avatar> {
  name?: string | null;
  src?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-14 w-14 text-lg",
};

/**
 * Componente dedicado que recebe uma string e une as duas primeiras letras
 * em um ícone de perfil elegante utilizando Shadcn UI Avatar.
 */
export function UserAvatar({
  name,
  src,
  size = "sm",
  className,
  ...props
}: UserAvatarProps) {
  const initials = getInitials(name);

  return (
    <Avatar
      className={cn(
        "rounded-full border border-sky-400/30 shrink-0 select-none shadow-xs",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {src && <AvatarImage src={src} alt={name || "Avatar"} className="rounded-full" />}
      <AvatarFallback
        className={cn(
          "rounded-full font-bold tracking-wide transition-colors",
          "bg-primary/10 text-primary border border-primary/20"
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

export default UserAvatar;
