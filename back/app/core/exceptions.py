from __future__ import annotations

import logging
from typing import Any
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

logger = logging.getLogger("azul.core.exceptions")


class AzulBaseException(Exception):
    """Exceção base para erros de negócio do Azul Backend."""

    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class EntityNotFoundError(AzulBaseException):
    """Entidade não encontrada no Data Lake ou base de auditoria."""

    def __init__(self, message: str = "Entidade não encontrada") -> None:
        super().__init__(message=message, status_code=status.HTTP_404_NOT_FOUND)


class DataLakeError(AzulBaseException):
    """Erro de leitura ou inconsistência nos arquivos Parquet."""

    def __init__(self, message: str = "Erro ao acessar o Data Lake") -> None:
        super().__init__(message=message, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SimulationExecutionError(AzulBaseException):
    """Falha durante a execução matemática ou geração RAG de uma decisão."""

    def __init__(self, message: str = "Erro ao executar simulação") -> None:
        super().__init__(message=message, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)


def register_exception_handlers(app: FastAPI) -> None:
    """Registra manipuladores globais para exceções customizadas."""

    @app.exception_handler(AzulBaseException)
    async def azul_exception_handler(_: Request, exc: AzulBaseException) -> JSONResponse:
        logger.warning("Exceção tratada da aplicação: %s (Status: %d)", exc.message, exc.status_code)
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": exc.message,
                "message": exc.message,
                "status": exc.status_code,
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("Exceção não tratada capturada pelo handler global: %s", str(exc))
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "Erro interno no servidor da aplicação",
                "message": str(exc),
                "status": 500,
            },
        )
