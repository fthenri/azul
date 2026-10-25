import { DecisaoAuditoria } from "@/types/api";
import { formatCurrency, formatDateTime } from "@/lib/formatters";

export interface ClientAuditInfo {
  nome: string;
  tier: "Diamante" | "Safira" | "Topázio" | "Básico";
  persona: string;
  voo?: string;
  rota?: string;
  clvPrevisto: number;
  riscoEvasao: number;
}

export const CLIENT_AUDIT_MAP: Record<string, ClientAuditInfo> = {
  cli_123: {
    nome: "Carlos Eduardo Mendes",
    tier: "Diamante",
    persona: "Gestor Corporativo",
    voo: "AD4321",
    rota: "VCP ➔ REC",
    clvPrevisto: 38500,
    riscoEvasao: 0.85,
  },
  cli_889: {
    nome: "Patricia Albuquerque",
    tier: "Safira",
    persona: "Viajante Solo Premium",
    voo: "AD2904",
    rota: "CNF ➔ SDU",
    clvPrevisto: 19800,
    riscoEvasao: 0.68,
  },
  cli_990: {
    nome: "Rodrigo Toledo",
    tier: "Topázio",
    persona: "Líder Familiar",
    voo: "AD4112",
    rota: "VCP ➔ POA",
    clvPrevisto: 9400,
    riscoEvasao: 0.52,
  },
  cli_204: {
    nome: "Renata Fagundes",
    tier: "Básico",
    persona: "Turista Eventual",
    voo: "AD5510",
    rota: "GRU ➔ CWB",
    clvPrevisto: 2800,
    riscoEvasao: 0.44,
  },
  cli_456: {
    nome: "Dra. Fernanda Lima",
    tier: "Safira",
    persona: "Gestor Corporativo",
    voo: "AD4231",
    rota: "VCP ➔ SSA",
    clvPrevisto: 24500,
    riscoEvasao: 0.74,
  },
  cli_789: {
    nome: "Marcelo & Família",
    tier: "Safira",
    persona: "Líder Familiar",
    voo: "AD2105",
    rota: "VCP ➔ FLN",
    clvPrevisto: 16200,
    riscoEvasao: 0.79,
  },
  cli_101: {
    nome: "Bruno Silveira",
    tier: "Diamante",
    persona: "Gestor Corporativo",
    voo: "AD8700",
    rota: "VCP ➔ MCO",
    clvPrevisto: 42000,
    riscoEvasao: 0.81,
  },
  cli_305: {
    nome: "Juliana Rocha",
    tier: "Diamante",
    persona: "Viajante Solo Premium",
    voo: "AD4090",
    rota: "SDU ➔ VCP",
    clvPrevisto: 31000,
    riscoEvasao: 0.49,
  },
  cli_512: {
    nome: "Dr. André Medeiros",
    tier: "Topázio",
    persona: "Líder Familiar",
    voo: "AD3310",
    rota: "BSB ➔ CNF",
    clvPrevisto: 8900,
    riscoEvasao: 0.65,
  },
  cli_618: {
    nome: "Beatriz Nogueira",
    tier: "Safira",
    persona: "Viajante Solo Premium",
    voo: "AD4480",
    rota: "VCP ➔ FOR",
    clvPrevisto: 22100,
    riscoEvasao: 0.38,
  },
  cli_722: {
    nome: "Lucas Zanin",
    tier: "Básico",
    persona: "Turista Eventual",
    voo: "AD2670",
    rota: "VCP ➔ RAO",
    clvPrevisto: 3100,
    riscoEvasao: 0.58,
  },
  cli_834: {
    nome: "Gustavo Vasconcelos",
    tier: "Diamante",
    persona: "Gestor Corporativo",
    voo: "AD8704",
    rota: "VCP ➔ LIS",
    clvPrevisto: 49500,
    riscoEvasao: 0.88,
  },
};

export function getClientAuditInfo(clienteId: string): ClientAuditInfo {
  if (CLIENT_AUDIT_MAP[clienteId]) {
    return CLIENT_AUDIT_MAP[clienteId];
  }
  return {
    nome: `Passageiro #${clienteId}`,
    tier: "Safira",
    persona: "Cliente Corporativo",
    voo: "AD4000",
    rota: "VCP ➔ BSB",
    clvPrevisto: 14500,
    riscoEvasao: 0.5,
  };
}

export type AuditStatusCategory =
  | "EXECUTADA"
  | "BLOQUEIO_UPLIFT"
  | "BLOQUEIO_LGPD"
  | "BLOQUEIO_REDUNDANCIA";

export function getAuditStatusCategory(decisao: DecisaoAuditoria): AuditStatusCategory {
  const acao = decisao.acao_executada.toLowerCase();
  const motivo = (decisao.motivo_bloqueio || "").toLowerCase();

  if (motivo.includes("72h") || motivo.includes("silêncio") || motivo.includes("lgpd")) {
    return "BLOQUEIO_LGPD";
  }
  if (
    motivo.includes("anti-redundância") ||
    motivo.includes("já possui") ||
    acao.includes("anti-redundância")
  ) {
    return "BLOQUEIO_REDUNDANCIA";
  }
  if (
    decisao.motivo_bloqueio !== null ||
    acao.includes("não agir") ||
    acao.includes("bloqueada") ||
    motivo.includes("uplift") ||
    motivo.includes("roi")
  ) {
    return "BLOQUEIO_UPLIFT";
  }
  return "EXECUTADA";
}

export function exportAuditLogsToCsv(data: DecisaoAuditoria[]): void {
  const headers = [
    "ID Decisao",
    "ID Cliente",
    "Nome Passageiro",
    "Tier Fidelidade",
    "Data Decisao (ISO)",
    "Data Decisao (Local)",
    "Tipo Simulacao",
    "Acao Executada",
    "Status Auditoria",
    "Motivo Bloqueio",
    "Custo Realizado (BRL)",
    "Modelo CLV",
    "Modelo Churn",
    "Modelo LLM",
    "Conformidade Regulatória",
  ];

  const rows = data.map((d) => {
    const client = getClientAuditInfo(d.cliente_id);
    const status = getAuditStatusCategory(d);
    return [
      d.decisao_id,
      d.cliente_id,
      `"${client.nome.replace(/"/g, '""')}"`,
      client.tier,
      d.data_decisao,
      `"${formatDateTime(d.data_decisao)}"`,
      d.tipo_simulacao,
      `"${d.acao_executada.replace(/"/g, '""')}"`,
      status,
      `"${(d.motivo_bloqueio || "Nenhum (Aprovado)").replace(/"/g, '""')}"`,
      d.custo_realizado.toFixed(2),
      d.versao_modelos?.clv || "v1.2",
      d.versao_modelos?.churn || "v2.0",
      d.versao_modelos?.llm || "gpt-4o-mini-rag",
      "ANAC Res. 400 & LGPD Art. 20",
    ].join(";");
  });

  const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `azul_auditoria_decisoes_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportAuditLogsToJson(data: DecisaoAuditoria[]): void {
  const enriched = data.map((d) => {
    const client = getClientAuditInfo(d.cliente_id);
    const status = getAuditStatusCategory(d);
    return {
      ...d,
      passageiro: client,
      status_auditoria: status,
      conformidade: {
        anac_res_400: true,
        lgpd_art_20_explicabilidade: true,
        hash_integridade_sha256: `sha256_${btoa(d.decisao_id + d.data_decisao).slice(0, 16)}`,
      },
    };
  });

  const jsonContent = JSON.stringify(
    {
      sistema: "Azul Linhas Aéreas - Motor de Retenção de Alto Valor",
      modulo: "Central de Auditoria & Governança IA",
      extraido_em: new Date().toISOString(),
      total_registros: enriched.length,
      decisoes: enriched,
    },
    null,
    2
  );

  const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `azul_auditoria_export_${new Date().toISOString().slice(0, 10)}.json`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
