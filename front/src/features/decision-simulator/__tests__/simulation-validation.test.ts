import { describe, it, expect } from "vitest";
import * as z from "zod";

const simularSchema = z.object({
  momento_id: z.string().min(1, "É obrigatório selecionar ou informar o ID de um momento"),
});

describe("Simulation Form Validation Tests (Zod)", () => {
  it("deve aceitar payload válido com momento_id", () => {
    const valid = simularSchema.safeParse({ momento_id: "mom_789" });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.momento_id).toBe("mom_789");
    }
  });

  it("deve rejeitar momento_id vazio com mensagem de erro descritiva", () => {
    const invalid = simularSchema.safeParse({ momento_id: "" });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.errors[0].message).toContain(
        "É obrigatório selecionar ou informar o ID de um momento"
      );
    }
  });

  it("deve rejeitar objeto sem momento_id", () => {
    const invalid = simularSchema.safeParse({});
    expect(invalid.success).toBe(false);
  });
});
