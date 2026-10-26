import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api, ApiError } from "../api";
import { DEMO_KPIS, DEMO_PERSONAS, DEMO_PARETO, DEMO_MOMENTOS, DEMO_SIMULACAO_RESULT, DEMO_AUDITORIA_DECISOES, DEMO_SHAP } from "../demo-data";

describe("API Client Integration Tests (contract.md compliance)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("getKPIs deve chamar GET /api/v1/dashboard/kpis", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => DEMO_KPIS,
    } as Response);

    const data = await api.getKPIs();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/dashboard/kpis"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
      })
    );
    expect(data.valor_protegido).toBe(1250000);
    expect(data.roi_por_real_gasto).toBe(14);
  });

  it("getPersonas deve chamar GET /api/v1/dashboard/personas", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => DEMO_PERSONAS,
    } as Response);

    const data = await api.getPersonas();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/dashboard/personas"),
      expect.anything()
    );
    expect(data).toHaveLength(DEMO_PERSONAS.length);
    expect(data[0].persona).toBe("Gestor Corporativo");
  });

  it("getPareto deve chamar GET /api/v1/dashboard/pareto", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => DEMO_PARETO,
    } as Response);

    const data = await api.getPareto();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/dashboard/pareto"),
      expect.anything()
    );
    expect(data[0].decil_clientes).toBe("Top 10%");
  });

  it("getMomentos deve chamar GET /api/v1/momentos", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => DEMO_MOMENTOS,
    } as Response);

    const data = await api.getMomentos();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/momentos"),
      expect.anything()
    );
    expect(data[0].id).toBe("mom_789");
  });

  it("simularMotor deve chamar POST /api/v1/motor/simular com momento_id no body", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => DEMO_SIMULACAO_RESULT,
    } as Response);

    const payload = { momento_id: "mom_789" };
    const data = await api.simularMotor(payload);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/motor/simular"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      })
    );
    expect(data.uplift_status).toBe("Persuadível");
    expect(data.decisao_final.acao_vencedora).toBe("Upgrade de Cabine");
  });

  it("getAuditoriaDecisoes deve chamar GET /api/v1/auditoria/decisoes", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => DEMO_AUDITORIA_DECISOES,
    } as Response);

    const data = await api.getAuditoriaDecisoes();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auditoria/decisoes"),
      expect.anything()
    );
    expect(data[0].decisao_id).toBe("dec_456");
  });

  it("getDecisaoShap deve chamar GET /api/v1/auditoria/decisoes/:id/shap com id codificado", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => DEMO_SHAP,
    } as Response);

    const data = await api.getDecisaoShap("dec_456");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auditoria/decisoes/dec_456/shap"),
      expect.anything()
    );
    expect(data.risco_base).toBe(0.20);
    expect(data.fatores).toHaveLength(5);
  });

  it("deve lançar ApiError com status HTTP quando o backend responde com erro", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({ detail: "Decisão não encontrada" }),
    } as Response);

    await expect(api.getDecisaoShap("inexistente")).rejects.toThrow(ApiError);
    try {
      await api.getDecisaoShap("inexistente");
    } catch (e) {
      const err = e as ApiError;
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe("Decisão não encontrada");
    }
  });

  it("deve lançar ApiError com status 0 em caso de erro de rede ou conexão recusada", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Failed to fetch"));

    await expect(api.getKPIs()).rejects.toThrow(ApiError);
    try {
      await api.getKPIs();
    } catch (e) {
      const err = e as ApiError;
      expect(err.statusCode).toBe(0);
      expect(err.message).toContain("Falha de conexão com o backend");
    }
  });

  it("registrarAcaoConcluida deve chamar POST /api/v1/motor/acao-concluida com payload tipado", async () => {
    const mockResponse = {
      status: "sucesso",
      mensagem: "Ação registrada",
      registro_id: 1,
      flight_id: "AD4409",
      assento: "14C",
      id_cliente: "CLI_TEST_01",
      acao_executada: "Acolhimento Pessoal + Voucher 1000pts",
      custo: 50.0,
      origem: "OFFBOARD_CRM",
      timestamp: "2026-10-26T00:00:00Z",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await api.registrarAcaoConcluida({
      flight_id: "AD4409",
      assento: "14C",
      id_cliente: "CLI_TEST_01",
      acao: "Acolhimento Pessoal + Voucher 1000pts",
      custo: 50.0,
      origem: "OFFBOARD_CRM",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/motor/acao-concluida"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"origem":"OFFBOARD_CRM"'),
      })
    );
    expect(result.status).toBe("sucesso");
    expect(result.origem).toBe("OFFBOARD_CRM");
  });
});
