from __future__ import annotations

import logging
from typing import List

from back.app.modules.dashboard.repository import DashboardRepository
from back.app.schemas.dashboard import DashboardKPIs, ParetoData, PersonaData

logger = logging.getLogger("azul.dashboard.service")


class DashboardService:
    """Serviço de aplicação para orquestração das métricas do Dashboard Executivo."""

    def __init__(self, repository: DashboardRepository) -> None:
        self.repository = repository

    def get_kpis(self) -> DashboardKPIs:
        """Calcula os indicadores macro executivos com tratamento de divisão por zero."""
        data = self.repository.get_kpis_aggregation()

        valor_protegido = float(data.get("valor_protegido") or 0.0)
        valor_gerado = float(data.get("valor_gerado") or 0.0)
        custo_total = float(data.get("custo_total") or 0.0)

        # Cálculo de ROI por Real Gasto: (Valor Protegido + Valor Gerado) / Custo Total
        if custo_total > 0.0:
            roi_por_real_gasto = round((valor_protegido + valor_gerado) / custo_total, 2)
        else:
            roi_por_real_gasto = 0.0

        return DashboardKPIs(
            valor_protegido=round(valor_protegido, 2),
            valor_gerado=round(valor_gerado, 2),
            custo_total=round(custo_total, 2),
            roi_por_real_gasto=roi_por_real_gasto,
        )

    def get_personas(self) -> List[PersonaData]:
        """Retorna as métricas e distribuição das Personas."""
        rows = self.repository.get_personas_distribution()
        return [
            PersonaData(
                persona=str(r["persona"]),
                clv_medio=float(r["clv_medio"]),
                risco_evasao_medio=float(r["risco_evasao_medio"]),
                tamanho_bolha=int(r["tamanho_bolha"]),
            )
            for r in rows
        ]

    def get_pareto(self) -> List[ParetoData]:
        """Retorna a curva de Pareto de concentração de valor por decil."""
        rows = self.repository.get_pareto_distribution()
        return [
            ParetoData(
                decil_clientes=str(r["decil_clientes"]),
                valor_acumulado=float(r["valor_acumulado"]),
                percentual_acumulado=float(r["percentual_acumulado"]),
            )
            for r in rows
        ]
