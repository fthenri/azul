from __future__ import annotations

from fastapi import APIRouter
from back.app.api.v1.endpoints import health

api_v1_router = APIRouter()

# Registro de sub-rotas
api_v1_router.include_router(health.router)
