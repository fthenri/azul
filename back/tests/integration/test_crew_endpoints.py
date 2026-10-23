from __future__ import annotations

import re
from fastapi.testclient import TestClient


def test_get_voo_simulado_endpoint(client: TestClient) -> None:
    """Valida o endpoint GET /api/v1/voo-simulado retornando a cabine montada."""
    response = client.get("/api/v1/voo-simulado")
    assert response.status_code == 200
    seats = response.json()

    assert isinstance(seats, list)
    assert 60 <= len(seats) <= 90
    assert len(seats) == 90  # 15 fileiras x 6 assentos (A-F)

    seat_pattern = re.compile(r"^(?:[1-9]|1[0-5])[A-F]$")

    criticos = 0
    vips = 0

    for item in seats:
        assert "assento" in item
        assert seat_pattern.match(item["assento"])
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

        # Validação das regras de status estipuladas no edital
        if item["status"] == "critico":
            criticos += 1
            assert cliente["risco_evasao"] > 0.60
        elif item["status"] == "vip":
            vips += 1
            assert cliente["faixa_pareto"] in ("Top 10% Receita", "Top 20% Receita")

    # A amostragem estratificada garante que há passageiros críticos e VIPs a bordo
    assert criticos > 0
    assert vips > 0


def test_get_voo_simulado_via_motor_router(client: TestClient) -> None:
    """Valida alias GET /api/v1/motor/voo-simulado."""
    response = client.get("/api/v1/motor/voo-simulado")
    assert response.status_code == 200
    assert len(response.json()) == 90


def test_post_simular_bordo_success(client: TestClient) -> None:
    """Valida o motor de bordo POST /api/v1/motor/simular-bordo com passageiro do voo."""
    # 1. Busca assento do voo simulado
    flight_resp = client.get("/api/v1/voo-simulado")
    assert flight_resp.status_code == 200
    seats = flight_resp.json()

    # Seleciona um assento crítico ou VIP
    target_seat = next(
        (s for s in seats if s["status"] in ("critico", "vip")),
        seats[0],
    )

    payload = {
        "id_cliente": target_seat["dados_cliente"]["id_cliente"],
        "assento": target_seat["assento"],
    }

    # 2. Executa a decisão de bordo
    response = client.post("/api/v1/motor/simular-bordo", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["assento"] == target_seat["assento"]
    assert data["id_cliente"] == target_seat["dados_cliente"]["id_cliente"]
    assert any(
        chave in data["acao_sugerida"] or "Bebida" in data["acao_sugerida"] or "Abordagem" in data["acao_sugerida"] or "Snack" in data["acao_sugerida"]
        for chave in ("ABORDAGEM_CHEFE_CABINE", "BEBIDA_CORTESIA", "SNACK_EXTRA")
    )
    assert data["custo_acao"] in (0.0, 15.0, 5.0)
    assert isinstance(data["retorno_liquido"], (int, float))
    assert isinstance(data["instrucao_comissario"], str)
    assert len(data["instrucao_comissario"]) > 10
    assert "dados_cliente" in data


def test_post_simular_bordo_validation_error(client: TestClient) -> None:
    """Valida rejeição de payload inválido."""
    response = client.post("/api/v1/motor/simular-bordo", json={"id_cliente": ""})
    assert response.status_code == 422
