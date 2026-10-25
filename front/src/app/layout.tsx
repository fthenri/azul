import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppQueryProvider } from "@/components/providers/query-provider";
import { DemoModeProvider } from "@/components/providers/demo-mode-context";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/shared/dashboard-layout";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
  fallback: [
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "sans-serif",
  ],
});

export const metadata: Metadata = {
  title: "pulso | Antecipe o risco. Preserve o valor — Azul Fidelidade",
  description:
    "pulso: Inteligência preditiva para identificar clientes valiosos em risco, selecionar intervenções e maximizar o retorno da retenção.",
  icons: {
    icon: "/pulso-branco.svg",
    shortcut: "/pulso-branco.svg",
    apple: "/pulso-branco.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange={false}
        >
          <AppQueryProvider>
            <AuthProvider>
              <DemoModeProvider>
              <DashboardLayout>{children}</DashboardLayout>
              </DemoModeProvider>
            </AuthProvider>
          </AppQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
