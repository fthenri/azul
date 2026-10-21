from __future__ import annotations

import logging
from typing import List

from back.app.core.exceptions import EntityNotFoundError
from back.app.modules.moments.repository import MomentsRepository
from back.app.schemas.moments import Momento

logger = logging.getLogger("azul.moments.service")


class MomentsService:
    """Serviço de aplicação para gestão da fila de momentos de intervenção."""

    def __init__(self, repository: MomentsRepository) -> None:
        self.repository = repository

    def get_moments(self, limit: int = 50) -> List[Momento]:
        """Consulta eventos elegíveis para intervenção na esteira analítica."""
        rows = self.repository.get_eligible_moments(limit=limit)
        return [
            Momento(
                id=str(r["id"]),
                cliente_id=str(r["cliente_id"]),
                tipo_simulacao=str(r["tipo_simulacao"]),
                descricao=str(r["descricao"]),
                persona=str(r["persona"]),
                clv_previsto=float(r["clv_previsto"]),
                risco_evasao_atual=float(r["risco_evasao_atual"]),
            )
            for r in rows
        ]

    def resolve_client_id(self, momento_id: str) -> str:
        """Resolve o ID do cliente ou levanta EntityNotFoundError."""
        cliente_id = self.repository.resolve_client_id(momento_id)
        if not cliente_id:
            raise EntityNotFoundError(f"Momento ou cliente associado a '{momento_id}' não encontrado.")
        return cliente_id
