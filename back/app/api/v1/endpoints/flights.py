from __future__ import annotations

import logging
from typing import Any, Dict, Optional
from fastapi import APIRouter, Body, Depends, Query

from back.app.api.dependencies import RequireCommissionerOrManagerDep, get_crew_service
from back.app.modules.simulation.crew_service import CrewService
from back.app.schemas.simulation import ListaVoosResponse, VooDetalheResponse

logger = logging.getLogger("azul.api.flights")

router = APIRouter(prefix="/flights", tags=["Malha Aérea & Despacho"])


@router.get(
    "",
    response_model=ListaVoosResponse,
    summary="Listar Voos Comerciais da Malha Aérea (DuckDB)",
)
async def list_flights(
    limit: int = Query(default=50, ge=1, le=200, description="Quantidade máxima de voos retornados"),
    _user: RequireCommissionerOrManagerDep = None,
    crew_service: CrewService = Depends(get_crew_service),
) -> ListaVoosResponse:
    """Retorna os voos comerciais da malha aérea real com agregações analíticas consolidadas no DuckDB."""
    return crew_service.list_scheduled_flights(limit=limit)


@router.get(
    "/{id}",
    response_model=VooDetalheResponse,
    summary="Obter Detalhes do Voo, Mapa de Assentos e Lote de Recomendações",
)
async def get_flight_by_id(
    id: str,
    modelo: Optional[str] = Query(default=None, description="Modelo de aeronave (opcional: A320neo, E195-E2, ATR 72-600)"),
    _user: RequireCommissionerOrManagerDep = None,
    crew_service: CrewService = Depends(get_crew_service),
) -> VooDetalheResponse:
    """Retorna passageiros reais alocados por PNR e as Top 5 ações recomendadas pré-geradas em lote."""
    return crew_service.get_flight_details(flight_id=id, modelo_aeronave=modelo)


@router.post(
    "/{id}/execute-action",
    summary="Registrar Ação Concluída para Feedback Loop (MLOps)",
    description="Registra a conclusão de uma ação de bordo pela tripulação, alimentando a esteira de retraining e avaliação contra o Holdout Group.",
)
async def execute_flight_action(
    id: str,
    payload: Dict[str, Any] = Body(default={}),
    _user: RequireCommissionerOrManagerDep = None,
    crew_service: CrewService = Depends(get_crew_service),
) -> Dict[str, Any]:
    """Mock do Feedback Loop de MLOps: valida ingestão no Data Lake sem alterar arquivos estáticos."""
    return crew_service.register_action_feedback(flight_id=id, payload=payload)

