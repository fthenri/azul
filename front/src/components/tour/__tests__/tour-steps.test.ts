import { describe, it, expect } from "vitest";
import { MASTER_TOUR_STEPS } from "../tour-steps";

describe("Driver.js Master Tour Steps Configuration", () => {
  it("deve conter todos os passos fundamentais da narrativa do produto", () => {
    expect(MASTER_TOUR_STEPS.length).toBeGreaterThanOrEqual(10);

    const stepIds = MASTER_TOUR_STEPS.map((s) => s.id);
    expect(stepIds).toContain("sidebar-brand");
    expect(stepIds).toContain("executive-kpis");
    expect(stepIds).toContain("pareto-chart");
    expect(stepIds).toContain("personas-chart");
    expect(stepIds).toContain("moments-queue");
    expect(stepIds).toContain("seat-map");
    expect(stepIds).toContain("audit-table");
  });

  it("todos os passos devem conter rotas, seletores, títulos e descrições válidos", () => {
    MASTER_TOUR_STEPS.forEach((step, idx) => {
      expect(step.route).toMatch(/^\/[a-z0-9\-/]*$/);
      expect(step.element).toMatch(/^\[data-tour="[a-z0-9\-]+"\]$/);
      expect(step.title.length).toBeGreaterThan(3);
      expect(step.description.length).toBeGreaterThan(15);
    });
  });

  it("o primeiro passo deve começar no dashboard e o último passo deve apontar para a auditoria", () => {
    expect(MASTER_TOUR_STEPS[0].route).toBe("/dashboard");
    expect(MASTER_TOUR_STEPS[0].id).toBe("sidebar-brand");

    const lastStep = MASTER_TOUR_STEPS[MASTER_TOUR_STEPS.length - 1];
    expect(lastStep.id).toBe("audit-table");
  });
});
