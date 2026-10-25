"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Plane, WifiOff, RotateCcw, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 font-sans">
      <div className="flex items-center justify-between max-w-4xl w-full mx-auto">
        <div className="relative h-9 w-28 flex items-center">
          <Image
            src="/logo.png"
            alt="Azul Linhas Aéreas"
            width={112}
            height={36}
            className="object-contain filter brightness-110"
            priority
          />
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-amber-400 font-mono">
          <WifiOff className="h-3.5 w-3.5" />
          <span>Modo Offline (Sem Conexão)</span>
        </div>
      </div>

      <div className="max-w-md w-full mx-auto my-auto text-center space-y-6">
        <div className="h-20 w-20 rounded-3xl bg-sky-500/10 border border-sky-500/20 text-sky-400 mx-auto flex items-center justify-center shadow-lg shadow-sky-500/5">
          <Plane className="h-10 w-10 animate-pulse text-sky-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Operação em Modo Offline
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Você está desconectado da rede externa ou em modo de voo. Os módulos de atendimento a bordo e dados salvos localmente continuam operacionais.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-left space-y-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-200">
                Copiloto de Cabine Ativo
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                O mapa de assentos e a lista de missões táticas já carregadas estão disponíveis localmente no CrewApp.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
          <Button
            variant="outline"
            onClick={handleReload}
            className="w-full sm:w-auto text-xs gap-1.5 h-10 border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Tentar Reconectar</span>
          </Button>

          <Link href="/crew" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto text-xs gap-1.5 h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer">
              <span>Abrir Modo Cabine</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="text-center text-[11px] text-slate-600 font-mono">
        pulso • Resiliência PWA Offline-First — Azul Fidelidade
      </div>
    </div>
  );
}
