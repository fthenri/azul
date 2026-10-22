from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from back.app.infrastructure.integrations.decision_executor import DecisionExecutorAdapter
from back.app.modules.audit.repository import AuditRepository
from back.app.modules.moments.service import MomentsService
from back.app.schemas.audit import DecisaoAuditoria, VersaoModelos
from back.app.schemas.simulation import SimularResponse

logger = logging.getLogger("azul.simulation.service")


class SimulationService:
    """Orquestrador do caso de uso de simulação do motor de retenção."""

    def __init__(
        self,
        moments_service: MomentsService,
        executor_adapter: DecisionExecutorAdapter,
        audit_repository: Optional[AuditRepository] = None,
    ) -> None:
        self.moments_service = moments_service
        self.executor_adapter = executor_adapter
        self.audit_repository = audit_repository

    def simulate(
        self,
        momento_id: Optional[str] = None,
        id_cliente: Optional[str] = None,
    ) -> SimularResponse:
        """Resolve o momento, executa a arbitragem de Uplift, gera mensagem LLM e registra auditoria."""
        if id_cliente:
            cliente_id = self.moments_service.resolve_client_id(id_cliente)
            origem_id = id_cliente
        elif momento_id:
            cliente_id = self.moments_service.resolve_client_id(momento_id)
            origem_id = momento_id
        else:
            raise ValueError("ID de cliente ou momento não fornecido.")

        logger.info("Executando simulação para '%s' (Cliente: %s)...", origem_id, cliente_id)
        response = self.executor_adapter.simulate_for_client(id_cliente=cliente_id)

        # Registro persistente de auditoria
        if self.audit_repository is not None:
            decisao_id = f"dec_{uuid.uuid4().hex[:8]}"
            is_bloqueada = "Não Agir" in response.decisao_final.acao_vencedora
            custo_realizado = 0.0
            for acao in response.ranking_acoes:
                if acao.acao == response.decisao_final.acao_vencedora:
                    custo_realizado = acao.custo_acao
                    break

            entry = DecisaoAuditoria(
                decisao_id=decisao_id,
                cliente_id=cliente_id,
                data_decisao=datetime.now(timezone.utc).isoformat(),
                tipo_simulacao="Reativa" if ("mom_" in origem_id) else "Proativa",
                acao_executada=response.decisao_final.acao_vencedora,
                motivo_bloqueio="Trava matemática de Uplift (ROI <= 0)" if is_bloqueada else None,
                custo_realizado=custo_realizado,
                versao_modelos=VersaoModelos(
                    clv="v1.2",
                    churn="v2.0",
                    llm="gpt-4o-mini-rag",
                ),
            )
            try:
                self.audit_repository.save_decision(entry)
                logger.info("Decisão persistida na auditoria com ID %s", decisao_id)
            except Exception as exc:
                logger.error("Erro ao persistir log de auditoria: %s", exc)

        return response
