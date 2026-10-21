from __future__ import annotations

from typing import Annotated
from fastapi import Depends
from back.app.config import Settings, get_settings
from back.app.infrastructure.analytics.duckdb_client import DuckDBClient, get_duckdb_client
from back.app.infrastructure.integrations.decision_executor import DecisionExecutorAdapter
from back.app.infrastructure.persistence.audit_store import AuditStore
from back.app.modules.audit.repository import AuditRepository
from back.app.modules.audit.service import AuditService
from back.app.modules.dashboard.repository import DashboardRepository
from back.app.modules.dashboard.service import DashboardService
from back.app.modules.moments.repository import MomentsRepository
from back.app.modules.moments.service import MomentsService
from back.app.modules.simulation.service import SimulationService

SettingsDep = Annotated[Settings, Depends(get_settings)]
def get_duckdb() -> DuckDBClient:
    return get_duckdb_client()


DuckDBDep = Annotated[DuckDBClient, Depends(get_duckdb)]


def get_dashboard_repository(duckdb_client: DuckDBClient = Depends(get_duckdb)) -> DashboardRepository:
    return DashboardRepository(duckdb_client=duckdb_client)


DashboardRepoDep = Annotated[DashboardRepository, Depends(get_dashboard_repository)]


def get_dashboard_service(repository: DashboardRepository = Depends(get_dashboard_repository)) -> DashboardService:
    return DashboardService(repository=repository)


DashboardServiceDep = Annotated[DashboardService, Depends(get_dashboard_service)]


def get_moments_repository(duckdb_client: DuckDBClient = Depends(get_duckdb)) -> MomentsRepository:
    return MomentsRepository(duckdb_client=duckdb_client)


MomentsRepoDep = Annotated[MomentsRepository, Depends(get_moments_repository)]


def get_moments_service(repository: MomentsRepository = Depends(get_moments_repository)) -> MomentsService:
    return MomentsService(repository=repository)


MomentsServiceDep = Annotated[MomentsService, Depends(get_moments_service)]


def get_executor_adapter(settings: Settings = Depends(get_settings)) -> DecisionExecutorAdapter:
    return DecisionExecutorAdapter(settings=settings)


ExecutorAdapterDep = Annotated[DecisionExecutorAdapter, Depends(get_executor_adapter)]


def get_audit_store(settings: Settings = Depends(get_settings)) -> AuditStore:
    return AuditStore(settings=settings)


AuditStoreDep = Annotated[AuditStore, Depends(get_audit_store)]


def get_audit_repository(
    audit_store: AuditStore = Depends(get_audit_store),
    duckdb_client: DuckDBClient = Depends(get_duckdb),
) -> AuditRepository:
    return AuditRepository(audit_store=audit_store, duckdb_client=duckdb_client)


AuditRepoDep = Annotated[AuditRepository, Depends(get_audit_repository)]


def get_audit_service(repository: AuditRepository = Depends(get_audit_repository)) -> AuditService:
    return AuditService(repository=repository)


AuditServiceDep = Annotated[AuditService, Depends(get_audit_service)]


def get_simulation_service(
    moments_service: MomentsService = Depends(get_moments_service),
    executor_adapter: DecisionExecutorAdapter = Depends(get_executor_adapter),
    audit_repository: AuditRepository = Depends(get_audit_repository),
) -> SimulationService:
    return SimulationService(
        moments_service=moments_service,
        executor_adapter=executor_adapter,
        audit_repository=audit_repository,
    )


SimulationServiceDep = Annotated[SimulationService, Depends(get_simulation_service)]
