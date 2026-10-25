"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { driver, Driver, DriveStep } from "driver.js";
import { MASTER_TOUR_STEPS, PulsoTourStepDef } from "./tour-steps";

interface TourContextType {
  startMasterTour: () => void;
  resetTourSeen: () => void;
  isTourActive: boolean;
}

const TourContext = createContext<TourContextType>({
  startMasterTour: () => {},
  resetTourSeen: () => {},
  isTourActive: false,
});

const STORAGE_KEY_SEEN = "pulso_tour_seen";
const SESSION_KEY_ACTIVE_STEP = "pulso_tour_active_step";

// Helper: aguarda um seletor existir no DOM (com timeout)
function waitForElement(
  selector: string,
  timeout = 3000
): Promise<Element | null> {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const startTime = Date.now();
    const interval = setInterval(() => {
      const found = document.querySelector(selector);
      if (found) {
        clearInterval(interval);
        resolve(found);
      } else if (Date.now() - startTime >= timeout) {
        clearInterval(interval);
        resolve(null);
      }
    }, 50);
  });
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isTourActive, setIsTourActive] = useState(false);
  const driverRef = useRef<Driver | null>(null);
  const isNavigatingRef = useRef(false);

  // Limpa o estado da sessão e encerra o tour
  const finishTour = useCallback(() => {
    setIsTourActive(false);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(SESSION_KEY_ACTIVE_STEP);
      localStorage.setItem(STORAGE_KEY_SEEN, "true");
    }
    if (driverRef.current) {
      try {
        driverRef.current.destroy();
      } catch {
        // ignora se já destruído
      }
      driverRef.current = null;
    }
    isNavigatingRef.current = false;
  }, []);

  // Constrói os passos do Driver.js com interceptores para rotas
  const buildDriverSteps = useCallback(
    (steps: PulsoTourStepDef[]): DriveStep[] => {
      return steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;

        return {
          element: step.element,
          popover: {
            title: step.title,
            description: step.description,
            side: step.side || "bottom",
            align: step.align || "start",
            popoverClass: "pulso-driver-popover",
            nextBtnText: isLast ? "Concluir ✓" : "Próximo →",
            prevBtnText: "← Anterior",
            doneBtnText: "Concluir ✓",
            showProgress: true,
            progressText: `${idx + 1} de ${steps.length}`,
            onNextClick: (element, driveStep, opts) => {
              if (isLast) {
                finishTour();
                return;
              }

              const nextIndex = idx + 1;
              const nextStep = steps[nextIndex];

              if (!nextStep) {
                finishTour();
                return;
              }

              // Se o próximo passo pertence a outra rota, navega via Next.js router
              if (nextStep.route && window.location.pathname !== nextStep.route) {
                isNavigatingRef.current = true;
                sessionStorage.setItem(
                  SESSION_KEY_ACTIVE_STEP,
                  String(nextIndex)
                );
                opts.driver.destroy();
                router.push(nextStep.route);
              } else {
                opts.driver.moveNext();
              }
            },
            onPrevClick: (element, driveStep, opts) => {
              if (idx === 0) {
                opts.driver.movePrevious();
                return;
              }

              const prevIndex = idx - 1;
              const prevStep = steps[prevIndex];

              if (!prevStep) {
                opts.driver.movePrevious();
                return;
              }

              // Se o passo anterior pertence a outra rota, volta via Next.js router
              if (prevStep.route && window.location.pathname !== prevStep.route) {
                isNavigatingRef.current = true;
                sessionStorage.setItem(
                  SESSION_KEY_ACTIVE_STEP,
                  String(prevIndex)
                );
                opts.driver.destroy();
                router.push(prevStep.route);
              } else {
                opts.driver.movePrevious();
              }
            },
            onCloseClick: () => {
              finishTour();
            },
          },
        };
      });
    },
    [router, finishTour]
  );

  // Inicia o driver em um passo específico
  const driveAtStep = useCallback(
    async (stepIndex: number) => {
      const stepDef = MASTER_TOUR_STEPS[stepIndex];
      if (!stepDef) {
        finishTour();
        return;
      }

      // Aguarda o elemento existir no DOM
      const element = await waitForElement(stepDef.element, 3500);
      if (!element) {
        console.warn(`[pulso tour] Elemento não encontrado: ${stepDef.element}`);
        // Se for o último passo, finaliza; senão tenta avançar
        if (stepIndex >= MASTER_TOUR_STEPS.length - 1) {
          finishTour();
        } else {
          driveAtStep(stepIndex + 1);
        }
        return;
      }

      const driverSteps = buildDriverSteps(MASTER_TOUR_STEPS);

      if (driverRef.current) {
        try {
          driverRef.current.destroy();
        } catch {
          // ignora
        }
      }

      const driverInstance = driver({
        animate: true,
        overlayColor: "rgba(0, 16, 38, 0.75)",
        stagePadding: 8,
        stageRadius: 12,
        allowClose: true,
        popoverClass: "pulso-driver-popover",
        steps: driverSteps,
        onDestroyed: (element, step, opts) => {
          // Se o destroy foi disparado por navegação interna de rota, não encerra o tour
          if (isNavigatingRef.current) {
            return;
          }
          finishTour();
        },
      });

      driverRef.current = driverInstance;
      setIsTourActive(true);
      isNavigatingRef.current = false;
      driverInstance.drive(stepIndex);
    },
    [buildDriverSteps, finishTour]
  );

  // Disparo manual do Tour Master
  const startMasterTour = useCallback(() => {
    if (typeof window === "undefined") return;

    sessionStorage.setItem(SESSION_KEY_ACTIVE_STEP, "0");

    // Se não estiver no /dashboard, redireciona primeiro
    if (pathname !== "/dashboard" && pathname !== "/executive") {
      isNavigatingRef.current = true;
      router.push("/dashboard");
    } else {
      driveAtStep(0);
    }
  }, [pathname, router, driveAtStep]);

  // Permite limpar o flag do localStorage para testar novamente
  const resetTourSeen = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY_SEEN);
  }, []);

  // Monitora mudanças de rota para retomar o tour se houver um passo pendente
  useEffect(() => {
    if (typeof window === "undefined") return;

    const pendingStepStr = sessionStorage.getItem(SESSION_KEY_ACTIVE_STEP);
    if (!pendingStepStr) return;

    const stepIndex = parseInt(pendingStepStr, 10);
    if (isNaN(stepIndex) || stepIndex < 0 || stepIndex >= MASTER_TOUR_STEPS.length) {
      sessionStorage.removeItem(SESSION_KEY_ACTIVE_STEP);
      return;
    }

    const targetStep = MASTER_TOUR_STEPS[stepIndex];
    // Se a rota atual corresponde à rota alvo do passo
    const matchesRoute =
      pathname === targetStep.route ||
      (targetStep.route === "/dashboard" && pathname === "/executive");

    if (matchesRoute) {
      // Pequeno timeout para dar tempo de renderização dos componentes internos
      const timer = setTimeout(() => {
        driveAtStep(stepIndex);
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [pathname, driveAtStep]);

  // Auto-início na primeira visita (quando o usuário acessa uma rota válida do dashboard)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasSeenTour = localStorage.getItem(STORAGE_KEY_SEEN);
    const hasActiveStep = sessionStorage.getItem(SESSION_KEY_ACTIVE_STEP);

    const isExcludedPage =
      pathname === "/" ||
      pathname?.startsWith("/login") ||
      pathname?.startsWith("/crew");

    if (!hasSeenTour && !hasActiveStep && !isExcludedPage) {
      // Delay sutil de 1s para o usuário ver o painel antes do início automático
      const timer = setTimeout(() => {
        startMasterTour();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [pathname, startMasterTour]);

  return (
    <TourContext.Provider
      value={{
        startMasterTour,
        resetTourSeen,
        isTourActive,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  return useContext(TourContext);
}
