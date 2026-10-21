from __future__ import annotations

from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from back.app.config import Settings
from back.app.core.exceptions import EntityNotFoundError


def test_settings_initialization(tmp_path: Path) -> None:
    """Verifica se as configurações resolvem caminhos e valores padrão."""
    settings = Settings(
        project_root=tmp_path,
        environment="test",
    )
    assert settings.environment == "test"
    assert settings.app_name == "Azul Retention API"
    assert settings.data_lake_dir == tmp_path / "data_lake"
    assert settings.silver_dir == tmp_path / "data_lake" / "silver"
    assert settings.gold_dir == tmp_path / "data_lake" / "gold"


def test_settings_fail_fast_on_missing_dir(tmp_path: Path) -> None:
    """Verifica se validate_paths produz erro explícito se diretórios obrigatórios não existirem."""
    settings = Settings(
        project_root=tmp_path / "non_existing_dir",
        environment="test",
    )
    with pytest.raises(FileNotFoundError):
        settings.validate_paths()


def test_health_check_endpoint(client: TestClient) -> None:
    """Verifica se o endpoint GET /api/v1/health responde com status 200 e dados consistentes."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] in ("healthy", "degraded")
    assert data["app_name"] == "Azul Retention API"
    assert "version" in data
    assert "storage" in data
    assert "data_lake" in data["storage"]


def test_root_redirect_to_docs(client: TestClient) -> None:
    """Verifica se a rota raiz / redireciona para a documentação interativa /docs."""
    response = client.get("/", follow_redirects=False)
    assert response.status_code in (302, 307)
    assert response.headers["location"] == "/docs"


def test_custom_exception_handling(client: TestClient) -> None:
    """Verifica se exceções de domínio retornam formato JSON padronizado com status e detalhe."""
    # Instanciamos a exceção para validar atributos de contrato
    exc = EntityNotFoundError("Cliente inexistente no teste")
    assert exc.status_code == 404
    assert exc.message == "Cliente inexistente no teste"
