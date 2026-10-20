/**
 * Utilitários puros e tipados de formatação financeira e estatística
 */

export function formatCurrency(value: number): string {
  if (value === undefined || value === null || isNaN(value)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatPercent(value: number, decimals: number = 1): string {
  if (value === undefined || value === null || isNaN(value)) return "0%";
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatNumber(value: number): string {
  if (value === undefined || value === null || isNaN(value)) return "0";
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function formatRatio(value: number): string {
  if (value === undefined || value === null || isNaN(value)) return "0.0x";
  return `${value.toFixed(1)}x`;
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return "-";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(date);
  } catch {
    return isoString;
  }
}
