from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class Momento(BaseModel):
    """Contrato de um momento de atrito/oportunidade na fila de decisões."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Identificador único do momento (ex: 'mom_789')")
    cliente_id: str = Field(..., description="Identificador do cliente no sistema")
    tipo_simulacao: str = Field(..., description="Tipo de simulação: 'Reativa' ou 'Proativa'")
    descricao: str = Field(..., description="Descrição humanizada do evento ou atrito")
    persona: str = Field(..., description="Cluster/Persona do cliente")
    clv_previsto: float = Field(..., description="Valor previsto do ciclo de vida do cliente")
    risco_evasao_atual: float = Field(..., description="Score atual de probabilidade de evasão (0.0 a 1.0)")
