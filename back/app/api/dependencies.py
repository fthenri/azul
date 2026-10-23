from __future__ import annotations

from typing import Annotated, Any, List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from back.app.core.security import decode_access_token
from back.app.infrastructure.persistence.user_store import UserStore
from back.app.schemas.auth import UserOut
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


def get_crew_service(
    duckdb_client: DuckDBClient = Depends(get_duckdb),
    settings: Settings = Depends(get_settings),
) -> CrewService:
    from back.app.modules.simulation.crew_service import CrewService
    return CrewService(duckdb_client=duckdb_client, settings=settings)


CrewServiceDep = Annotated[Any, Depends(get_crew_service)]


# ============================================================================
# DEPENDÊNCIAS DE AUTENTICAÇÃO E CONTROLE DE ACESSO RBAC
# ============================================================================

def get_user_store(settings: Settings = Depends(get_settings)) -> UserStore:
    return UserStore(settings=settings)


UserStoreDep = Annotated[UserStore, Depends(get_user_store)]

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    auto_error=False,
)


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    settings: Settings = Depends(get_settings),
    user_store: UserStore = Depends(get_user_store),
) -> UserOut:
    """Extrai e valida o token JWT do cabeçalho Authorization Bearer."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação necessária. Token JWT não fornecido no cabeçalho Authorization.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(
            token=token,
            secret_key=settings.jwt_secret_key,
            algorithm=settings.jwt_algorithm,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token de autenticação inválido ou expirado: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: identificador de usuário ('sub') ausente.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_data = user_store.get_by_id(str(user_id))
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário associado a este token não foi localizado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user_data.get("is_active"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta conta de usuário está desativada no sistema.",
        )

    return UserOut(
        id=str(user_data["id"]),
        name=str(user_data["name"]),
        email=str(user_data["email"]),
        role=str(user_data["role"]),
        is_active=bool(user_data["is_active"]),
    )


CurrentUserDep = Annotated[UserOut, Depends(get_current_user)]


class RoleChecker:
    """Verificador de permissões RBAC para proteção granular de rotas."""

    def __init__(self, allowed_roles: List[str]) -> None:
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: UserOut = Depends(get_current_user)) -> UserOut:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Acesso negado: Perfil '{current_user.role}' não tem permissão para esta rota. "
                    f"Perfis autorizados: {', '.join(self.allowed_roles)}."
                ),
            )
        return current_user


RequireManagerDep = Annotated[UserOut, Depends(RoleChecker(["manager"]))]
RequireCommissionerOrManagerDep = Annotated[UserOut, Depends(RoleChecker(["commissioner", "manager"]))]

