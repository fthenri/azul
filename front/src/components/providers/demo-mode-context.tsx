"use client";

import React, { createContext, useContext } from "react";

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
  // Para o deploy final, a aplicação opera exclusivamente consumindo a API real
  const isDemoMode = false;
  const toggleDemoMode = () => {};
  const setDemoMode = () => {};

  return (
    <DemoModeContext.Provider value={{ isDemoMode, toggleDemoMode, setDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  return useContext(DemoModeContext);
}
