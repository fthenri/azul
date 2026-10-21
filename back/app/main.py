from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from back.app.api.v1.router import api_v1_router
from back.app.config import get_settings
from back.app.core.exceptions import register_exception_handlers
from back.app.core.logging import setup_logging
from back.app.infrastructure.analytics.duckdb_client import get_duckdb_client

logger = logging.getLogger("azul.main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Gerencia a inicialização e encerramento seguro de recursos da API."""
    settings = get_settings()
    setup_logging(settings.log_level)
    logger.info("Iniciando %s (v%s) no ambiente [%s]...", settings.app_name, settings.app_version, settings.environment)

    # Verificação de integridade no startup (Fail-Fast se dados críticos estiverem ausentes em prod)
    try:
        settings.validate_paths()
        logger.info("Caminhos de dados validados com sucesso: Data Lake em %s", settings.data_lake_dir)
        # Inicializa cliente DuckDB e registra catálogo de Parquets
        duckdb_client = get_duckdb_client(settings)
        logger.info("Motor analítico DuckDB pronto.")
    except Exception as exc:
        logger.error("Aviso de integridade nos caminhos de dados: %s", exc)
        if settings.environment == "prod":
            raise

    yield

    # Cleanup de recursos
    try:
        get_duckdb_client(settings).close()
    except Exception:
        pass
    logger.info("Encerrando %s com segurança...", settings.app_name)


def create_app() -> FastAPI:
    """Cria e configura a instância principal do FastAPI."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="API RESTful de Retenção de Alto Valor e Decisão de Clientes — Azul Fidelidade",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # Configuração de CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Handlers globais de exceções
    register_exception_handlers(app)

    # Registro de rotas versionadas
    app.include_router(api_v1_router, prefix=settings.api_prefix)

    @app.get("/", include_in_schema=False)
    async def root_redirect() -> RedirectResponse:
        return RedirectResponse(url="/docs")

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    cfg = get_settings()
    uvicorn.run("back.app.main:app", host=cfg.host, port=cfg.port, reload=cfg.debug)
