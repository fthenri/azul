from __future__ import annotations

from fastapi import APIRouter, Depends

from back.app.api.dependencies import get_simulation_service
from back.app.modules.simulation.service import SimulationService
from back.app.schemas.simulation import SimularPayload, SimularResponse

router = APIRouter(prefix="/motor", tags=["Central de Decisões"])


# Estrutura da rota POST para o motor de simulação (Uplift e Agente LLM)
@router.post(
    "/simular",
    response_model=SimularResponse,
    summary="Executar Motor de Simulação",
    description="Aciona o Árbitro Matemático e o Agente LLM para um momento ou cliente específico, calculando Uplift e melhor ação.",
)
async def simular_motor(
    payload: SimularPayload,
    service: SimulationService = Depends(get_simulation_service),
) -> SimularResponse:
    target_id = payload.id_cliente or payload.cliente_id
    return service.simulate(momento_id=payload.momento_id, id_cliente=target_id)
