from __future__ import annotations

import sys
from pathlib import Path
from typing import Generator

import pytest
from fastapi.testclient import TestClient

# Garante que a raiz do projeto esteja no sys.path para imports
project_root = Path(__file__).resolve().parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from back.app.config import Settings, get_settings
from back.app.main import create_app


@pytest.fixture
def test_settings(tmp_path: Path) -> Settings:
    """Configurações isoladas para testes."""
    return Settings(
        environment="test",
        debug=True,
        project_root=project_root,
        data_lake_dir=project_root / "data_lake",
        audit_db_path=tmp_path / "test_audit.db",
        auth_db_path=tmp_path / "test_audit.db",
    )


@pytest.fixture
def client(test_settings: Settings) -> Generator[TestClient, None, None]:
    """Cliente HTTP síncrono para testes de endpoints."""
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: test_settings
    with TestClient(app) as test_client:
        yield test_client
