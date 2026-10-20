import { describe, it, expect } from "vitest";
import { DEMO_SHAP } from "@/lib/demo-data";
import { FatorShap } from "@/types/api";

describe("SHAP Factors & Explainability Calculation Tests", () => {
  it("deve somar impactos aditivos de SHAP corretamente", () => {
    const { risco_base, fatores } = DEMO_SHAP;

    const somaImpactos = fatores.reduce((acc, f) => acc + f.impacto, 0);
    const riscoFinal = Math.max(0, Math.min(1, risco_base + somaImpactos));

    expect(risco_base).toBe(0.2);
    // 0.35 + 0.15 + 0.22 - 0.05 - 0.12 = 0.55
    expect(Number(somaImpactos.toFixed(2))).toBe(0.55);
    // 0.20 + 0.55 = 0.75
    expect(Number(riscoFinal.toFixed(2))).toBe(0.75);
  });

  it("deve segregar fatores que aumentam e reduzem o risco de evasão", () => {
    const fatoresPositivos = DEMO_SHAP.fatores.filter((f) => f.impacto > 0);
    const fatoresNegativos = DEMO_SHAP.fatores.filter((f) => f.impacto < 0);

    expect(fatoresPositivos.length).toBe(3);
    expect(fatoresNegativos.length).toBe(2);

    expect(fatoresPositivos.map((f) => f.variavel)).toContain(
      "Atraso > 60 min recente"
    );
    expect(fatoresNegativos.map((f) => f.variavel)).toContain(
      "Recência de voo < 15 dias"
    );
  });
});
