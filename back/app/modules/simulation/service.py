from __future__ import annotations

import logging
from back.app.infrastructure.integrations.decision_executor import DecisionExecutorAdapter
from back.app.modules.moments.service import MomentsService
from back.app.schemas.simulation import SimularResponse

logger = logging.getLogger("azul.simulation.service")


class SimulationService:
    """Orquestrador do caso de uso de simulação do motor de retenção."""

    def __init__(
        self,
        moments_service: MomentsService,
        executor_adapter: DecisionExecutorAdapter,
    ) -> None:
        self.moments_service = moments_service
        self.executor_adapter = executor_adapter

    def simulate(self, momento_id: str) -> SimularResponse:
        """Resolve o momento e executa a arbitragem de Uplift e geração LLM."""
        cliente_id = self.moments_service.resolve_client_id(momento_id)
        logger.info("Executando simulação para momento '%s' (Cliente: %s)...", momento_id, cliente_id)
        response = self.executor_adapter.simulate_for_client(id_cliente=cliente_id)
        return response
