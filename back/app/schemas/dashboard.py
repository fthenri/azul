from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class DashboardKPIs(BaseModel):
    """Contrato oficial dos KPIs consolidados do Painel Executivo."""

    model_config = ConfigDict(from_attributes=True)

    valor_protegido: float = Field(..., description="CLV de clientes preservado pelo motor")
    valor_gerado: float = Field(..., description="Receita adicional e compras de auxiliares")
    custo_total: float = Field(..., description="Ações concedidas e vouchers aplicados")
    roi_por_real_gasto: float = Field(..., description="Retorno líquido por R$ 1 investido")


class PersonaData(BaseModel):
    """Contrato para mapa de bolhas das Personas."""

    model_config = ConfigDict(from_attributes=True)

    persona: str = Field(..., description="Nome do cluster/persona de clientes")
    clv_medio: float = Field(..., description="CLV médio previsto para o cluster")
    risco_evasao_medio: float = Field(..., description="Risco médio de churn do cluster (0.0 a 1.0)")
    tamanho_bolha: int = Field(..., description="Quantidade total de clientes no cluster")
    score_influencia: float = Field(default=50.0, description="Poder de influência médio do cluster (0 a 100)")


class ParetoData(BaseModel):
    """Contrato para a curva de concentração de valor (Pareto 80/20)."""

    model_config = ConfigDict(from_attributes=True)

    decil_clientes: str = Field(..., description="Faixa decil (ex: 'Top 10%', 'Top 20%')")
    valor_acumulado: float = Field(..., description="Valor monetário acumulado até o decil (R$)")
    percentual_acumulado: float = Field(..., description="Percentual acumulado do valor total (0.0 a 1.0)")
