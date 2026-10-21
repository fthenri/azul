from __future__ import annotations

from typing import List
from pydantic import BaseModel, ConfigDict, Field


class SimularPayload(BaseModel):
    """Payload de entrada para o motor de simulação."""

    model_config = ConfigDict(extra="forbid")

    momento_id: str = Field(..., description="ID do momento a ser simulado", min_length=1)


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


class SimularResponse(BaseModel):
    """Resposta consolidada do endpoint de simulação."""

    model_config = ConfigDict(from_attributes=True)

    uplift_status: str = Field(..., description="Status de classificação Uplift (ex: 'Persuadível')")
    ranking_acoes: List[RankingAcao] = Field(..., description="Lista ordenada das ações avaliadas")
    decisao_final: DecisaoFinal = Field(..., description="Detalhes da decisão vencedora e mensagem")
