"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { cn } from "@/lib/utils";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  // Carregar preferência salva do usuário para a sidebar
  useEffect(() => {
    try {
      const saved = localStorage.getItem("azul_sidebar_collapsed");
      if (saved === "true") {
        setIsCollapsed(true);
      }
    } catch {
      // Ignorar fallback de storage
    }
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("azul_sidebar_collapsed", String(next));
      } catch {
        // Ignorar
      }
      return next;
    });
  };

  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileMenuOpen((prev) => !prev);
    } else {
      handleToggleCollapse();
    }
  };

  // Rotas independentes (Gateway na raiz '/' e Azul CrewApp em '/crew' e tela de login):
  // Renderizam tela cheia dedicada, sem a barra lateral do gestor
  const isBarePage =
    pathname === "/" ||
    pathname?.startsWith("/crew") ||
    pathname?.startsWith("/login");

  if (isBarePage) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground transition-colors duration-150 overflow-x-hidden">
      {/* ─────────────────────────────────────────────────────────────
          CANVAS ATMOSFÉRICO SUTIL (AERO GLOW GLOBAL)
         ───────────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-40 dark:opacity-60"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% -10%, rgba(14, 165, 233, 0.08) 0%, transparent 45%),
            radial-gradient(circle at 90% 90%, rgba(2, 132, 199, 0.04) 0%, transparent 40%)
          `,
        }}
      />

      {/* Sidebar Fixa à Esquerda (Dinâmica Light/Dark com Colapso) */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Área de Conteúdo à Direita da Sidebar */}
      <div
        className={cn(
          "flex min-h-screen flex-col transition-all duration-300 ease-in-out relative z-10",
          isCollapsed ? "lg:pl-20" : "lg:pl-72"
        )}
      >
        <Header
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onToggleSidebar={handleToggleSidebar}
          isCollapsed={isCollapsed}
        />
        <main className="flex-1 pt-24 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
