from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class VersaoModelos(BaseModel):
    """Metadados de versões dos modelos utilizados na decisão."""

    model_config = ConfigDict(from_attributes=True)

    clv: str = Field(..., description="Versão do modelo de CLV")
    churn: str = Field(..., description="Versão do modelo de Churn/Evasão")
    llm: str = Field(..., description="Identificador do modelo LLM / Prompt RAG")


class DecisaoAuditoria(BaseModel):
    """Registro histórico de decisão de intervenção."""

    model_config = ConfigDict(from_attributes=True)

    decisao_id: str = Field(..., description="Identificador único da decisão persistida")
    cliente_id: str = Field(..., description="Identificador do cliente alvo")
    data_decisao: str = Field(..., description="Timestamp ISO 8601 da decisão")
    tipo_simulacao: str = Field(..., description="Tipo de simulação ('Reativa' ou 'Proativa')")
    acao_executada: str = Field(..., description="Ação executada ou indicação de bloqueio")
    motivo_bloqueio: Optional[str] = Field(default=None, description="Motivo de bloqueio pelo árbitro, se houver")
    custo_realizado: float = Field(..., description="Custo real investido na ação (R$)")
    versao_modelos: VersaoModelos = Field(..., description="Versões dos modelos no momento da execução")


class FatorShap(BaseModel):
    """Fator explicativo individual de impacto no risco de evasão."""

    model_config = ConfigDict(from_attributes=True)

    variavel: str = Field(..., description="Nome da variável explicativa")
    impacto: float = Field(..., description="Valor numérico de impacto marginal no score")
    direcao: Literal["positivo", "negativo"] = Field(..., description="Direção do impacto ('positivo' ou 'negativo')")


class ShapResponse(BaseModel):
    """Resposta com risco base e fatores explicativos para gráfico SHAP."""

    model_config = ConfigDict(from_attributes=True)

    risco_base: float = Field(..., description="Probabilidade base de evasão da população")
    fatores: List[FatorShap] = Field(..., description="Lista dos fatores que influenciaram a predição")
