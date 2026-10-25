import { describe, it, expect } from "vitest";
import {
  getClientAuditInfo,
  getAuditStatusCategory,
} from "../lib/audit-helpers";
import { DecisaoAuditoria } from "@/types/api";

describe("Audit Helpers & Business Logic", () => {
  it("deve mapear corretamente passageiros conhecidos com seus tiers", () => {
    const cli123 = getClientAuditInfo("cli_123");
    expect(cli123.nome).toBe("Carlos Eduardo Mendes");
    expect(cli123.tier).toBe("Diamante");
    expect(cli123.voo).toBe("AD4321");

    const cli889 = getClientAuditInfo("cli_889");
    expect(cli889.tier).toBe("Safira");
  });

  it("deve fornecer fallback seguro para clientes desconhecidos", () => {
    const fallback = getClientAuditInfo("cli_desconhecido_999");
    expect(fallback.nome).toContain("#cli_desconhecido_999");
    expect(fallback.tier).toBe("Safira");
  });

  it("deve categorizar status de auditoria corretamente", () => {
    const decisaoExecutada: DecisaoAuditoria = {
      decisao_id: "dec_1",
      cliente_id: "cli_889",
      data_decisao: "2026-10-24T12:00:00Z",
      tipo_simulacao: "Reativa",
      acao_executada: "Upgrade de Cabine",
      motivo_bloqueio: null,
      custo_realizado: 300.0,
      versao_modelos: { clv: "v1.2", churn: "v2.0", llm: "gpt-4o-mini-rag" },
    };
    expect(getAuditStatusCategory(decisaoExecutada)).toBe("EXECUTADA");

    const decisaoLgpd: DecisaoAuditoria = {
      decisao_id: "dec_2",
      cliente_id: "cli_123",
      data_decisao: "2026-10-24T12:00:00Z",
      tipo_simulacao: "Reativa",
      acao_executada: "Bloqueada pelo Árbitro",
      motivo_bloqueio: "Janela de silêncio de 72h (Cliente já acionado recentemente)",
      custo_realizado: 0.0,
      versao_modelos: { clv: "v1.2", churn: "v2.0", llm: "gpt-4o-mini-rag" },
    };
    expect(getAuditStatusCategory(decisaoLgpd)).toBe("BLOQUEIO_LGPD");

    const decisaoRoi: DecisaoAuditoria = {
      decisao_id: "dec_3",
      cliente_id: "cli_204",
      data_decisao: "2026-10-24T12:00:00Z",
      tipo_simulacao: "Proativa",
      acao_executada: "Não Agir (ROI Negativo)",
      motivo_bloqueio: "Custo da ação superior ao CLV recuperável esperado",
      custo_realizado: 0.0,
      versao_modelos: { clv: "v1.2", churn: "v2.0", llm: "gpt-4o-mini-rag" },
    };
    expect(getAuditStatusCategory(decisaoRoi)).toBe("BLOQUEIO_UPLIFT");

    const decisaoRedundancia: DecisaoAuditoria = {
      decisao_id: "dec_4",
      cliente_id: "cli_305",
      data_decisao: "2026-10-24T12:00:00Z",
      tipo_simulacao: "Proativa",
      acao_executada: "Bloqueada (Anti-Redundância)",
      motivo_bloqueio: "Cliente Diamante já possui bagagem despachada e Espaço Azul ilimitados",
      custo_realizado: 0.0,
      versao_modelos: { clv: "v1.2", churn: "v2.0", llm: "gpt-4o-mini-rag" },
    };
    expect(getAuditStatusCategory(decisaoRedundancia)).toBe("BLOQUEIO_REDUNDANCIA");
  });
});
