"use client";

import React, { useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  Building2,
  CheckCircle2,
  Sparkles,
  Plane,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { PulsoLogo } from "@/components/shared/pulso-logo";

// Força renderização dinâmica para desativar a pré-renderização estática
export const dynamic = "force-dynamic";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect");

  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [demoSelected, setDemoSelected] = useState<"manager" | "commissioner" | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Por favor, preencha o Corporate E-mail e a Senha.");
      return;
    }

    setErrorMessage(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      await login(email, password);
      // Redirecionamento preservado conforme a branch do colega
      if (redirectPath) {
        router.push(redirectPath);
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setErrorMessage(
        (err as Error).message ||
          "Falha na autenticação corporativa. Verifique suas credenciais de acesso."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (role: "manager" | "commissioner") => {
    if (role === "manager") {
      setEmail("gestor@azul.com.br");
      setPassword("azul1234");
      setDemoSelected("manager");
      setInfoMessage("Credenciais selecionadas: Carlos Silveira (Gestor CRM)");
    } else {
      setEmail("comissario@azul.com.br");
      setPassword("azul1234");
      setDemoSelected("commissioner");
      setInfoMessage("Credenciais selecionadas: Mariana Souza (Chefe de Cabine)");
    }
    setErrorMessage(null);
  };

  return (
    <div className="relative min-h-screen w-full bg-background text-foreground flex flex-col justify-between selection:bg-primary/30 selection:text-primary overflow-x-hidden font-sans antialiased">
      {/* ─────────────────────────────────────────────────────────────
          ELEMENTOS ATMOSFÉRICOS DE FUNDO
         ───────────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Gradientes Radiais em Camadas Suaves */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 20%, hsl(var(--primary) / 0.12) 0%, transparent 45%),
              radial-gradient(circle at 85% 75%, hsl(var(--primary) / 0.08) 0%, transparent 40%),
              radial-gradient(circle at 15% 80%, hsl(var(--primary) / 0.1) 0%, transparent 50%),
              radial-gradient(circle at 50% 100%, hsl(var(--card) / 0.9) 0%, hsl(var(--background)) 100%)
            `,
          }}
        />

        {/* Linhas Aero-Espaciais Vetoriais no Background */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.05] text-primary stroke-current"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="meshGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path
            d="M -100 200 C 300 100, 800 450, 1900 250"
            fill="none"
            strokeWidth="1.5"
            strokeDasharray="6 6"
          />
          <path
            d="M -200 450 C 400 300, 950 650, 2000 400"
            fill="none"
            strokeWidth="1.2"
          />
          <circle cx="50%" cy="28%" r="420" fill="none" strokeWidth="1" strokeDasharray="4 8" />
          <circle cx="50%" cy="28%" r="620" fill="none" strokeWidth="1" opacity="0.4" />
        </svg>

        {/* Grade Fina de Precisão Corporativa */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Luzes Difusas de Foco (Glow Ambient) */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[500px] bg-primary/8 blur-[150px] rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-[520px] h-[520px] bg-primary/5 blur-[140px] rounded-full" />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TOP NAVBAR CORPORATIVA
         ───────────────────────────────────────────────────────────── */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 pt-6 sm:pt-8 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative h-10 w-24 sm:w-28 flex items-center transition-transform duration-200 hover:scale-[1.02]">
            <Image
              src="/logo.png"
              alt="Azul Linhas Aéreas"
              width={112}
              height={38}
              className="object-contain filter brightness-115 drop-shadow-[0_2px_14px_rgba(56,189,248,0.25)]"
              priority
            />
          </div>

          <div className="h-6 w-[1px] bg-border" />

          <div className="flex items-center">
            <PulsoLogo width={72} height={48} priority />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card/70 border border-border backdrop-blur-md text-xs text-muted-foreground shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">Sistemas Operacionais</span>
          </div>

          <Badge className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/30 text-[11px] font-medium py-1.5 px-3.5 backdrop-blur-md transition-colors gap-1.5 shadow-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span>Portal Seguro</span>
          </Badge>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          MAIN CONTENT: CARD CENTRAL DE LOGIN (FROSTED GLASS EFFECT)
         ───────────────────────────────────────────────────────────── */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 py-8 sm:py-10 flex items-center justify-center my-auto">
        <div className="relative w-full max-w-[470px]">
          {/* Brilho Perimetral em Halo Ciano/Azul */}
          <div className="absolute -inset-1.5 rounded-[2.3rem] bg-gradient-to-b from-primary/20 via-primary/5 to-transparent blur-2xl opacity-75 -z-10" />

          {/* Card Glassmorphism */}
          <div className="relative rounded-[2.2rem] border border-border bg-card/90 backdrop-blur-2xl p-7 sm:p-9 shadow-2xl overflow-hidden">
            {/* Feixe de Luz Superior em Gradiente (Subtle Edge Highlight) */}
            <div className="absolute inset-x-12 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/80 to-transparent" />

            {/* Cabeçalho do Card com Logo Pulso Oficial e Proposta de Valor */}
            <div className="text-center space-y-4 mb-7">
              {/* Logo Pulso Oficial ao lado de pulso na fonte Outfit */}
              <div className="inline-flex items-center justify-center">
                <PulsoLogo width={104} height={72} priority />
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-4xl sm:text-4xl font-bold tracking-tight text-foreground lowercase font-outfit leading-none">
                      pulso
                    </span>
                  </div>
                </div>
              </div>

              {/* Slogan & Proposta de Valor */}
              <div className="space-y-1.5 px-1">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground leading-snug font-sans">
                  Antecipe o risco. Preserve o valor.
                </h1>
                <p className="text-xs sm:text-[13px] text-muted-foreground font-normal leading-relaxed max-w-sm mx-auto">
                  Inteligência preditiva para identificar clientes valiosos em risco, selecionar intervenções e maximizar o retorno da retenção.
                </p>
              </div>
            </div>

            {/* Alerta de Feedback / Sucesso de Seleção */}
            {infoMessage && !errorMessage && (
              <div className="mb-5 flex items-center gap-2.5 p-3 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs animate-in fade-in duration-200">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span className="leading-snug">{infoMessage}</span>
              </div>
            )}

            {/* Alerta de Erro com Alto Contraste */}
            {errorMessage && (
              <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs animate-in fade-in duration-200">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Formulário de Autenticação */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* Input: Corporate E-mail */}
              <div className="space-y-1.5">
                <label
                  htmlFor="corporate-email"
                  className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Corporate E-mail
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="corporate-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="colaborador@azul.com.br"
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-input bg-background/80 text-foreground placeholder-muted-foreground text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 focus:bg-background transition-all duration-200 shadow-inner"
                  />
                </div>
              </div>

              {/* Input: Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="corporate-password"
                    className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => {
                      setErrorMessage(
                        "Para redefinir sua credencial, contate o Suporte de TI Azul ou utilize as contas de demonstração abaixo."
                      );
                    }}
                    className="text-xs font-medium text-primary hover:underline transition-colors focus:outline-none"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="corporate-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="••••••••••••"
                    className="w-full h-12 pl-10 pr-11 rounded-xl border border-input bg-background/80 text-foreground placeholder-muted-foreground text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 focus:bg-background transition-all duration-200 shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Lembrar Acesso */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-primary/30 focus:ring-offset-0 cursor-pointer accent-primary"
                  />
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                    Lembrar meu acesso neste dispositivo
                  </span>
                </label>
              </div>

              {/* Botão Prominente e Arredondado: 'Entrar no Sistema' */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm tracking-wide shadow-md hover:brightness-105 active:scale-[0.99] transition-all duration-200 border-0 flex items-center justify-center gap-2 group cursor-pointer"
              >
                {loading ? (
                  <div className="flex items-center gap-2.5">
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      ></path>
                    </svg>
                    <span>Autenticando...</span>
                  </div>
                ) : (
                  <>
                    <span>Entrar no Sistema</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </>
                )}
              </Button>
            </form>

            {/* Divisor com Traço Tecnológico */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-card px-3 text-muted-foreground font-semibold tracking-wider">
                  ou autenticação federada
                </span>
              </div>
            </div>

            {/* Botão SSO Corporativo */}
            <button
              type="button"
              onClick={() => {
                setErrorMessage(
                  "Redirecionamento para o Provedor de Identidade Corporativo (Microsoft Azure AD). Para avaliação imediata, selecione um perfil de demonstração abaixo."
                );
              }}
              className="w-full h-11 rounded-xl border border-border bg-background/60 hover:bg-muted/50 hover:border-border text-xs text-muted-foreground hover:text-foreground font-medium transition-all duration-200 flex items-center justify-center gap-2.5 shadow-xs cursor-pointer"
            >
              <Building2 className="h-4 w-4 text-primary" />
              <span>Acessar via Microsoft Azure AD / SSO</span>
            </button>

            {/* Acesso Rápido de Demonstração (1-Clique) */}
            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
                  <Plane className="h-3 w-3 text-primary" />
                  Acesso Rápido de Demonstração
                </span>
                <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  1-Clique
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleQuickDemo("manager")}
                  className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                    demoSelected === "manager"
                      ? "border-primary bg-primary/15 text-foreground shadow-sm"
                      : "border-border bg-background/60 hover:bg-muted/40 hover:border-border text-muted-foreground"
                  }`}
                >
                  <div className="text-[11px] font-bold text-foreground flex items-center justify-between">
                    <span>Gestor CRM</span>
                    {demoSelected === "manager" ? (
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                    Cockpit Executivo
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo("commissioner")}
                  className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                    demoSelected === "commissioner"
                      ? "border-primary bg-primary/15 text-foreground shadow-sm"
                      : "border-border bg-background/60 hover:bg-muted/40 hover:border-border text-muted-foreground"
                  }`}
                >
                  <div className="text-[11px] font-bold text-foreground flex items-center justify-between">
                    <span>Chefe de Cabine</span>
                    {demoSelected === "commissioner" ? (
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                    Visão de Bordo
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          FOOTER INSTITUCIONAL CORPORATIVO & COMPLIANCE
         ───────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 py-5 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground border-t border-border">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>
            Azul Linhas Aéreas Brasileiras S.A. • pulso: Antecipe o risco. Preserve o valor.
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Criptografia Ponta a Ponta</span>
          <span className="text-muted-foreground/50">•</span>
          <span>Ambiente Restrito & Auditado</span>
          <span className="text-muted-foreground/50">•</span>
          <span className="text-primary font-mono">v2.4 Enterprise</span>
        </div>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-xs">
          <span>Carregando portal corporativo...</span>
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
