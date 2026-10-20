import type { Metadata } from "next";
import "./globals.css";
import { AppQueryProvider } from "@/components/providers/query-provider";
import { DemoModeProvider } from "@/components/providers/demo-mode-context";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { DashboardLayout } from "@/components/shared/dashboard-layout";

export const metadata: Metadata = {
  title: "Motor de Retenção de Alto Valor | Azul Linhas Aéreas",
  description: "Plataforma Analítica B2B de Retenção e Decisões — Azul Linhas Aéreas",
  icons: {
    icon: "/aba.png",
    shortcut: "/aba.png",
    apple: "/aba.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange={false}
        >
          <AppQueryProvider>
            <DemoModeProvider>
              <DashboardLayout>{children}</DashboardLayout>
            </DemoModeProvider>
          </AppQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
