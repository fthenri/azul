"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface DemoModeContextType {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  setDemoMode: (val: boolean) => void;
}

const DemoModeContext = createContext<DemoModeContextType>({
  isDemoMode: false,
  toggleDemoMode: () => {},
  setDemoMode: () => {},
});

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  useEffect(() => {
    // Carrega do localStorage se houver preferência prévia
    const stored = localStorage.getItem("azul_demo_mode");
    if (stored !== null) {
      setIsDemoMode(stored === "true");
    } else if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      setIsDemoMode(true);
    }
  }, []);

  const toggleDemoMode = () => {
    setIsDemoMode((prev) => {
      const next = !prev;
      localStorage.setItem("azul_demo_mode", String(next));
      return next;
    });
  };

  const setDemoMode = (val: boolean) => {
    setIsDemoMode(val);
    localStorage.setItem("azul_demo_mode", String(val));
  };

  return (
    <DemoModeContext.Provider value={{ isDemoMode, toggleDemoMode, setDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  return useContext(DemoModeContext);
}
