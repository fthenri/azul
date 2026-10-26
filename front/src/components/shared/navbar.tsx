"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plane, BarChart3, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/dashboard",
      label: "Painel de Valor",
      icon: BarChart3,
      description: "Visão Executiva & ROI",
      active: pathname === "/dashboard" || pathname === "/executive" || pathname === "/",
    },
    {
      href: "/dashboard/flights",
      label: "Ações On-Board (Em Voo)",
      icon: Plane,
      description: "IA na Cabine & Mapa de Assentos",
      active:
        Boolean(pathname?.startsWith("/dashboard/flights")) ||
        Boolean(pathname?.startsWith("/flights")),
    },
    {
      href: "/offboard",
      label: "Ações Off-Board (Fora do Voo)",
      icon: MessageSquare,
      description: "IA no Pós-Voo & Canais Digitais",
      active: Boolean(pathname?.startsWith("/offboard")),
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/executive" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
              <Plane className="h-5 w-5 rotate-[-45deg]" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
                AZUL <span className="text-blue-600 dark:text-blue-400 font-extrabold">RETENÇÃO</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                Motor de Alto Valor & IA
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
                  item.active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{item.label}</span>
                <span className="md:hidden">{item.label.split(".")[0]}</span>
              </Link>
            );
          })}
        </nav>

        {/* Status da Conexão */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400 font-semibold">
            API Real
          </span>
        </div>
      </div>
    </header>
  );
}
