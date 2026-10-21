from __future__ import annotations

import logging
from typing import List

from back.app.modules.audit.repository import AuditRepository
from back.app.schemas.audit import DecisaoAuditoria, ShapResponse

logger = logging.getLogger("azul.audit.service")


class AuditService:
    """Serviço de aplicação para governança, auditoria e explicabilidade de decisões."""

    def __init__(self, repository: AuditRepository) -> None:
        self.repository = repository

    def list_decisions(self, limit: int = 100, offset: int = 0) -> List[DecisaoAuditoria]:
        """Recupera a listagem de auditoria do histórico de decisões."""
        return self.repository.list_decisions(limit=limit, offset=offset)

    def get_shap_explanation(self, decisao_id: str) -> ShapResponse:
        """Obtém os pesos dos fatores que elevaram o limite de dor/risco de uma decisão."""
        return self.repository.get_shap_explanation(decisao_id=decisao_id)
