from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def manager_token(client: TestClient) -> str:
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "gestor@azul.com.br", "password": "azul1234"},
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_get_dashboard_kpis_endpoint(client: TestClient, manager_token: str) -> None:
    """Valida chamada HTTP GET /api/v1/dashboard/kpis com dados reais do Parquet."""
    response = client.get(
        "/api/v1/dashboard/kpis",
        headers={"Authorization": f"Bearer {manager_token}"},
    )
    assert response.status_code == 200
    data = response.json()

    assert "valor_protegido" in data
    assert "valor_gerado" in data
    assert "custo_total" in data
    assert "roi_por_real_gasto" in data

    assert isinstance(data["valor_protegido"], (int, float))
    assert isinstance(data["roi_por_real_gasto"], (int, float))
    assert data["valor_protegido"] > 0
    assert data["custo_total"] > 0


def test_get_dashboard_personas_endpoint(client: TestClient, manager_token: str) -> None:
    """Valida chamada HTTP GET /api/v1/dashboard/personas."""
    response = client.get(
        "/api/v1/dashboard/personas",
        headers={"Authorization": f"Bearer {manager_token}"},
    )
    assert response.status_code == 200
    data = response.json()

    assert isinstance(data, list)
    assert len(data) > 0

    first = data[0]
    assert "persona" in first
    assert "clv_medio" in first
    assert "risco_evasao_medio" in first
    assert "tamanho_bolha" in first
    assert isinstance(first["tamanho_bolha"], int)


def test_get_dashboard_pareto_endpoint(client: TestClient, manager_token: str) -> None:
    """Valida chamada HTTP GET /api/v1/dashboard/pareto."""
    response = client.get(
        "/api/v1/dashboard/pareto",
        headers={"Authorization": f"Bearer {manager_token}"},
    )
    assert response.status_code == 200
    data = response.json()

    assert isinstance(data, list)
    assert len(data) == 10  # 10 decis exatamente

    assert data[0]["decil_clientes"] == "Top 10%"
    assert data[-1]["decil_clientes"] == "100%"
    assert data[-1]["percentual_acumulado"] == 1.0


def test_get_dashboard_pareto_roi_endpoint(client: TestClient, manager_token: str) -> None:
    """Valida chamada HTTP GET /api/v1/dashboard/pareto-roi."""
    response = client.get(
        "/api/v1/dashboard/pareto-roi",
        headers={"Authorization": f"Bearer {manager_token}"},
    )
    assert response.status_code == 200
    data = response.json()

    assert isinstance(data, list)
    assert len(data) > 0

    first = data[0]
    assert "faixa_pareto" in first
    assert "total_clientes" in first
    assert "clv_medio" in first
    assert "risco_evasao_medio" in first
    assert "roi_retencao_multiplicador" in first
    assert first["roi_retencao_multiplicador"] > 0
