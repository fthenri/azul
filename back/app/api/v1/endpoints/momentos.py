from __future__ import annotations

from typing import List
from fastapi import APIRouter

from back.app.api.dependencies import MomentsServiceDep
from back.app.schemas.moments import Momento

router = APIRouter(tags=["Central de Decisões"])


@router.get(
    "/momentos",
    response_model=List[Momento],
    summary="Listar Fila de Momentos",
    description="Retorna a lista de eventos e atritos detectados prontos para simulação no motor.",
)
async def get_momentos(service: MomentsServiceDep) -> List[Momento]:
    return service.get_moments()
