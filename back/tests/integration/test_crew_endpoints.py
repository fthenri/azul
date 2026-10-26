from __future__ import annotations

import re
from fastapi.testclient import TestClient


def test_get_voo_simulado_endpoint(client: TestClient) -> None:
    """Valida o endpoint GET /api/v1/voo-simulado retornando a aeronave dinâmica e cabine montada."""
    response = client.get("/api/v1/voo-simulado")
    assert response.status_code == 200
    data = response.json()

    assert "metadata_aeronave" in data
    assert "assentos" in data

    meta = data["metadata_aeronave"]
    assert "modelo" in meta
    assert "codigo" in meta
    assert meta["codigo"] in ("A320neo", "E195-E2", "ATR 72-600")
    assert meta["fileiras"] in (29, 34, 18)
    assert meta["layout"] in (["A", "B", "C", "D", "E", "F"], ["A", "B", "C", "D"])
    assert meta["total_assentos"] == meta["fileiras"] * len(meta["layout"])

    seats = data["assentos"]
    assert len(seats) == meta["total_assentos"]

    criticos = 0
    vips = 0

    for item in seats:
        assert "assento" in item
        assert "status" in item
        assert item["status"] in ("critico", "vip", "normal")

        assert "dados_cliente" in item
        cliente = item["dados_cliente"]
        assert "id_cliente" in cliente
        assert "nome" in cliente
        assert len(cliente["nome"]) > 0
        assert "tier_fidelidade" in cliente
        assert "persona" in cliente
        assert "clv_previsto" in cliente
        assert "faixa_pareto" in cliente
        assert "risco_evasao" in cliente
        assert "score_atrito_acumulado" in cliente
        assert "mensagem_llm_batch" in cliente
        if cliente.get("mensagem_llm_batch"):
            assert (
                "[RAG: Azul Fidelidade Res. 400]" in cliente["mensagem_llm_batch"]
                or "[GERADO VIA BATCH]" in cliente["mensagem_llm_batch"]
                or "Instrução" in cliente["mensagem_llm_batch"]
                or "Decisão Analítica" in cliente["mensagem_llm_batch"]
            )

        if item["status"] == "critico":
            criticos += 1
            assert cliente["risco_evasao"] > 0.60
        elif item["status"] == "vip":
            vips += 1
            assert cliente["faixa_pareto"] in ("Top 10% Receita", "Top 20% Receita")

    assert criticos > 0
    assert vips > 0


def test_get_voo_simulado_specific_models(client: TestClient) -> None:
    """Valida a geração explícita de cada modelo da frota Azul."""
    # 1. A320neo (29 fileiras, 3x3)
    resp_a320 = client.get("/api/v1/voo-simulado?modelo=A320neo")
    assert resp_a320.status_code == 200
    data_a320 = resp_a320.json()
    assert data_a320["metadata_aeronave"]["codigo"] == "A320neo"
    assert data_a320["metadata_aeronave"]["fileiras"] == 29
    assert len(data_a320["metadata_aeronave"]["layout"]) == 6
    assert len(data_a320["assentos"]) == 174

    # 2. E195-E2 (34 fileiras, 2x2)
    resp_e195 = client.get("/api/v1/voo-simulado?modelo=E195-E2")
    assert resp_e195.status_code == 200
    data_e195 = resp_e195.json()
    assert data_e195["metadata_aeronave"]["codigo"] == "E195-E2"
    assert data_e195["metadata_aeronave"]["fileiras"] == 34
    assert len(data_e195["metadata_aeronave"]["layout"]) == 4
    assert len(data_e195["assentos"]) == 136

    # 3. ATR 72-600 (18 fileiras, 2x2)
    resp_atr = client.get("/api/v1/voo-simulado?modelo=ATR 72-600")
    assert resp_atr.status_code == 200
    data_atr = resp_atr.json()
    assert data_atr["metadata_aeronave"]["codigo"] == "ATR 72-600"
    assert data_atr["metadata_aeronave"]["fileiras"] == 18
    assert len(data_atr["metadata_aeronave"]["layout"]) == 4
    assert len(data_atr["assentos"]) == 72


def test_get_voo_simulado_via_motor_router(client: TestClient) -> None:
    """Valida alias GET /api/v1/motor/voo-simulado."""
    response = client.get("/api/v1/motor/voo-simulado")
    assert response.status_code == 200
    data = response.json()
    assert "metadata_aeronave" in data
    assert "assentos" in data


def test_post_simular_bordo_success(client: TestClient) -> None:
    """Valida o motor de bordo POST /api/v1/motor/simular-bordo com passageiro do voo."""
    flight_resp = client.get("/api/v1/voo-simulado")
    assert flight_resp.status_code == 200
    data = flight_resp.json()
    seats = data["assentos"]

    target_seat = next(
        (s for s in seats if s["status"] in ("critico", "vip")),
        seats[0],
    )

    payload = {
        "id_cliente": target_seat["dados_cliente"]["id_cliente"],
        "assento": target_seat["assento"],
    }

    response = client.post("/api/v1/motor/simular-bordo", json=payload)
    assert response.status_code == 200
    result = response.json()

    assert result["assento"] == target_seat["assento"]
    assert result["id_cliente"] == target_seat["dados_cliente"]["id_cliente"]
    assert any(
        chave in result["acao_sugerida"] or "Bebida" in result["acao_sugerida"] or "Abordagem" in result["acao_sugerida"] or "Snack" in result["acao_sugerida"]
        for chave in ("ABORDAGEM_CHEFE_CABINE", "BEBIDA_CORTESIA", "SNACK_EXTRA")
    )
    assert result["custo_acao"] in (0.0, 15.0, 5.0, 10.0, 12.0, 50.0)
    assert isinstance(result["retorno_liquido"], (int, float))
    assert isinstance(result["instrucao_comissario"], str)
    assert len(result["instrucao_comissario"]) > 10
    assert "dados_cliente" in result

    # Garante consistência entre a ação arbitrada e o texto da instrução da tripulação
    if "Bebida" in result["acao_sugerida"]:
        assert "bebida" in result["instrucao_comissario"].lower()
    elif "Snack" in result["acao_sugerida"]:
        assert "snack" in result["instrucao_comissario"].lower()
    elif "Abordagem" in result["acao_sugerida"]:
        assert "chefe de cabine" in result["instrucao_comissario"].lower() or "saudação" in result["instrucao_comissario"].lower()

    # Valida que faixa_pareto original não é degradada para Cauda Longa em passageiros VIP
    if target_seat["dados_cliente"]["faixa_pareto"] in ("Top 10% Receita", "Top 20% Receita"):
        assert result["dados_cliente"]["faixa_pareto"] == target_seat["dados_cliente"]["faixa_pareto"]


def test_post_simular_bordo_validation_error(client: TestClient) -> None:
    """Valida rejeição de payload inválido."""
    response = client.post("/api/v1/motor/simular-bordo", json={"id_cliente": ""})
    assert response.status_code == 422
