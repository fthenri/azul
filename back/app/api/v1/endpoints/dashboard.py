from __future__ import annotations

from typing import List
from fastapi import APIRouter

from back.app.api.dependencies import DashboardServiceDep
from back.app.schemas.dashboard import DashboardKPIs, ParetoData, PersonaData

router = APIRouter(prefix="/dashboard", tags=["Dashboard Executivo"])


@router.get(
    "/kpis",
    response_model=DashboardKPIs,
    summary="Obter KPIs Consolidados",
    description="Retorna os indicadores macro-financeiros e executivos do motor de retenção.",
)
async def get_dashboard_kpis(service: DashboardServiceDep) -> DashboardKPIs:
    return service.get_kpis()


@router.get(
    "/personas",
    response_model=List[PersonaData],
    summary="Obter Dados das Personas",
    description="Retorna métricas de CLV médio, risco de evasão e volume por cluster de personas para o mapa de bolhas.",
)
async def get_dashboard_personas(service: DashboardServiceDep) -> List[PersonaData]:
    return service.get_personas()


@router.get(
    "/pareto",
    response_model=List[ParetoData],
    summary="Obter Curva de Concentração (Pareto)",
    description="Retorna os dados da curva de Pareto (80/20) agregados por decil de clientes.",
)
async def get_dashboard_pareto(service: DashboardServiceDep) -> List[ParetoData]:
    return service.get_pareto()
