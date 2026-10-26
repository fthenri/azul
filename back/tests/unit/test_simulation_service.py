from __future__ import annotations

from unittest.mock import MagicMock
import pytest

from back.app.core.exceptions import EntityNotFoundError
from back.app.infrastructure.integrations.decision_executor import DecisionExecutorAdapter
from back.app.modules.moments.service import MomentsService
from back.app.modules.simulation.service import SimulationService
from back.app.schemas.simulation import DecisaoFinal, RankingAcao, SimularResponse
from back.executor_decisao import arbitrar_melhor_acao


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


def test_arbitrar_melhor_acao_lgpd_opt_out_safeguard() -> None:
    """Valida a salvaguarda estrita de IA Responsável & LGPD (Art. 7º e 18 da LGPD)."""
    # Cliente com alto CLV e alto risco, mas com opt-out (consentimento_marketing = False)
    perfil_opt_out = {
        "id_cliente": "cli_lgpd_test",
        "tier_fidelidade": "Diamante",
        "clv_previsto": 85000.0,
        "risco_evasao": 0.80,
        "consentimento_marketing": False,
    }
    decisao = arbitrar_melhor_acao(perfil_opt_out)

    assert decisao["acao_vencedora"] == "BLOQUEIO_LGPD_OPT_OUT"
    assert decisao["retorno_liquido"] == 0.0
    assert decisao["custo_acao"] == 0.0
    assert "motivo_bloqueio" in decisao
    assert "Salvaguarda LGPD" in decisao["motivo_bloqueio"]
    assert len(decisao["avaliacoes_uplift"]) == 0


def test_arbitrar_acao_bordo_pet_routing() -> None:
    """Valida o roteamento contextual inteligente para tutores com Pet na cabine (PETC)."""
    from back.executor_decisao import (
        ROTULOS_ACOES_BORDO,
        _obter_mock_bordo_padronizado,
        arbitrar_acao_bordo,
    )

    # Cenário 1: SSR PETC
    perfil_petc = {
        "id_cliente": "cli_pet_1",
        "tier_fidelidade": "Safira",
        "clv_previsto": 15000.0,
        "risco_evasao": 0.35,
        "contexto_narrativo_llm": "Serviço Especial (SSR PETC): Viajando com Pet na Cabine (cão de pequeno porte)",
    }
    decisao_petc = arbitrar_acao_bordo(perfil_petc)
    assert decisao_petc["acao_vencedora"] == "KIT_PET"
    assert decisao_petc["custo_acao"] == 10.0
    rotulo = ROTULOS_ACOES_BORDO[decisao_petc["acao_vencedora"]]
    assert rotulo == "Kit Snack Premium + Atenção Pet"

    mock_res = _obter_mock_bordo_padronizado(perfil_petc, assento="4B", acao_vencedora="KIT_PET")
    assert "Pet" in mock_res["instrucao_comissario"] or "pet" in mock_res["instrucao_comissario"].lower()
    assert "Kit Snack Premium" in mock_res["instrucao_comissario"]

    # Cenário 2: Palavra 'Pet' no contexto
    perfil_pet = {
        "id_cliente": "cli_pet_2",
        "tier_fidelidade": "Diamante",
        "clv_previsto": 35000.0,
        "risco_evasao": 0.40,
        "contexto_narrativo_llm": "Passageiro transportando pet de suporte emocional na caixa",
    }
    decisao_pet = arbitrar_acao_bordo(perfil_pet)
    assert decisao_pet["acao_vencedora"] == "KIT_PET"
    assert decisao_pet["custo_acao"] == 10.0

    # Cenário 3: Variação 'pet na cabine' e 'ANIMAL' (Case-insensitive)
    perfil_cabine = {
        "id_cliente": "cli_pet_3",
        "tier_fidelidade": "Topázio",
        "clv_previsto": 8000.0,
        "risco_evasao": 0.30,
        "contexto_narrativo_llm": "Reserva confirmada com PET NA CABINE sob assento 12C",
    }
    decisao_cabine = arbitrar_acao_bordo(perfil_cabine)
    assert decisao_cabine["acao_vencedora"] == "KIT_PET"
    assert decisao_cabine["custo_acao"] == 10.0

    perfil_animal = {
        "id_cliente": "cli_pet_4",
        "tier_fidelidade": "Azul",
        "clv_previsto": 4000.0,
        "risco_evasao": 0.20,
        "contexto_narrativo_llm": "Aviso de embarque: transporte de animal vivo devidamente autorizado",
    }
    decisao_animal = arbitrar_acao_bordo(perfil_animal)
    assert decisao_animal["acao_vencedora"] == "KIT_PET"
    assert decisao_animal["custo_acao"] == 10.0


def test_arbitrar_acao_bordo_roi_negativo_veto() -> None:
    """Valida que quando o retorno líquido for <= 0, a ação é vetada para proteger o caixa."""
    from back.executor_decisao import (
        ROTULOS_ACOES_BORDO,
        _obter_mock_bordo_padronizado,
        arbitrar_acao_bordo,
    )

    # Cliente com baixo CLV e risco moderado onde a ação gera ROI negativo
    perfil_turista_baixo_clv = {
        "id_cliente": "cli_baixo_clv_1",
        "tier_fidelidade": "Azul",
        "persona": "Turista Eventual",
        "clv_previsto": 100.0,
        "risco_evasao": 0.30,
        "contexto_narrativo_llm": "Passageiro viajando sem ocorrências recentes",
    }
    decisao = arbitrar_acao_bordo(perfil_turista_baixo_clv)
    assert decisao["acao_vencedora"] == "NENHUMA_ACAO"
    assert decisao["custo_acao"] == 0.0
    assert decisao["retorno_liquido"] <= 0.0

    rotulo = ROTULOS_ACOES_BORDO[decisao["acao_vencedora"]]
    assert rotulo == "Nenhuma Ação"

    mock_res = _obter_mock_bordo_padronizado(
        perfil_turista_baixo_clv, assento="14B", acao_vencedora="NENHUMA_ACAO"
    )
    assert "Decisão Analítica" in mock_res["instrucao_comissario"]
    assert "Intervenção cancelada" in mock_res["instrucao_comissario"]
