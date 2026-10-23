"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Rotas independentes (Gateway na raiz '/' e Azul CrewApp em '/crew'):
  // Renderizam tela cheia dedicada, sem a barra lateral do gestor
  const isBarePage = pathname === "/" || pathname?.startsWith("/crew");
  if (isBarePage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-150">
      {/* Sidebar Fixa à Esquerda */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Área de Conteúdo à Direita da Sidebar */}
      <div className="flex min-h-screen flex-col lg:pl-64 transition-all">
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
