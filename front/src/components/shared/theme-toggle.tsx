"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-xl border-none bg-transparent shadow-none text-azul-action dark:text-sky-400 p-0"
        disabled
      >
        <Sun className="h-4.5 w-4.5 opacity-50 text-azul-action dark:text-sky-400" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="h-9 w-9 rounded-xl border-none bg-transparent hover:bg-slate-100/80 dark:hover:bg-white/10 text-azul-action dark:text-sky-400 transition-colors cursor-pointer shadow-none p-0 focus-visible:ring-0"
      title={isDark ? "Alternar para Tema Claro" : "Alternar para Tema Escuro (Azul Noturno)"}
      aria-label="Alternar tema"
    >
      {isDark ? (
        <Sun className="h-4.5 w-4.5 text-azul-action dark:text-sky-400 transition-transform rotate-0 scale-100" />
      ) : (
        <Moon className="h-4.5 w-4.5 text-azul-action dark:text-sky-400 transition-transform rotate-0 scale-100" />
      )}
    </Button>
  );
}
