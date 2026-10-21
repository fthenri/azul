from __future__ import annotations

from unittest.mock import MagicMock
import pytest

from back.app.modules.dashboard.repository import DashboardRepository
from back.app.modules.dashboard.service import DashboardService


def test_dashboard_service_kpis_calculation() -> None:
    """Valida o cálculo do ROI e a conversão de tipos no serviço de Dashboard."""
    mock_repo = MagicMock(spec=DashboardRepository)
    mock_repo.get_kpis_aggregation.return_value = {
        "valor_protegido": 1250000.0,
        "valor_gerado": 850000.0,
        "custo_total": 150000.0,
    }

    service = DashboardService(repository=mock_repo)
    kpis = service.get_kpis()

    assert kpis.valor_protegido == 1250000.0
    assert kpis.valor_gerado == 850000.0
    assert kpis.custo_total == 150000.0
    # (1250000 + 850000) / 150000 = 14.0
    assert kpis.roi_por_real_gasto == 14.0


def test_dashboard_service_zero_cost_edge_case() -> None:
    """Verifica proteção contra divisão por zero quando o custo total for zero."""
    mock_repo = MagicMock(spec=DashboardRepository)
    mock_repo.get_kpis_aggregation.return_value = {
        "valor_protegido": 50000.0,
        "valor_gerado": 10000.0,
        "custo_total": 0.0,
    }

    service = DashboardService(repository=mock_repo)
    kpis = service.get_kpis()

    assert kpis.custo_total == 0.0
    assert kpis.roi_por_real_gasto == 0.0


def test_dashboard_service_personas_and_pareto() -> None:
    """Verifica mapeamento de Personas e Pareto pelo serviço."""
    mock_repo = MagicMock(spec=DashboardRepository)
    mock_repo.get_personas_distribution.return_value = [
        {"persona": "Executivo Frequente", "clv_medio": 8500.0, "risco_evasao_medio": 0.45, "tamanho_bolha": 1200}
    ]
    mock_repo.get_pareto_distribution.return_value = [
        {"decil_clientes": "Top 10%", "valor_acumulado": 5500000.0, "percentual_acumulado": 0.65}
    ]

    service = DashboardService(repository=mock_repo)
    personas = service.get_personas()
    pareto = service.get_pareto()

    assert len(personas) == 1
    assert personas[0].persona == "Executivo Frequente"
    assert len(pareto) == 1
    assert pareto[0].decil_clientes == "Top 10%"
