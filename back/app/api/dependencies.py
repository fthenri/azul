from __future__ import annotations

from typing import Annotated
from fastapi import Depends
from back.app.config import Settings, get_settings
from back.app.infrastructure.analytics.duckdb_client import DuckDBClient, get_duckdb_client
from back.app.modules.dashboard.repository import DashboardRepository
from back.app.modules.dashboard.service import DashboardService

SettingsDep = Annotated[Settings, Depends(get_settings)]
DuckDBDep = Annotated[DuckDBClient, Depends(get_duckdb_client)]


def get_dashboard_repository(duckdb_client: DuckDBDep) -> DashboardRepository:
    return DashboardRepository(duckdb_client=duckdb_client)


DashboardRepoDep = Annotated[DashboardRepository, Depends(get_dashboard_repository)]


def get_dashboard_service(repository: DashboardRepoDep) -> DashboardService:
    return DashboardService(repository=repository)


DashboardServiceDep = Annotated[DashboardService, Depends(get_dashboard_service)]
