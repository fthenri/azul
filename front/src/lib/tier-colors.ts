/**
 * Mapeamento oficial de categorias e cores do Azul Fidelidade.
 * Calibrado com alto contraste e acessibilidade para tema claro e tema escuro:
 * - Azul Fidelidade (Nível 1): bg-sky-100 border-sky-300 text-sky-900 dark:bg-sky-900/30 dark:border-sky-800 dark:text-sky-300
 * - Topázio: bg-cyan-100 border-cyan-400 text-cyan-900 dark:bg-cyan-900/30 dark:border-cyan-700 dark:text-cyan-300
 * - Safira: bg-blue-200 border-blue-500 text-blue-900 dark:bg-blue-800/40 dark:border-blue-600 dark:text-blue-200
 * - Diamante / Diamante Unique (Premium): bg-indigo-900 border-indigo-950 text-white dark:bg-indigo-500/20 dark:border-indigo-400 dark:text-indigo-200
 */

export interface TierConfig {
  key: "diamante" | "safira" | "topazio" | "basico";
  name: string;
  badge: string;
  seat: string;
  border: string;
  text: string;
  indicator: string;
  shortLabel: string;
}

export const TIER_CONFIGS: Record<string, TierConfig> = {
  diamante: {
    key: "diamante",
    name: "Diamante",
    shortLabel: "DIA",
    badge: "bg-indigo-900 border-indigo-950 text-white dark:bg-indigo-500/20 dark:border-indigo-400 dark:text-indigo-200",
    seat: "bg-indigo-900 border-indigo-950 text-white hover:bg-indigo-800 dark:bg-indigo-500/20 dark:border-indigo-400 dark:text-indigo-200 dark:hover:bg-indigo-500/30 shadow-xs [&_span]:text-white dark:[&_span]:text-indigo-200 [&_div]:text-white dark:[&_div]:text-indigo-200",
    border: "border-indigo-950 dark:border-indigo-400",
    text: "text-indigo-900 dark:text-indigo-200",
    indicator: "text-white dark:text-indigo-200",
  },
  safira: {
    key: "safira",
    name: "Safira",
    shortLabel: "SAF",
    badge: "bg-blue-200 border-blue-500 text-blue-900 dark:bg-blue-800/40 dark:border-blue-600 dark:text-blue-200",
    seat: "bg-blue-200 border-blue-500 text-blue-900 hover:bg-blue-300 dark:bg-blue-800/40 dark:border-blue-600 dark:text-blue-200 dark:hover:bg-blue-800/60 shadow-xs [&_span]:text-blue-900 dark:[&_span]:text-blue-200 [&_div]:text-blue-900 dark:[&_div]:text-blue-200",
    border: "border-blue-500 dark:border-blue-600",
    text: "text-blue-900 dark:text-blue-200",
    indicator: "text-blue-900 dark:text-blue-200",
  },
  topazio: {
    key: "topazio",
    name: "Topázio",
    shortLabel: "TOP",
    badge: "bg-cyan-100 border-cyan-400 text-cyan-900 dark:bg-cyan-900/30 dark:border-cyan-700 dark:text-cyan-300",
    seat: "bg-cyan-100 border-cyan-400 text-cyan-900 hover:bg-cyan-200 dark:bg-cyan-900/30 dark:border-cyan-700 dark:text-cyan-300 dark:hover:bg-cyan-900/50 shadow-xs [&_span]:text-cyan-900 dark:[&_span]:text-cyan-300 [&_div]:text-cyan-900 dark:[&_div]:text-cyan-300",
    border: "border-cyan-400 dark:border-cyan-700",
    text: "text-cyan-900 dark:text-cyan-300",
    indicator: "text-cyan-900 dark:text-cyan-300",
  },
  basico: {
    key: "basico",
    name: "Azul Fidelidade",
    shortLabel: "AZU",
    badge: "bg-sky-100 border-sky-300 text-sky-900 dark:bg-sky-900/30 dark:border-sky-800 dark:text-sky-300",
    seat: "bg-sky-100 border-sky-300 text-sky-900 hover:bg-sky-200 dark:bg-sky-900/30 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-900/50 shadow-xs [&_span]:text-sky-900 dark:[&_span]:text-sky-300 [&_div]:text-sky-900 dark:[&_div]:text-sky-300",
    border: "border-sky-300 dark:border-sky-800",
    text: "text-sky-900 dark:text-sky-300",
    indicator: "text-sky-900 dark:text-sky-300",
  },
};

export function getTierConfig(tierRaw?: string): TierConfig {
  const t = (tierRaw || "").toLowerCase().trim();
  if (t.includes("diamante")) return TIER_CONFIGS.diamante;
  if (t.includes("safira")) return TIER_CONFIGS.safira;
  if (t.includes("topazio") || t.includes("topázio")) return TIER_CONFIGS.topazio;
  return TIER_CONFIGS.basico;
}
