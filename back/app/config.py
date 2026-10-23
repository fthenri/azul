from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def get_default_project_root() -> Path:
    """Resolve a raiz do repositório de forma determinística."""
    # back/app/config.py -> parent.parent.parent = azul/
    return Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """Configurações centralizadas do Backend com validação Pydantic."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Azul Retention API"
    app_version: str = "1.0.0"
    environment: str = Field(default="dev", description="Ambiente: dev, test, prod")
    debug: bool = Field(default=False)
    log_level: str = Field(default="INFO")

    host: str = "0.0.0.0"
    port: int = 8000
    api_prefix: str = "/api/v1"

    # Raiz e caminhos de dados
    project_root: Path = Field(default_factory=get_default_project_root)
    data_lake_dir: Path | None = None
    silver_dir: Path | None = None
    gold_dir: Path | None = None
    audit_db_path: Path | None = None
    auth_db_path: Path | None = None
    jwt_secret_key: str = Field(
        default="azul-retention-secret-key-change-in-production-2026",
        description="Chave secreta para assinatura de tokens JWT",
    )
    jwt_algorithm: str = Field(default="HS256", description="Algoritmo de assinatura JWT")
    access_token_expire_minutes: int = Field(
        default=480,
        description="Tempo de expiração do access token em minutos (8 horas)",
    )
    rag_rules_path: Path | None = None

    # Configurações de CORS
    cors_origins: List[str] = ["*"]
    cors_origin_regex: str | None = None

    def model_post_init(self, __context: object) -> None:
        """Resolve caminhos relativos para absolutos caso não informados."""
        if self.data_lake_dir is None:
            self.data_lake_dir = self.project_root / "data_lake"
        if self.silver_dir is None:
            self.silver_dir = self.data_lake_dir / "silver"
        if self.gold_dir is None:
            self.gold_dir = self.data_lake_dir / "gold"
        if self.audit_db_path is None:
            self.audit_db_path = self.project_root / "back" / "audit.db"
        if self.auth_db_path is None:
            self.auth_db_path = self.project_root / "back" / "audit.db"
        if self.rag_rules_path is None:
            self.rag_rules_path = self.project_root / "regras_azul_fidelidade.md"

    def validate_paths(self) -> None:
        """Validação Fail-Fast dos diretórios e arquivos críticos."""
        data_lake = self.data_lake_dir
        if data_lake is None or not data_lake.exists():
            raise FileNotFoundError(f"Diretório Data Lake não encontrado: {data_lake}")
        silver = self.silver_dir
        if silver is None or not silver.exists():
            raise FileNotFoundError(f"Diretório Silver não encontrado: {silver}")
        gold = self.gold_dir
        if gold is None or not gold.exists():
            raise FileNotFoundError(f"Diretório Gold não encontrado: {gold}")


@lru_cache
def get_settings() -> Settings:
    """Retorna a instância singleton de configurações."""
    return Settings()
