/**
 * Dados de Demonstração Isolados (Baseados nos exemplos de contract.md)
 * ATENÇÃO: Utilizados exclusivamente quando o modo de demonstração for expressamente ativado pelo usuário.
 * Não são utilizados como fallback silencioso de erros da API.
 */

import {
  DashboardKPIs,
  PersonaData,
  ParetoData,
  ParetoRoiData,
  Momento,
  SimularResponse,
  DecisaoAuditoria,
  ShapResponse,
  AssentoVoo,
  MetadataAeronave,
  VooSimuladoResponse,
  SimularBordoResponse,
} from "@/types/api";

export const DEMO_KPIS: DashboardKPIs = {
  valor_protegido: 1250000.0,
  valor_gerado: 850000.0,
  custo_total: 150000.0,
  roi_por_real_gasto: 14.0,
};

export const DEMO_PERSONAS: PersonaData[] = [
  {
    persona: "Gestor Corporativo",
    clv_medio: 36031.0,
    clv_previsto: 36031.0,
    score_influencia: 92.0,
    risco_evasao_medio: 0.29,
    tamanho_bolha: 507,
  },
  {
    persona: "Viajante Solo Premium",
    clv_medio: 26312.0,
    clv_previsto: 26312.0,
    score_influencia: 28.5,
    risco_evasao_medio: 0.27,
    tamanho_bolha: 507,
  },
  {
    persona: "Líder Familiar",
    clv_medio: 7976.0,
    clv_previsto: 7976.0,
    score_influencia: 84.1,
    risco_evasao_medio: 0.31,
    tamanho_bolha: 1655,
  },
  {
    persona: "Turista Eventual",
    clv_medio: 2004.0,
    clv_previsto: 2004.0,
    score_influencia: 25.2,
    risco_evasao_medio: 0.29,
    tamanho_bolha: 2331,
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

export const DEMO_PARETO_ROI: ParetoRoiData[] = [
  {
    faixa_pareto: 'Top 10% Receita',
    total_clientes: 48,
    clv_medio: 46616.99,
    risco_evasao_medio: 0.3932,
    total_receita_em_risco: 852183.13,
    perda_media_por_cliente: 17753.82,
    roi_retencao_multiplicador: 147.9,
  },
  {
    faixa_pareto: 'Top 20% Receita',
    total_clientes: 75,
    clv_medio: 30550.26,
    risco_evasao_medio: 0.3694,
    total_receita_em_risco: 840139.24,
    perda_media_por_cliente: 11201.86,
    roi_retencao_multiplicador: 93.3,
  },
  {
    faixa_pareto: 'Top 50% Receita',
    total_clientes: 471,
    clv_medio: 14502.75,
    risco_evasao_medio: 0.298,
    total_receita_em_risco: 2116751.87,
    perda_media_por_cliente: 4494.17,
    roi_retencao_multiplicador: 37.5,
  },
  {
    faixa_pareto: 'Cauda Longa',
    total_clientes: 4406,
    clv_medio: 2579.72,
    risco_evasao_medio: 0.2938,
    total_receita_em_risco: 3038506.46,
    perda_media_por_cliente: 689.63,
    roi_retencao_multiplicador: 5.7,
  },
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

const DEMO_NAMES = [
  "Lucas Silveira", "Beatriz Mendes", "Gabriel Rocha", "Mariana Oliveira", "Carlos Eduardo",
  "Fernanda Lima", "Rodrigo Alves", "Juliana Costa", "Rafael Martins", "Camila Souza",
  "Thiago Ribeiro", "Larissa Santos", "Bruno Carvalho", "Aline Pereira", "Felipe Ferreira",
  "Amanda Barbosa", "Diego Castro", "Priscila Ramos", "Marcelo Dias", "Renata Gomes",
];

export const DEMO_FROTA: Record<string, MetadataAeronave> = {
  A320neo: {
    modelo: "Airbus A320neo",
    codigo: "A320neo",
    fileiras: 29,
    layout: ["A", "B", "C", "D", "E", "F"],
    total_assentos: 174,
  },
  "E195-E2": {
    modelo: "Embraer E195-E2",
    codigo: "E195-E2",
    fileiras: 34,
    layout: ["A", "B", "C", "D"],
    total_assentos: 136,
  },
  "ATR 72-600": {
    modelo: "ATR 72-600",
    codigo: "ATR 72-600",
    fileiras: 18,
    layout: ["A", "B", "C", "D"],
    total_assentos: 72,
  },
};

export function getDemoVooSimulado(modeloCodigo?: string): VooSimuladoResponse {
  const chaves = Object.keys(DEMO_FROTA);
  const escolhido = modeloCodigo && DEMO_FROTA[modeloCodigo]
    ? modeloCodigo
    : chaves[Math.floor(Math.random() * chaves.length)];

  const meta = DEMO_FROTA[escolhido];
  const assentos: AssentoVoo[] = [];
  let idx = 0;

  for (let fileira = 1; fileira <= meta.fileiras; fileira++) {
    for (const col of meta.layout) {
      const code = `${fileira}${col}`;
      idx++;
      const nome = DEMO_NAMES[idx % DEMO_NAMES.length];

      let status: "critico" | "vip" | "normal" = "normal";
      let tier = "Básico";
      let clv = 2400.0;
      let risco = 0.22;
      let atrito = 0.4;
      let pareto = "Cauda Longa";
      let persona = "Viajante Regional";

      if (idx % 8 === 3) {
        status = "critico";
        tier = fileira <= 4 ? "Diamante" : "Safira";
        clv = fileira <= 4 ? 14800.0 : 6200.0;
        risco = 0.72 + (idx % 20) * 0.01;
        atrito = 4.2;
        pareto = fileira <= 4 ? "Top 10% Receita" : "Top 50% Receita";
        persona = fileira <= 4 ? "Executivo Frequente" : "Caçador de Pontos";
      } else if (fileira <= 4 || idx % 9 === 0) {
        status = "vip";
        tier = "Diamante";
        clv = 16500.0 - (fileira * 300);
        risco = 0.28;
        atrito = 0.8;
        pareto = "Top 10% Receita";
        persona = "Executivo Frequente";
      }

      assentos.push({
        assento: code,
        status,
        dados_cliente: {
          id_cliente: `cli_demo_${1000 + idx}`,
          nome,
          tier_fidelidade: tier,
          persona,
          clv_previsto: clv,
          faixa_pareto: pareto,
          risco_evasao: risco,
          score_atrito_acumulado: atrito,
        },
      });
    }
  }

  return {
    metadata_aeronave: meta,
    assentos,
  };
}

export const DEMO_VOO_SIMULADO: VooSimuladoResponse = getDemoVooSimulado("A320neo");

export function getDemoSimularBordo(assento: string, id_cliente: string): SimularBordoResponse {
  const item = DEMO_VOO_SIMULADO.assentos.find((a) => a.assento === assento);
  const cliente = item ? item.dados_cliente : {
    id_cliente,
    nome: "Passageiro Especial",
    tier_fidelidade: "Diamante",
    persona: "Executivo Frequente",
    clv_previsto: 12500,
    faixa_pareto: "Top 10% Receita",
    risco_evasao: 0.75,
    score_atrito_acumulado: 3.8,
  };

  const isCritico = cliente.risco_evasao > 0.6;

  return {
    assento,
    id_cliente,
    acao_sugerida: isCritico ? "BEBIDA_CORTESIA" : "ABORDAGEM_CHEFE_CABINE",
    custo_acao: isCritico ? 15.0 : 0.0,
    retorno_liquido: isCritico ? 1850.0 : 2400.0,
    instrucao_comissario: isCritico
      ? `Atenção Tripulação: O passageiro ${cliente.nome} (${cliente.tier_fidelidade}) no assento ${assento} teve um atrito recente em conexão. Por gentileza, ofereça uma bebida cortesia do carrinho especial, pergunte sobre a experiência de hoje e transmita a atenção dedicada da Azul.`
      : `Passageiro ${cliente.nome} no assento ${assento} é nosso cliente ${cliente.tier_fidelidade} (${cliente.faixa_pareto}). Aborde discretamente agradecendo pela preferência constante na rota e deseje um excelente voo em nome do Comandante e da Azul.`,
    dados_cliente: cliente as unknown as Record<string, unknown>,
  };
}
