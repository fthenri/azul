from __future__ import annotations

import uvicorn

from back.app.main import app, create_app
from back.app.api.v1.endpoints.motor import simular_motor, simular_bordo
from back.app.schemas.simulation import (
    AssentoVoo,
    SimularBordoPayload,
    SimularBordoResponse,
    SimularPayload,
    SimularResponse,
)


# Estrutura da rota POST para o motor de simulação analítica (/api/v1/motor/simular)


__all__ = [
    "app",
    "create_app",
    "simular_motor",
    "simular_bordo",
    "SimularPayload",
    "SimularResponse",
    "SimularBordoPayload",
    "SimularBordoResponse",
    "AssentoVoo",
]


if __name__ == "__main__":
    from back.app.config import get_settings

    cfg = get_settings()
    uvicorn.run("back.main:app", host=cfg.host, port=cfg.port, reload=cfg.debug)

