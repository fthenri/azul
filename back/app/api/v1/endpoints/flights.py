from __future__ import annotations

import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query

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

