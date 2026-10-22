from __future__ import annotations

from fastapi.testclient import TestClient


def test_get_momentos_endpoint(client: TestClient) -> None:
    """Valida retorno da fila de momentos elegíveis."""
    response = client.get("/api/v1/momentos")
    assert response.status_code == 200
    data = response.json()

    assert isinstance(data, list)
    assert len(data) > 0

    first = data[0]
    assert "id" in first
    assert "cliente_id" in first
    assert "tipo_simulacao" in first
    assert first["tipo_simulacao"] in ("Reativa", "Proativa")
    assert "descricao" in first
    assert "persona" in first
    assert "clv_previsto" in first
    assert "risco_evasao_atual" in first


def test_post_motor_simular_with_real_moment(client: TestClient) -> None:
    """Valida execução da simulação para um momento real obtido da fila."""
    # 1. Obtém o primeiro momento disponível
    resp_momentos = client.get("/api/v1/momentos")
    assert resp_momentos.status_code == 200
    momentos = resp_momentos.json()
    assert len(momentos) > 0

    target_momento_id = momentos[0]["id"]

    # 2. Executa a simulação para o momento
    payload = {"momento_id": target_momento_id}
    resp_sim = client.post("/api/v1/motor/simular", json=payload)
    assert resp_sim.status_code == 200
    sim_data = resp_sim.json()

    assert "uplift_status" in sim_data
    assert sim_data["uplift_status"] in ("Persuadível", "Não Persuadível")
    assert "ranking_acoes" in sim_data
    assert len(sim_data["ranking_acoes"]) > 0

    assert "decisao_final" in sim_data
    final = sim_data["decisao_final"]
    assert "acao_vencedora" in final
    assert "mensagem_llm" in final
    assert "regra_rag_consultada" in final
    assert len(final["mensagem_llm"]) > 0


def test_post_motor_simular_demo_fallback(client: TestClient) -> None:
    """Valida execução para IDs de demonstração como mom_789."""
    payload = {"momento_id": "mom_789"}
    response = client.post("/api/v1/motor/simular", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "decisao_final" in data
    assert "uplift_status" in data


def test_post_motor_simular_with_id_cliente(client: TestClient) -> None:
    """Valida execução da simulação utilizando id_cliente diretamente no payload."""
    payload = {"id_cliente": "cli_123"}
    response = client.post("/api/v1/motor/simular", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["uplift_status"] in ("Persuadível", "Não Persuadível")
    assert len(data["ranking_acoes"]) > 0
    assert "decisao_final" in data
    assert "acao_vencedora" in data["decisao_final"]
    assert "notificacao_interna" in data["decisao_final"]
    assert "mensagem_crm" in data["decisao_final"]

    assert "dados_cliente" in data
    assert data["dados_cliente"]["id_cliente"] is not None
    assert "clv_previsto" in data["dados_cliente"]
    assert "risco_evasao" in data["dados_cliente"]
    assert "persona" in data["dados_cliente"]
    assert "tier_fidelidade" in data["dados_cliente"]

    assert "notificacao_interna" in data
    assert "mensagem_crm" in data
    assert len(data["notificacao_interna"]) > 0
    assert len(data["mensagem_crm"]) > 0


def test_post_motor_simular_invalid_moment(client: TestClient) -> None:
    """Valida erro 404 quando momento for inexistente."""
    payload = {"momento_id": "mom_inexistente_999999"}
    response = client.post("/api/v1/motor/simular", json=payload)
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
