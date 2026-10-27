"use client";

import React, { useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";

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
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Informe o e-mail corporativo e a senha.");
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      const response = await login(email, password);
      // Redirecionamento baseado no perfil autenticado ou no redirect solicitado
      if (redirectPath) {
        router.push(redirectPath);
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || "Falha na autenticação corporativa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001733] via-[#002855] to-[#003B7A] text-white flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden font-sans antialiased">
      {/* Elementos Decorativos de Fundo (Aviation Aesthetic) */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#0077C8]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#38BDF8]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header com Logo Oficial da Azul */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between z-10 pt-2">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-32 flex items-center">
            <Image
              src="/logo.png"
              alt="Azul Linhas Aéreas"
              width={128}
              height={48}
              className="object-contain filter brightness-110"
              priority
            />
          </div>
          <div className="hidden sm:flex flex-col border-l border-white/25 pl-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-white/80 leading-tight">
              Motor de Retenção
            </span>
            <span className="text-[10px] uppercase font-black tracking-wider text-[#38BDF8] leading-tight">
              Alto Valor & IA
            </span>
          </div>
        </div>

        <Badge className="bg-white/10 hover:bg-white/15 text-white/90 border-white/20 text-[11px] font-medium py-1 px-3">
          <Lock className="h-3 w-3 mr-1.5 text-[#38BDF8]" />
          Portal Corporativo Seguro
        </Badge>
      </header>

      {/* Card Central de Login */}
      <main className="w-full max-w-md mx-auto my-auto py-8 z-10">
        <div className="rounded-3xl border border-white/15 bg-white/10 backdrop-blur-md p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#38BDF8]/15 border border-[#38BDF8]/30 text-[#38BDF8] text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Acesso ao Ecossistema Azul</span>
            </div>
            <h1 className="text-2xl font-black text-white">Login Corporativo</h1>
            <p className="text-xs text-white/70">
              Autentique-se para acessar o Cockpit de Retenção & CRM de Alto Valor.
            </p>
          </div>

          {/* Alerta de Erro */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-[#38BDF8]" />
                <span>E-mail Corporativo</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colaborador@azul.com.br"
                className="w-full h-10 px-3.5 rounded-xl border border-white/20 bg-black/20 text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-[#38BDF8] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/90 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-[#38BDF8]" />
                  <span>Senha</span>
                </span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 px-3.5 pr-10 rounded-xl border border-white/20 bg-black/20 text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-[#38BDF8] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-white/60 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#0077C8] hover:bg-[#005B99] text-white font-bold text-xs gap-2 transition-all shadow-lg hover:shadow-[#0077C8]/40"
            >
              {loading ? (
                <span>Autenticando...</span>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </main>

      {/* Footer Institucional */}
      <footer className="w-full max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-white/60 gap-3 border-t border-white/10 pt-4 z-10">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#38BDF8]" />
          <span>Azul Linhas Aéreas Brasileiras • Retenção de Alto Valor B2B</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Hackathon Azul 2026</span>
          <span>•</span>
          <span className="text-emerald-400">Ambiente Seguro Conectado</span>
        </div>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#001733] flex items-center justify-center text-white text-xs">
          <span>Carregando portal de acesso...</span>
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
