from __future__ import annotations

from typing import List
from fastapi import APIRouter, Depends
from back.app.api.dependencies import get_crew_service
from back.app.api.v1.endpoints import auditoria, dashboard, health, momentos, motor
from back.app.modules.simulation.crew_service import CrewService
from back.app.schemas.simulation import AssentoVoo

api_v1_router = APIRouter()

# Registro de sub-rotas
api_v1_router.include_router(health.router)
api_v1_router.include_router(dashboard.router)
api_v1_router.include_router(momentos.router)
api_v1_router.include_router(motor.router)
api_v1_router.include_router(auditoria.router)


# Rota do mapa de voo simulado em /api/v1/voo-simulado
@api_v1_router.get(
    "/voo-simulado",
    response_model=List[AssentoVoo],
    summary="Obter Mapa de Assentos do Voo Simulado (Guest Service Tool)",
    tags=["Tripulação e Bordo"],
)
async def get_voo_simulado(
    crew_service: CrewService = Depends(get_crew_service),
) -> List[AssentoVoo]:
    return crew_service.get_simulated_flight()
