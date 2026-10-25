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
  persona_nome?: string;
  clv_medio: number;
  clv_previsto?: number;
  risco_evasao_medio: number;
  tamanho_bolha: number;
  score_influencia?: number;
}

export interface ParetoData {
  decil_clientes: string;
  valor_acumulado: number;
  percentual_acumulado: number;
}

export interface ParetoRoiData {
  faixa_pareto: string;
  total_clientes: number;
  clv_medio: number;
  risco_evasao_medio: number;
  total_receita_em_risco: number;
  perda_media_por_cliente: number;
  roi_retencao_multiplicador: number;
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
  momento_id?: string;
  id_cliente?: string;
  cliente_id?: string;
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
  notificacao_interna?: string;
  mensagem_crm?: string;
}

export interface SimularResponse {
  uplift_status: string;
  ranking_acoes: RankingAcao[];
  decisao_final: DecisaoFinal;
  dados_cliente?: {
    id_cliente: string;
    tier_fidelidade: string;
    persona: string;
    clv_previsto: number;
    risco_evasao: number;
    score_atrito_acumulado: number;
  };
  notificacao_interna?: string;
  mensagem_crm?: string;
}

// ==========================================
// Tela 3: Auditoria e Explicabilidade
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
  motivo_bloqueio?: string | null;
  custo_realizado: number;
  versao_modelos: VersaoModelos;
}

export interface FatorShap {
  variavel: string;
  impacto: number;
  direcao: "positivo" | "negativo";
}

export interface FatorRiscoShap {
  fator: string;
  peso: number;
}

export interface ShapResponse {
  risco_base: number;
  fatores: FatorShap[];
  decisao_id?: string;
  cliente_id?: string;
  fatores_risco?: FatorRiscoShap[];
}

// ==========================================
// Parâmetros de Simulação do Frontend
// ==========================================

export interface ParametrosSimulacao {
  clv_previsto: number;
  risco_evasao: number;
  categoria: "Basico" | "Topazio" | "Safira" | "Diamante";
  horas_atraso_acumuladas: number;
  cancelamentos_recentes: number;
  consentimento_marketing: boolean;
}

// ==========================================
// Tela 4: Visão da Tripulação (Bordo)
// ==========================================

export interface AssentoCliente {
  id_cliente: string;
  nome: string;
  tier_fidelidade: string;
  persona: string;
  clv_previsto: number;
  faixa_pareto: string;
  risco_evasao: number;
  score_atrito_acumulado: number;
}

export interface AssentoVoo {
  assento: string;
  status: "critico" | "vip" | "normal";
  dados_cliente: AssentoCliente;
}

export interface MetadataAeronave {
  modelo: string;
  codigo: string;
  fileiras: number;
  layout: string[];
  total_assentos: number;
}

export interface VooSimuladoResponse {
  metadata_aeronave: MetadataAeronave;
  assentos: AssentoVoo[];
}

export interface SimularBordoPayload {
  id_cliente: string;
  assento: string;
}

export interface SimularBordoResponse {
  assento: string;
  id_cliente: string;
  acao_sugerida: string;
  custo_acao: number;
  retorno_liquido: number;
  instrucao_comissario: string;
  dados_cliente: Record<string, unknown>;
}

export interface ApiErrorResponse {
  detail?: string | Array<{ msg: string; loc?: string[] }>;
  message?: string;
  status?: number;
}

// ==========================================
// Módulo de Autenticação e RBAC
// ==========================================

export type UserRole = "manager" | "commissioner";

export interface UserOut {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  role: UserRole;
  user: UserOut;
}
