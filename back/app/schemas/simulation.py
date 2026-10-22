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
