from __future__ import annotations

from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing_extensions import Self


class SimularPayload(BaseModel):
    """Payload de entrada para o motor de simulação."""

    model_config = ConfigDict(extra="forbid")

    momento_id: Optional[str] = Field(None, description="ID do momento a ser simulado", min_length=1)
    id_cliente: Optional[str] = Field(None, description="ID do cliente na camada Gold", min_length=1)
    cliente_id: Optional[str] = Field(None, description="Alias para ID do cliente", min_length=1)

    @model_validator(mode="after")
    def check_identifier(self) -> Self:
        if not self.momento_id and not self.id_cliente and not self.cliente_id:
            raise ValueError("É necessário informar momento_id ou id_cliente.")
        return self


class RankingAcao(BaseModel):
    """Classificação individual de uma ação avaliada pelo Árbitro Matemático."""

    model_config = ConfigDict(from_attributes=True)

    acao: str = Field(..., description="Nome da ação de retenção avaliada")
    custo_acao: float = Field(..., description="Custo fixo de concessão da ação (R$)")
    retorno_liquido: float = Field(..., description="Retorno líquido estimado de Uplift (R$)")


class DecisaoFinal(BaseModel):
    """Decisão vencedora e conteúdo contextual gerado com RAG."""

    model_config = ConfigDict(from_attributes=True)

    acao_vencedora: str = Field(..., description="Ação selecionada pelo árbitro ou indicação de bloqueio")
    mensagem_llm: str = Field(..., description="Mensagem personalizada gerada pelo agente RAG-LLM")
    regra_rag_consultada: str = Field(..., description="Regra de fidelidade consultada para embasar a ação")
    notificacao_interna: Optional[str] = Field(None, description="Resumo gerencial interno alertando a equipe")
    mensagem_crm: Optional[str] = Field(None, description="Draft de mensagem CRM humanizada para o cliente")


class SimularResponse(BaseModel):
    """Resposta consolidada do endpoint de simulação."""

    model_config = ConfigDict(from_attributes=True)

    uplift_status: str = Field(..., description="Status de classificação Uplift (ex: 'Persuadível')")
    ranking_acoes: List[RankingAcao] = Field(..., description="Lista ordenada das ações avaliadas")
    decisao_final: DecisaoFinal = Field(..., description="Detalhes da decisão vencedora e mensagem")
    dados_cliente: Optional[dict[str, Any]] = Field(None, description="Dados do perfil do cliente na camada Gold")
    notificacao_interna: Optional[str] = Field(None, description="Resumo gerencial gerado pelo LLM")
    mensagem_crm: Optional[str] = Field(None, description="Mensagem CRM gerada pelo LLM")


class AssentoCliente(BaseModel):
    """Dados resumidos do passageiro alocado no assento."""

    model_config = ConfigDict(from_attributes=True)

    id_cliente: str
    nome: str
    tier_fidelidade: str
    persona: str
    clv_previsto: float
    faixa_pareto: str
    risco_evasao: float
    score_atrito_acumulado: float
    pnr: str = Field(default="", description="Código localizador da reserva PNR")
    tamanho_grupo: int = Field(default=1, description="Quantidade de passageiros vinculados a este PNR")
    is_grupo_familiar: bool = Field(default=False, description="Indica se o passageiro viaja acompanhado no mesmo PNR")
    contexto_narrativo_llm: str = Field(
        default="Sem ocorrências recentes",
        description="Contexto narrativo operacional do passageiro (GST/CRM/WorldTracer/SSR)",
    )


class AssentoVoo(BaseModel):
    """Estrutura do assento no mapa de cabine do voo simulado."""

    model_config = ConfigDict(from_attributes=True)

    assento: str = Field(..., description="Código do assento (ex: '1A', '3B')")
    status: str = Field(..., description="Status de CRM de bordo: 'critico' | 'vip' | 'normal'")
    dados_cliente: AssentoCliente = Field(..., description="Perfil analítico do passageiro")


class MetadataAeronave(BaseModel):
    """Metadados de configuração da aeronave sorteada da frota Azul."""

    model_config = ConfigDict(from_attributes=True)

    modelo: str = Field(..., description="Nome comercial da aeronave (ex: 'Airbus A320neo')")
    codigo: str = Field(..., description="Código do modelo (ex: 'A320neo', 'E195-E2', 'ATR 72-600')")
    fileiras: int = Field(..., description="Número total de fileiras configuradas")
    layout: List[str] = Field(..., description="Estrutura de letras das colunas de assentos")
    total_assentos: int = Field(..., description="Capacidade máxima total de assentos")


class AcaoRecomendadaLote(BaseModel):
    """Ação prescritiva de bordo recomendada no processamento em lote."""

    model_config = ConfigDict(from_attributes=True)

    id_missao: str = Field(..., description="Identificador único da missão")
    assento: str = Field(..., description="Código do assento")
    id_cliente: str = Field(..., description="Identificador do cliente na camada Gold")
    pnr: str = Field(default="", description="Código localizador PNR da reserva")
    passageiro: str = Field(..., description="Nome do passageiro")
    tier: str = Field(..., description="Categoria no programa de fidelidade")
    persona: str = Field(..., description="Persona comportamental")
    tipo: str = Field(..., description="Tipo de intervenção: 'atrito' | 'vip'")
    status_badge: str = Field(..., description="Texto do badge visual")
    gatilho: str = Field(..., description="Gatilho analítico da intervenção")
    acao_sugerida: str = Field(..., description="Ação recomendada pelo árbitro")
    custo_acao: float = Field(..., description="Custo financeiro da ação (R$)")
    retorno_liquido: float = Field(..., description="Retorno líquido projetado (R$)")
    instrucao_comissario: str = Field(..., description="Instrução tática gerada pela IA/RAG")
    valor_em_risco: float = Field(default=0.0, description="CLV ponderado pelo risco de evasão (R$)")
    contexto_narrativo_llm: str = Field(
        default="Sem ocorrências recentes",
        description="Contexto operacional e ocorrências recentes do passageiro (WorldTracer/SSR/SAC)",
    )


class ResumoLote(BaseModel):
    """Resumo macro financeiro do lote de recomendações."""

    model_config = ConfigDict(from_attributes=True)

    total_acoes: int = Field(..., description="Quantidade de ações recomendadas no lote")
    custo_total: float = Field(..., description="Custo consolidado do lote (R$)")
    retorno_liquido_total: float = Field(..., description="Retorno líquido acumulado (R$)")
    roi_projetado: float = Field(..., description="ROI estimado por real investido")


class LoteAcoes(BaseModel):
    """Contêiner do lote de ações táticas para aprovação em massa."""

    model_config = ConfigDict(from_attributes=True)

    resumo: ResumoLote
    acoes: List[AcaoRecomendadaLote]


class VooMalhaResumo(BaseModel):
    """Resumo de voo comercial da malha aérea real."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Identificador do voo (ex: '6002')")
    numero_voo: str = Field(..., description="Número operacional do voo (ex: 'AD 6002')")
    rota: str = Field(..., description="Rota comercial (ex: 'SBSP ➔ SBFI')")
    origem: str = Field(..., description="Aeroporto de origem")
    destino: str = Field(..., description="Aeroporto de destino")
    partida_prevista: str = Field(..., description="Horário de partida previsto")
    partida_real: Optional[str] = Field(None, description="Horário de partida realizado")
    status_operacional: str = Field(..., description="Situação do voo ('REALIZADO', 'CANCELADO', 'ATRASADO')")
    total_passageiros: int = Field(..., description="Quantidade de passageiros no voo")
    total_pnrs: int = Field(..., description="Quantidade de localizadores PNR distintos")
    passageiros_criticos: int = Field(..., description="Total de clientes em risco crítico de evasão")
    passageiros_vip: int = Field(..., description="Total de clientes de alto valor (Top 10%/20% CLV)")
    atraso_medio_minutos: float = Field(..., description="Média de atraso enfrentada em minutos")


class ListaVoosResponse(BaseModel):
    """Resposta com a lista consolidada de voos da malha aérea."""

    model_config = ConfigDict(from_attributes=True)

    total_voos: int
    voos: List[VooMalhaResumo]


class VooDetalheResponse(BaseModel):
    """Detalhes completos do voo com mapa de assentos, agrupamento por PNR e lote de ações."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    numero_voo: str
    rota: str
    origem: str
    destino: str
    partida_prevista: str
    status_operacional: str
    metadata_aeronave: MetadataAeronave
    assentos: List[AssentoVoo]
    lote_acoes: LoteAcoes


class VooSimuladoResponse(BaseModel):
    """Resposta com mapa de cabine, metadados da aeronave e lote opcional."""

    model_config = ConfigDict(from_attributes=True)

    flight_id: Optional[str] = Field(default="6002", description="Identificador do voo")
    metadata_aeronave: MetadataAeronave = Field(..., description="Configuração do modelo de aeronave")
    assentos: List[AssentoVoo] = Field(..., description="Lista de poltronas da cabine com passageiros alocados")
    lote_acoes: Optional[LoteAcoes] = Field(default=None, description="Lote opcional de ações pré-geradas")


class SimularBordoPayload(BaseModel):
    """Payload para acionar o motor de bordo para um assento."""

    model_config = ConfigDict(extra="forbid")

    id_cliente: str = Field(..., description="ID do passageiro na Camada Gold", min_length=1)
    assento: str = Field(..., description="Código do assento no voo (ex: '3B')", min_length=1)


class SimularBordoResponse(BaseModel):
    """Resposta do motor de decisão para a tripulação de cabine."""

    model_config = ConfigDict(from_attributes=True)

    assento: str
    id_cliente: str
    acao_sugerida: str
    custo_acao: float
    retorno_liquido: float
    instrucao_comissario: str
    dados_cliente: dict[str, Any]
