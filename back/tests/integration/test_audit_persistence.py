from __future__ import annotations

from fastapi.testclient import TestClient


def test_get_auditoria_decisoes_and_baseline(client: TestClient) -> None:
    """Valida retorno do histórico de decisões de auditoria."""
    response = client.get("/api/v1/auditoria/decisoes")
    assert response.status_code == 200
    data = response.json()

    assert isinstance(data, list)
    assert len(data) >= 1

    # Verifica se dec_456 está presente
    dec_456 = next((d for d in data if d["decisao_id"] == "dec_456"), None)
    assert dec_456 is not None
    assert dec_456["cliente_id"] == "cli_123"
    assert dec_456["acao_executada"] == "Bloqueada pelo Árbitro"
    assert "versao_modelos" in dec_456
    assert dec_456["versao_modelos"]["clv"] == "v1.2"


def test_get_shap_for_baseline_decision(client: TestClient) -> None:
    """Valida consulta SHAP para dec_456 conforme o contrato documentado."""
    response = client.get("/api/v1/auditoria/decisoes/dec_456/shap")
    assert response.status_code == 200
    data = response.json()

    assert "risco_base" in data
    assert data["risco_base"] == 0.20
    assert "fatores" in data
    assert len(data["fatores"]) == 3

    variaveis = [f["variavel"] for f in data["fatores"]]
    assert "Atraso > 60 min recente" in variaveis


def test_simulation_persists_new_audit_decision(client: TestClient) -> None:
    """Valida se uma nova simulação persiste um registro recuperável com SHAP correspondente."""
    # 1. Executa simulação para mom_789
    sim_res = client.post("/api/v1/motor/simular", json={"momento_id": "mom_789"})
    assert sim_res.status_code == 200

    # 2. Consulta histórico de auditoria
    audit_res = client.get("/api/v1/auditoria/decisoes")
    assert audit_res.status_code == 200
    decisions = audit_res.json()
    assert len(decisions) >= 2

    # A decisão mais recente deve ser a recém-simulada
    latest = decisions[0]
    assert latest["decisao_id"].startswith("dec_")
    assert latest["decisao_id"] != "dec_456"

    # 3. Consulta SHAP da decisão gerada dinamicamente
    shap_res = client.get(f"/api/v1/auditoria/decisoes/{latest['decisao_id']}/shap")
    assert shap_res.status_code == 200
    shap_data = shap_res.json()
    assert "risco_base" in shap_data
    assert "fatores" in shap_data
    assert len(shap_data["fatores"]) > 0


def test_get_shap_nonexistent_decision_returns_404(client: TestClient) -> None:
    """Valida retorno 404 para ID de decisão inexistente."""
    response = client.get("/api/v1/auditoria/decisoes/dec_inexistente_999/shap")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
