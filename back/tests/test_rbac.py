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


@pytest.fixture
def commissioner_token(client: TestClient) -> str:
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "comissario@azul.com.br", "password": "azul1234"},
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_dashboard_kpis_rbac(client: TestClient, manager_token: str, commissioner_token: str):
    # 1. Sem autenticação -> 401
    resp_unauth = client.get("/api/v1/dashboard/kpis")
    assert resp_unauth.status_code == 401

    # 2. Comissário tentando acessar Dashboard Executivo -> 403 Forbidden
    resp_comm = client.get(
        "/api/v1/dashboard/kpis",
        headers={"Authorization": f"Bearer {commissioner_token}"},
    )
    assert resp_comm.status_code == 403
    assert "Acesso negado" in resp_comm.json()["detail"]

    # 3. Gestor autorizado -> 200 OK (ou erro de dados se Parquet não existir no mock temporário, mas autorização passa)
    resp_mgr = client.get(
        "/api/v1/dashboard/kpis",
        headers={"Authorization": f"Bearer {manager_token}"},
    )
    assert resp_mgr.status_code in (200, 500)
    assert resp_mgr.status_code != 403
    assert resp_mgr.status_code != 401


def test_auditoria_decisoes_rbac(client: TestClient, manager_token: str, commissioner_token: str):
    # Comissário não pode auditar decisões
    resp_comm = client.get(
        "/api/v1/auditoria/decisoes",
        headers={"Authorization": f"Bearer {commissioner_token}"},
    )
    assert resp_comm.status_code == 403

    # Gestor pode acessar auditoria
    resp_mgr = client.get(
        "/api/v1/auditoria/decisoes",
        headers={"Authorization": f"Bearer {manager_token}"},
    )
    assert resp_mgr.status_code == 200


def test_momentos_rbac(client: TestClient, manager_token: str, commissioner_token: str):
    # Comissário não acessa fila analítica de momentos
    resp_comm = client.get(
        "/api/v1/momentos",
        headers={"Authorization": f"Bearer {commissioner_token}"},
    )
    assert resp_comm.status_code == 403

    # Gestor pode acessar momentos
    resp_mgr = client.get(
        "/api/v1/momentos",
        headers={"Authorization": f"Bearer {manager_token}"},
    )
    assert resp_mgr.status_code in (200, 500)
    assert resp_mgr.status_code not in (401, 403)


def test_motor_simular_rbac(client: TestClient, manager_token: str, commissioner_token: str):
    payload = {"id_cliente": "cli_test_123"}

    # Comissário não pode disparar simulação estratégica de marketing/CRM
    resp_comm = client.post(
        "/api/v1/motor/simular",
        json=payload,
        headers={"Authorization": f"Bearer {commissioner_token}"},
    )
    assert resp_comm.status_code == 403

    # Gestor pode disparar
    resp_mgr = client.post(
        "/api/v1/motor/simular",
        json=payload,
        headers={"Authorization": f"Bearer {manager_token}"},
    )
    # Status code não deve ser 401 ou 403 (autorização concedida)
    assert resp_mgr.status_code not in (401, 403)

