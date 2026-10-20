/**
 * Contratos de Tipagem Oficiais - Motor de Retenção de Alto Valor (Azul)
 * Fonte de Verdade: contract.md (raiz do projeto)
 */

// ==========================================
// Tela 1: Painel de Valor (Visão Executiva)
// ==========================================

export interface DashboardKPIs {
  valor_protegido: number;
  valor_gerado: number;
  custo_total: number;
  roi_por_real_gasto: number;
}

export interface PersonaData {
  persona: string;
  clv_medio: number;
  risco_evasao_medio: number;
  tamanho_bolha: number;
}

export interface ParetoData {
  decil_clientes: string;
  valor_acumulado: number;
  percentual_acumulado: number;
}

// ==========================================
// Tela 2: Central de Decisões (Simulador)
// ==========================================

export interface Momento {
  id: string;
  cliente_id: string;
  tipo_simulacao: "Reativa" | "Proativa" | string;
  descricao: string;
  persona: string;
  clv_previsto: number;
  risco_evasao_atual: number;
}

export interface SimularPayload {
  momento_id: string;
}

export interface RankingAcao {
  acao: string;
  custo_acao: number;
  retorno_liquido: number;
}

export interface DecisaoFinal {
  acao_vencedora: string;
  mensagem_llm: string;
  regra_rag_consultada: string;
}

export interface SimularResponse {
  uplift_status: string;
  ranking_acoes: RankingAcao[];
  decisao_final: DecisaoFinal;
}

// ==========================================
// Tela 3: Logs e Explicabilidade (Auditoria)
// ==========================================

export interface VersaoModelos {
  clv: string;
  churn: string;
  llm: string;
}

export interface DecisaoAuditoria {
  decisao_id: string;
  cliente_id: string;
  data_decisao: string;
  tipo_simulacao: string;
  acao_executada: string;
  motivo_bloqueio: string | null;
  custo_realizado: number;
  versao_modelos: VersaoModelos;
}

export interface FatorShap {
  variavel: string;
  impacto: number;
  direcao: "positivo" | "negativo";
}

export interface ShapResponse {
  risco_base: number;
  fatores: FatorShap[];
}

export interface ApiErrorResponse {
  detail?: string | Array<{ msg: string; loc?: string[] }>;
  message?: string;
  status?: number;
}
