import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "driver.js/dist/driver.css";
import "@/components/tour/driver-custom.css";
import "./globals.css";
import { AppQueryProvider } from "@/components/providers/query-provider";
import { DemoModeProvider } from "@/components/providers/demo-mode-context";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
import { TourProvider } from "@/components/tour/tour-provider";
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

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#002566" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "pulso | Antecipe o risco. Preserve o valor — Azul Fidelidade",
  description:
    "pulso: Inteligência preditiva para identificar clientes valiosos em risco, selecionar intervenções e maximizar o retorno da retenção.",
  applicationName: "pulso",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "pulso",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/pulso-branco.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icons/icon-192x192.png",
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
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
                <TourProvider>
                  <DashboardLayout>{children}</DashboardLayout>
                </TourProvider>
              </DemoModeProvider>
            </AuthProvider>
          </AppQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
