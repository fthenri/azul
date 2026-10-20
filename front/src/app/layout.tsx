import type { Metadata } from "next";
import "./globals.css";
import { AppQueryProvider } from "@/components/providers/query-provider";
import { DemoModeProvider } from "@/components/providers/demo-mode-context";
import { Navbar } from "@/components/shared/navbar";

export const metadata: Metadata = {
  title: "Motor de Retenção de Alto Valor | Azul",
  description: "Interface de Retenção, Decisões e Explicabilidade — Azul Linhas Aéreas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans antialiased text-foreground">
        <AppQueryProvider>
          <DemoModeProvider>
            <div className="relative flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
            </div>
          </DemoModeProvider>
        </AppQueryProvider>
      </body>
    </html>
  );
}
