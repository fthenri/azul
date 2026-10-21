from __future__ import annotations

from fastapi import APIRouter
from back.app.api.v1.endpoints import auditoria, dashboard, health, momentos, motor

api_v1_router = APIRouter()

# Registro de sub-rotas
api_v1_router.include_router(health.router)
api_v1_router.include_router(dashboard.router)
api_v1_router.include_router(momentos.router)
api_v1_router.include_router(motor.router)
api_v1_router.include_router(auditoria.router)
