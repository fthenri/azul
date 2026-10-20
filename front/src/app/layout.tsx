import type { Metadata } from "next";
import "./globals.css";
import { AppQueryProvider } from "@/components/providers/query-provider";
import { DemoModeProvider } from "@/components/providers/demo-mode-context";
import { DashboardLayout } from "@/components/shared/dashboard-layout";

export const metadata: Metadata = {
  title: "Motor de Retenção de Alto Valor | Azul Linhas Aéreas",
  description: "Plataforma Analítica B2B de Retenção e Decisões — Azul Linhas Aéreas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#F4F7FA] font-sans antialiased text-[#243447]">
        <AppQueryProvider>
          <DemoModeProvider>
            <DashboardLayout>{children}</DashboardLayout>
          </DemoModeProvider>
        </AppQueryProvider>
      </body>
    </html>
  );
}
