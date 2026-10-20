import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatRatio,
  formatDateTime,
} from "../formatters";

describe("Formatters Unit Tests", () => {
  describe("formatCurrency", () => {
    it("deve formatar valores monetários em BRL corretamente", () => {
      const formatted = formatCurrency(1250000);
      // Remove espaços não-quebráveis para teste cross-platform
      const clean = formatted.replace(/\u00a0/g, " ");
      expect(clean).toContain("R$");
      expect(clean).toContain("1.250.000,00");
    });

    it("deve retornar R$ 0,00 para valores nulos, indefinidos ou NaN", () => {
      expect(formatCurrency(0).replace(/\u00a0/g, " ")).toContain("R$ 0,00");
      expect(formatCurrency(null as unknown as number)).toBe("R$ 0,00");
      expect(formatCurrency(undefined as unknown as number)).toBe("R$ 0,00");
      expect(formatCurrency(NaN)).toBe("R$ 0,00");
    });
  });

  describe("formatPercent", () => {
    it("deve formatar percentuais com 1 casa decimal padrão", () => {
      const formatted = formatPercent(0.65);
      expect(formatted).toBe("65,0%");
    });

    it("deve respeitar número de casas decimais customizado", () => {
      expect(formatPercent(0.4567, 2)).toBe("45,67%");
      expect(formatPercent(0.85, 0)).toBe("85%");
    });

    it("deve retornar 0% para valores inválidos", () => {
      expect(formatPercent(null as unknown as number)).toBe("0%");
      expect(formatPercent(NaN)).toBe("0%");
    });
  });

  describe("formatNumber", () => {
    it("deve formatar números inteiros no padrão pt-BR", () => {
      expect(formatNumber(1200)).toBe("1.200");
      expect(formatNumber(3500)).toBe("3.500");
    });
  });

  describe("formatRatio", () => {
    it("deve formatar ratios com sufixo x", () => {
      expect(formatRatio(14)).toBe("14.0x");
      expect(formatRatio(3.55)).toBe("3.5x");
    });

    it("deve retornar 0.0x para valores nulos ou NaN", () => {
      expect(formatRatio(NaN)).toBe("0.0x");
    });
  });

  describe("formatDateTime", () => {
    it("deve formatar strings ISO válidas", () => {
      const formatted = formatDateTime("2026-10-20T14:30:00Z");
      expect(formatted).toContain("2026");
      expect(formatted).not.toBe("-");
    });

    it("deve retornar hífen para datas vazias", () => {
      expect(formatDateTime("")).toBe("-");
    });
  });
});
