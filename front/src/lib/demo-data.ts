/**
 * Dados de Demonstração Isolados (Baseados nos exemplos de contract.md)
 * ATENÇÃO: Utilizados exclusivamente quando o modo de demonstração for expressamente ativado pelo usuário.
 * Não são utilizados como fallback silencioso de erros da API.
 */

import {
  DashboardKPIs,
  PersonaData,
  ParetoData,
  Momento,
  SimularResponse,
  DecisaoAuditoria,
  ShapResponse,
} from "@/types/api";

export const DEMO_KPIS: DashboardKPIs = {
  valor_protegido: 1250000.0,
  valor_gerado: 850000.0,
  custo_total: 150000.0,
  roi_por_real_gasto: 14.0,
};

export const DEMO_PERSONAS: PersonaData[] = [
  {
    persona: "Executivo Frequente",
    clv_medio: 8500.0,
    risco_evasao_medio: 0.45,
    tamanho_bolha: 1200,
  },
  {
    persona: "Família/Lazer Premium",
    clv_medio: 4200.0,
    risco_evasao_medio: 0.25,
    tamanho_bolha: 3500,
  },
  {
    persona: "Sensível a Preço",
    clv_medio: 1800.0,
    risco_evasao_medio: 0.72,
    tamanho_bolha: 2100,
  },
  {
    persona: "Corporativo Ocasional",
    clv_medio: 5600.0,
    risco_evasao_medio: 0.38,
    tamanho_bolha: 1800,
  },
];

export const DEMO_PARETO: ParetoData[] = [
  { decil_clientes: "Top 10%", valor_acumulado: 5500000.0, percentual_acumulado: 0.65 },
  { decil_clientes: "Top 20%", valor_acumulado: 6800000.0, percentual_acumulado: 0.80 },
  { decil_clientes: "Top 30%", valor_acumulado: 7400000.0, percentual_acumulado: 0.87 },
  { decil_clientes: "Top 40%", valor_acumulado: 7800000.0, percentual_acumulado: 0.92 },
  { decil_clientes: "Top 50%", valor_acumulado: 8100000.0, percentual_acumulado: 0.95 },
  { decil_clientes: "Top 60%", valor_acumulado: 8250000.0, percentual_acumulado: 0.97 },
  { decil_clientes: "Top 70%", valor_acumulado: 8350000.0, percentual_acumulado: 0.98 },
  { decil_clientes: "Top 80%", valor_acumulado: 8420000.0, percentual_acumulado: 0.99 },
  { decil_clientes: "Top 90%", valor_acumulado: 8470000.0, percentual_acumulado: 0.995 },
  { decil_clientes: "100%", valor_acumulado: 8500000.0, percentual_acumulado: 1.0 },
];

export const DEMO_MOMENTOS: Momento[] = [
  {
    id: "mom_789",
    cliente_id: "cli_123",
    tipo_simulacao: "Reativa",
    descricao: "Atraso crítico de 4 horas - Voo AD4321 (VCP -> REC)",
    persona: "Executivo Frequente",
    clv_previsto: 8500.0,
    risco_evasao_atual: 0.85,
  },
  {
    id: "mom_790",
    cliente_id: "cli_456",
    tipo_simulacao: "Proativa",
    descricao: "Queda de 60% na frequência de viagens nos últimos 45 dias",
    persona: "Corporativo Ocasional",
    clv_previsto: 5600.0,
    risco_evasao_atual: 0.62,
  },
  {
    id: "mom_791",
    cliente_id: "cli_789",
    tipo_simulacao: "Reativa",
    descricao: "Extravio de bagagem com item prioritário - Voo AD2105",
    persona: "Família/Lazer Premium",
    clv_previsto: 4200.0,
    risco_evasao_atual: 0.78,
  },
];

export const DEMO_SIMULACAO_RESULT: SimularResponse = {
  uplift_status: "Persuadível",
  ranking_acoes: [
    {
      acao: "Upgrade de Cabine",
      custo_acao: 300.0,
      retorno_liquido: 850.0,
    },
    {
      acao: "Voucher Azul Viagens R$ 150",
      custo_acao: 150.0,
      retorno_liquido: 450.0,
    },
    {
      acao: "Crédito de 5.000 Pontos Fidelidade",
      custo_acao: 90.0,
      retorno_liquido: 310.0,
    },
  ],
  decisao_final: {
    acao_vencedora: "Upgrade de Cabine",
    mensagem_llm:
      "Olá! Notamos o atraso no seu voo. Sabemos que seu tempo é valioso. Como cortesia e agradecimento por ser um cliente Diamante, garantimos um upgrade para a cabine premium no seu próximo trecho.",
    regra_rag_consultada:
      "Clientes Diamante têm prioridade em upgrades mediante disponibilidade. Em casos de falha operacional grave, o benefício pode ser antecipado conforme diretriz de retenção de alto valor.",
  },
};

export const DEMO_AUDITORIA_DECISOES: DecisaoAuditoria[] = [
  {
    decisao_id: "dec_456",
    cliente_id: "cli_123",
    data_decisao: "2026-10-20T14:30:00Z",
    tipo_simulacao: "Reativa",
    acao_executada: "Bloqueada pelo Árbitro",
    motivo_bloqueio: "Janela de silêncio de 72h (Cliente já acionado recentemente)",
    custo_realizado: 0.0,
    versao_modelos: {
      clv: "v1.2",
      churn: "v2.0",
      llm: "gpt-4o-mini-rag",
    },
  },
  {
    decisao_id: "dec_457",
    cliente_id: "cli_889",
    data_decisao: "2026-10-20T15:10:00Z",
    tipo_simulacao: "Reativa",
    acao_executada: "Upgrade de Cabine",
    motivo_bloqueio: null,
    custo_realizado: 300.0,
    versao_modelos: {
      clv: "v1.2",
      churn: "v2.0",
      llm: "gpt-4o-mini-rag",
    },
  },
  {
    decisao_id: "dec_458",
    cliente_id: "cli_990",
    data_decisao: "2026-10-20T16:05:00Z",
    tipo_simulacao: "Proativa",
    acao_executada: "Voucher Azul Viagens R$ 150",
    motivo_bloqueio: null,
    custo_realizado: 150.0,
    versao_modelos: {
      clv: "v1.2",
      churn: "v2.0",
      llm: "gpt-4o-mini-rag",
    },
  },
  {
    decisao_id: "dec_459",
    cliente_id: "cli_204",
    data_decisao: "2026-10-20T17:40:00Z",
    tipo_simulacao: "Proativa",
    acao_executada: "Não Agir (ROI Negativo)",
    motivo_bloqueio: "Custo da ação superior ao CLV recuperável esperado",
    custo_realizado: 0.0,
    versao_modelos: {
      clv: "v1.2",
      churn: "v2.0",
      llm: "gpt-4o-mini-rag",
    },
  },
];

export const DEMO_SHAP: ShapResponse = {
  risco_base: 0.2,
  fatores: [
    {
      variavel: "Atraso > 60 min recente",
      impacto: 0.35,
      direcao: "positivo",
    },
    {
      variavel: "Sentimento negativo (Reclame Aqui)",
      impacto: 0.15,
      direcao: "positivo",
    },
    {
      variavel: "Cancelamento de voo nos últimos 30 dias",
      impacto: 0.22,
      direcao: "positivo",
    },
    {
      variavel: "Recência de voo < 15 dias",
      impacto: -0.05,
      direcao: "negativo",
    },
    {
      variavel: "Assinante Clube Azul ativo há > 1 ano",
      impacto: -0.12,
      direcao: "negativo",
    },
  ],
};
