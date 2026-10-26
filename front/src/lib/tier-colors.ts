/**
 * Mapeamento oficial de categorias e cores do Azul Fidelidade.
 * Substitui rótulos genéricos 'VIP' pelas nomenclaturas e paletas oficiais:
 * - Azul Fidelidade (Nível 1 / Básico): Fundo Azul Claro (bg-sky-100 text-sky-800 border-sky-300)
 * - Topázio: Fundo Ciano/Azul Médio (bg-cyan-100 text-cyan-800 border-cyan-400)
 * - Safira: Fundo Azul Escuro (bg-blue-200 text-blue-900 border-blue-500)
 * - Diamante / Diamante Unique: Fundo Azul Marinho Escuro (bg-slate-800 text-slate-100 border-slate-900)
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
    badge: "bg-slate-800 text-slate-100 border-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700",
    seat: "bg-slate-800 text-slate-100 border-slate-900 hover:bg-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 shadow-xs",
    border: "border-slate-900 dark:border-slate-700",
    text: "text-slate-800 dark:text-slate-200",
    indicator: "text-slate-200 dark:text-slate-300",
  },
  safira: {
    key: "safira",
    name: "Safira",
    shortLabel: "SAF",
    badge: "bg-blue-200 text-blue-900 border-blue-500 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-600",
    seat: "bg-blue-200 text-blue-900 border-blue-500 hover:bg-blue-300 dark:bg-[#002855] dark:text-blue-100 dark:border-blue-400 dark:hover:bg-[#003B7A] shadow-xs",
    border: "border-blue-500 dark:border-blue-400",
    text: "text-blue-900 dark:text-blue-300",
    indicator: "text-blue-800 dark:text-blue-300",
  },
  topazio: {
    key: "topazio",
    name: "Topázio",
    shortLabel: "TOP",
    badge: "bg-cyan-100 text-cyan-800 border-cyan-400 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
    seat: "bg-cyan-100 text-cyan-800 border-cyan-400 hover:bg-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-200 dark:border-cyan-700/60 dark:hover:bg-cyan-900/40 shadow-xs",
    border: "border-cyan-400 dark:border-cyan-700",
    text: "text-cyan-800 dark:text-cyan-300",
    indicator: "text-cyan-700 dark:text-cyan-400",
  },
  basico: {
    key: "basico",
    name: "Azul Fidelidade",
    shortLabel: "AZU",
    badge: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    seat: "bg-sky-100 text-sky-800 border-sky-300 hover:bg-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800 dark:hover:bg-sky-900/50 shadow-xs",
    border: "border-sky-300 dark:border-sky-800",
    text: "text-sky-800 dark:text-sky-300",
    indicator: "text-sky-600 dark:text-sky-400",
  },
};

export function getTierConfig(tierRaw?: string): TierConfig {
  const t = (tierRaw || "").toLowerCase().trim();
  if (t.includes("diamante")) return TIER_CONFIGS.diamante;
  if (t.includes("safira")) return TIER_CONFIGS.safira;
  if (t.includes("topazio") || t.includes("topázio")) return TIER_CONFIGS.topazio;
  return TIER_CONFIGS.basico;
}
