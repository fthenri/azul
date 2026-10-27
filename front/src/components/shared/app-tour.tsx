"use client";

import React, { useEffect, useCallback } from "react";
import { HelpCircle } from "lucide-react";
import { driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

const STORAGE_KEY = "pulso_tutorial_v1";

export function useAppTour() {
  const startTour = useCallback((force = false) => {
    if (typeof window === "undefined") return;

    try {
      const completed = localStorage.getItem(STORAGE_KEY);
      if (completed === "true" && !force) {
        return;
      }
    } catch {
      // Falha silenciosa no acesso ao storage
    }

    const steps: DriveStep[] = [
      {
        popover: {
          title: "pulso: Motor de Retenção",
          description:
            "Plataforma analítica para antecipação de atrito e preservação de valor da base de clientes Azul Fidelidade. Este guia apresenta os módulos e controles centrais da aplicação.",
        },
      },
      {
        element: '[data-tour="nav-dashboard"]',
        popover: {
          title: "Painel de Valor",
          description:
            "Visão executiva com indicadores financeiros consolidados, mensuração do ROI do motor analítico e concentração de receita da carteira.",
          side: "right",
          align: "start",
        },
      },
      {
        element: '[data-tour="executive-kpis"]',
        popover: {
          title: "Indicadores Consolidados",
          description:
            "Métricas de valor protegido contra evasão, receita incremental de upgrades e ancillaries, custos operacionais e multiplicador de ROI por real investido.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-tour="pareto-chart"]',
        popover: {
          title: "Concentração de Carteira",
          description:
            "Curva 80/20 evidenciando o impacto de clientes de alto valor (Diamante e Safira) sobre o faturamento total e os pontos de exposição a churn.",
          side: "top",
          align: "center",
        },
      },
      {
        element: '[data-tour="personas-chart"]',
        popover: {
          title: "Segmentação de Risco e Valor",
          description:
            "Dispersão analítica cruzando a probabilidade de desligamento ao valor histórico acumulado (CLV) de cada perfil de cliente.",
          side: "top",
          align: "center",
        },
      },
      {
        element: '[data-tour="nav-flights"]',
        popover: {
          title: "Ações On-Board (Em Voo)",
          description:
            "Monitoramento da malha aérea em tempo real, visualização de assentos por cabine e despacho de intervenções preventivas para a tripulação.",
          side: "right",
          align: "center",
        },
      },
      {
        element: '[data-tour="nav-offboard"]',
        popover: {
          title: "Ações Off-Board (Pós-Voo)",
          description:
            "Orquestração de campanhas digitais multicanal (WhatsApp, E-mail e Notificações Push) com rastreamento de entregas e conformidade LGPD.",
          side: "right",
          align: "center",
        },
      },
      {
        element: '[data-tour="header-search"]',
        popover: {
          title: "Pesquisa e Atalhos Globais",
          description:
            "Acesso rápido a passageiros, localizadores (PNR) e voos via ⌘K. Pressione ⌘B para alternar o colapso da barra lateral.",
          side: "bottom",
          align: "end",
        },
      },
      {
        element: '[data-tour="tour-help-button"]',
        popover: {
          title: "Guia Interativo",
          description:
            "Você pode reiniciar este tutorial a qualquer momento acionando este botão na barra superior.",
          side: "bottom",
          align: "end",
        },
      },
    ];

    const driverInstance = driver({
      animate: true,
      showProgress: true,
      allowClose: true,
      overlayColor: "rgba(5, 12, 24, 0.7)",
      stagePadding: 5,
      stageRadius: 10,
      popoverClass: "pulso-driver-popover",
      nextBtnText: "Avançar",
      prevBtnText: "Voltar",
      doneBtnText: "Finalizar",
      progressText: "{{current}} de {{total}}",
      onDestroyStarted: () => {
        try {
          localStorage.setItem(STORAGE_KEY, "true");
        } catch {
          // Ignorar fallback
        }
        driverInstance.destroy();
      },
      steps,
    });

    driverInstance.drive();
  }, []);

  const resetTour = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignorar fallback
    }
    startTour(true);
  }, [startTour]);

  return { startTour, resetTour };
}

export function AppTourTrigger() {
  const { startTour } = useAppTour();

  useEffect(() => {
    const timer = setTimeout(() => {
      startTour(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, [startTour]);

  return null;
}

export function TourHelpButton() {
  const { resetTour } = useAppTour();

  return (
    <button
      type="button"
      onClick={() => resetTour()}
      data-tour="tour-help-button"
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card/80 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
      title="Reiniciar Guia da Aplicação"
      aria-label="Reiniciar Guia da Aplicação"
    >
      <HelpCircle className="h-4 w-4" />
    </button>
  );
}
