from __future__ import annotations

import pytest
from datetime import timedelta
from fastapi.testclient import TestClient

from back.app.config import Settings
from back.app.core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)
from back.app.infrastructure.persistence.user_store import UserStore


def test_password_hash_and_verification():
    raw_pass = "azul1234"
    hashed = get_password_hash(raw_pass)
    assert hashed != raw_pass
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("wrongpassword", hashed) is False


def test_jwt_create_and_decode(test_settings: Settings):
    payload = {
        "sub": "usr_test_123",
        "email": "test@azul.com.br",
        "role": "manager",
    }
    token = create_access_token(
        data=payload,
        secret_key=test_settings.jwt_secret_key,
        algorithm=test_settings.jwt_algorithm,
        expires_delta=timedelta(minutes=15),
    )
    assert isinstance(token, str)
    assert len(token.split(".")) == 3

    decoded = decode_access_token(
        token=token,
        secret_key=test_settings.jwt_secret_key,
        algorithm=test_settings.jwt_algorithm,
    )
    assert decoded["sub"] == "usr_test_123"
    assert decoded["email"] == "test@azul.com.br"
    assert decoded["role"] == "manager"


def test_jwt_expired(test_settings: Settings):
    payload = {"sub": "usr_expired", "role": "manager"}
    # Token expirado há 10 segundos
    token = create_access_token(
        data=payload,
        secret_key=test_settings.jwt_secret_key,
        algorithm=test_settings.jwt_algorithm,
        expires_delta=timedelta(seconds=-10),
    )
    with pytest.raises(ValueError, match="expirado"):
        decode_access_token(
            token=token,
            secret_key=test_settings.jwt_secret_key,
            algorithm=test_settings.jwt_algorithm,
        )


def test_user_store_seed_and_lookup(test_settings: Settings):
    store = UserStore(settings=test_settings)
    manager = store.get_by_email("gestor@azul.com.br")
    assert manager is not None
    assert manager["role"] == "manager"
    assert verify_password("azul1234", manager["hashed_password"]) is True

    commissioner = store.get_by_email("comissario@azul.com.br")
    assert commissioner is not None
    assert commissioner["role"] == "commissioner"

    assert store.get_by_email("inexistente@azul.com.br") is None


def test_login_success_manager(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "gestor@azul.com.br", "password": "azul1234"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "manager"
    assert data["user"]["email"] == "gestor@azul.com.br"


def test_login_success_commissioner(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "comissario@azul.com.br", "password": "azul1234"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "commissioner"
    assert data["user"]["email"] == "comissario@azul.com.br"


def test_login_invalid_password(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "gestor@azul.com.br", "password": "senhaerrada"},
    )
    assert response.status_code == 401
    assert "Credenciais inválidas" in response.json()["detail"]


def test_login_unknown_user(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "estranho@azul.com.br", "password": "azul1234"},
    )
    assert response.status_code == 401


def test_auth_me_endpoint(client: TestClient):
    # 1. Login como gestor
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "gestor@azul.com.br", "password": "azul1234"},
    )
    token = login_resp.json()["access_token"]

    # 2. Chamada autenticada para /auth/me
    me_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == "gestor@azul.com.br"
    assert me_data["role"] == "manager"

    # 3. Chamada não autenticada para /auth/me
    unauth_resp = client.get("/api/v1/auth/me")
    assert unauth_resp.status_code == 401

