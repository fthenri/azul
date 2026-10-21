from __future__ import annotations

from fastapi.testclient import TestClient


def test_get_dashboard_kpis_endpoint(client: TestClient) -> None:
    """Valida chamada HTTP GET /api/v1/dashboard/kpis com dados reais do Parquet."""
    response = client.get("/api/v1/dashboard/kpis")
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


def test_get_dashboard_personas_endpoint(client: TestClient) -> None:
    """Valida chamada HTTP GET /api/v1/dashboard/personas."""
    response = client.get("/api/v1/dashboard/personas")
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


def test_get_dashboard_pareto_endpoint(client: TestClient) -> None:
    """Valida chamada HTTP GET /api/v1/dashboard/pareto."""
    response = client.get("/api/v1/dashboard/pareto")
    assert response.status_code == 200
    data = response.json()

    assert isinstance(data, list)
    assert len(data) == 10  # 10 decis exatamente

    assert data[0]["decil_clientes"] == "Top 10%"
    assert data[-1]["decil_clientes"] == "100%"
    assert data[-1]["percentual_acumulado"] == 1.0
