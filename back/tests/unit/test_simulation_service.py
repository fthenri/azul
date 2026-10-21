from __future__ import annotations

from unittest.mock import MagicMock
import pytest

from back.app.core.exceptions import EntityNotFoundError
from back.app.infrastructure.integrations.decision_executor import DecisionExecutorAdapter
from back.app.modules.moments.service import MomentsService
from back.app.modules.simulation.service import SimulationService
from back.app.schemas.simulation import DecisaoFinal, RankingAcao, SimularResponse


def test_simulation_service_orchestration() -> None:
    """Valida o fluxo de orquestração do serviço de simulação."""
    mock_moments = MagicMock(spec=MomentsService)
    mock_moments.resolve_client_id.return_value = "cli_123"

    mock_executor = MagicMock(spec=DecisionExecutorAdapter)
    mock_executor.simulate_for_client.return_value = SimularResponse(
        uplift_status="Persuadível",
        ranking_acoes=[
            RankingAcao(acao="Upgrade de Cabine", custo_acao=1500.0, retorno_liquido=2500.0)
        ],
        decisao_final=DecisaoFinal(
            acao_vencedora="Upgrade de Cabine",
            mensagem_llm="Mensagem gerada",
            regra_rag_consultada="Regra teste",
        ),
    )

    service = SimulationService(
        moments_service=mock_moments,
        executor_adapter=mock_executor,
    )

    result = service.simulate("mom_test_1")
    assert result.uplift_status == "Persuadível"
    assert result.decisao_final.acao_vencedora == "Upgrade de Cabine"
    mock_moments.resolve_client_id.assert_called_once_with("mom_test_1")
    mock_executor.simulate_for_client.assert_called_once_with(id_cliente="cli_123")


def test_simulation_service_unresolved_moment() -> None:
    """Valida tratamento quando o momento não puder ser resolvido."""
    mock_moments = MagicMock(spec=MomentsService)
    mock_moments.resolve_client_id.side_effect = EntityNotFoundError("Momento inexistente")

    mock_executor = MagicMock(spec=DecisionExecutorAdapter)
    service = SimulationService(
        moments_service=mock_moments,
        executor_adapter=mock_executor,
    )

    with pytest.raises(EntityNotFoundError):
        service.simulate("mom_invalido")
