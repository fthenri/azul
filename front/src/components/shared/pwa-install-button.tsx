"use client";

import React, { useState, useEffect } from "react";
import { Download, Smartphone, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallButton({
  className = "",
  variant = "outline",
  size = "sm",
}: {
  className?: string;
  variant?: "outline" | "default" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Checa se o app já está rodando em modo standalone (PWA instalado)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 4000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 4000);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled && !installSuccess) {
    return null;
  }

  if (installSuccess) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
        <Check className="h-3.5 w-3.5" />
        <span>App Instalado</span>
      </div>
    );
  }

  if (!deferredPrompt) {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleInstallClick}
      className={`text-xs gap-1.5 cursor-pointer border-sky-500/30 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20 hover:text-white ${className}`}
      title="Instalar pulso Crew no seu dispositivo"
    >
      <Download className="h-3.5 w-3.5 text-sky-400" />
      <span>Instalar App</span>
    </Button>
  );
}
