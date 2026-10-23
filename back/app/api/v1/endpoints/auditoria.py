from __future__ import annotations

from typing import List
from fastapi import APIRouter, Depends, Query

from back.app.api.dependencies import AuditServiceDep, RoleChecker
from back.app.schemas.audit import DecisaoAuditoria, ShapResponse

router = APIRouter(
    prefix="/auditoria",
    tags=["Auditoria e Explicabilidade"],
    dependencies=[Depends(RoleChecker(["manager"]))],
)


@router.get(
    "/decisoes",
    response_model=List[DecisaoAuditoria],
    summary="Listar Histórico de Decisões",
    description="Retorna a tabela de auditoria completa de intervenções, incluindo bloqueios e decisões de não agir.",
)
async def list_auditoria_decisoes(
    service: AuditServiceDep,
    limit: int = Query(default=100, ge=1, le=500, description="Limite de registros retornados"),
    offset: int = Query(default=0, ge=0, description="Offset de paginação"),
) -> List[DecisaoAuditoria]:
    return service.list_decisions(limit=limit, offset=offset)


@router.get(
    "/decisoes/{decisao_id}/shap",
    response_model=ShapResponse,
    summary="Obter Explicabilidade SHAP",
    description="Retorna os pesos dos fatores de risco de evasão de uma decisão específica para plotagem gráfica.",
)
async def get_decisao_shap(
    decisao_id: str,
    service: AuditServiceDep,
) -> ShapResponse:
    return service.get_shap_explanation(decisao_id=decisao_id)
