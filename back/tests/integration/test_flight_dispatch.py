from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def manager_headers(client: TestClient) -> dict[str, str]:
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "gestor@azul.com.br", "password": "azul1234"},
    )
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_list_scheduled_flights(client: TestClient, manager_headers: dict[str, str]) -> None:
    """Valida a listagem de voos da malha aérea comercial consolidada no DuckDB."""
    response = client.get("/api/v1/flights", headers=manager_headers)
    assert response.status_code == 200
    data = response.json()

    assert "total_voos" in data
    assert "voos" in data
    assert data["total_voos"] > 0
    assert len(data["voos"]) > 0

    first_flight = data["voos"][0]
    assert "id" in first_flight
    assert "numero_voo" in first_flight
    assert "rota" in first_flight
    assert "origem" in first_flight
    assert "destino" in first_flight
    assert "partida_prevista" in first_flight
    assert "total_passageiros" in first_flight
    assert "total_pnrs" in first_flight
    assert "passageiros_criticos" in first_flight
    assert "passageiros_vip" in first_flight
    assert first_flight["total_passageiros"] > 0


def test_get_flight_details_and_batch_llm(client: TestClient, manager_headers: dict[str, str]) -> None:
    """Valida detalhes do voo, mapa de assentos com PNR e lote de 5 ações pré-geradas pela IA."""
    response = client.get("/api/v1/flights/6002", headers=manager_headers)
    assert response.status_code == 200
    data = response.json()

    assert data["id"] == "6002"
    assert "AD 6002" in data["numero_voo"]
    assert "SBSP" in data["origem"]
    assert "SBFI" in data["destino"]

    # Validação da Aeronave e Assentos
    assert "metadata_aeronave" in data
    assert "assentos" in data
    seats = data["assentos"]
    assert len(seats) > 0

    # Validação de PNR nos assentos
    pnr_found = False
    for seat in seats:
        cliente = seat["dados_cliente"]
        assert "pnr" in cliente
        assert "tamanho_grupo" in cliente
        assert "is_grupo_familiar" in cliente
        if cliente["is_grupo_familiar"]:
            assert cliente["tamanho_grupo"] > 1
            pnr_found = True

    assert pnr_found, "Deveria haver passageiros com is_grupo_familiar=True no voo"

    # Validação do Lote de Ações (Batch)
    assert "lote_acoes" in data
    lote = data["lote_acoes"]
    assert "resumo" in lote
    assert "acoes" in lote
    assert lote["resumo"]["total_acoes"] == 5
    assert len(lote["acoes"]) == 5

    # Validação individual das 5 ações recomendadas
    for acao in lote["acoes"]:
        assert "id_missao" in acao
        assert "assento" in acao
        assert "id_cliente" in acao
        assert "pnr" in acao
        assert "passageiro" in acao
        assert "acao_sugerida" in acao
        assert "custo_acao" in acao
        assert "retorno_liquido" in acao
        assert "instrucao_comissario" in acao
        assert len(acao["instrucao_comissario"]) > 10
        assert acao["tipo"] in ("atrito", "vip")

