"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plane, BarChart3, Cpu, FileText, ToggleLeft, ToggleRight, Sparkles } from "lucide-react";
import { useDemoMode } from "@/components/providers/demo-mode-context";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { isDemoMode, toggleDemoMode } = useDemoMode();

  const navItems = [
    {
      href: "/executive",
      label: "1. Painel de Valor",
      icon: BarChart3,
      description: "Visão Executiva & Financeira",
      active: pathname === "/executive" || pathname === "/",
    },
    {
      href: "/simulator",
      label: "2. Central de Decisões",
      icon: Cpu,
      description: "Simulador com Árbitro & LLM",
      active: pathname === "/simulator",
    },
    {
      href: "/audit-logs",
      label: "3. Logs & Explicabilidade",
      icon: FileText,
      description: "Auditoria & SHAP",
      active: pathname === "/audit-logs",
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Banner de Demonstração quando ativado */}
      {isDemoMode && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-1.5 text-center text-xs font-medium text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-amber-600" />
          <span>
            <strong>MODO DE DEMONSTRAÇÃO ATIVO:</strong> Visualizando dados sintéticos calibrados conforme o contrato da API (`contract.md`). Ações não alteram dados reais.
          </span>
        </div>
      )}

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

        {/* Status & Demo Mode Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleDemoMode}
            type="button"
            className={cn(
              "flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer",
              isDemoMode
                ? "border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
            title="Alternar entre modo real de API e dados de demonstração isolados"
          >
            {isDemoMode ? (
              <ToggleRight className="h-4 w-4 text-amber-600" />
            ) : (
              <ToggleLeft className="h-4 w-4" />
            )}
            <span className="hidden lg:inline">
              {isDemoMode ? "Dados Demo" : "Modo Real (API)"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
