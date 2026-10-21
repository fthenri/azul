from __future__ import annotations

from unittest.mock import MagicMock
import pytest

from back.app.core.exceptions import EntityNotFoundError
from back.app.modules.audit.repository import AuditRepository
from back.app.modules.audit.service import AuditService
from back.app.schemas.audit import DecisaoAuditoria, FatorShap, ShapResponse, VersaoModelos


def test_audit_service_list_and_shap() -> None:
    """Valida métodos do serviço de auditoria."""
    mock_repo = MagicMock(spec=AuditRepository)
    mock_repo.list_decisions.return_value = [
        DecisaoAuditoria(
            decisao_id="dec_456",
            cliente_id="cli_123",
            data_decisao="2026-10-20T14:30:00Z",
            tipo_simulacao="Reativa",
            acao_executada="Bloqueada pelo Árbitro",
            motivo_bloqueio="Janela de silêncio de 72h",
            custo_realizado=0.0,
            versao_modelos=VersaoModelos(clv="v1.2", churn="v2.0", llm="gpt-4o-mini-rag"),
        )
    ]
    mock_repo.get_shap_explanation.return_value = ShapResponse(
        risco_base=0.20,
        fatores=[
            FatorShap(variavel="Atraso > 60 min recente", impacto=0.35, direcao="positivo")
        ],
    )

    service = AuditService(repository=mock_repo)
    decisions = service.list_decisions()
    assert len(decisions) == 1
    assert decisions[0].decisao_id == "dec_456"

    shap = service.get_shap_explanation("dec_456")
    assert shap.risco_base == 0.20
    assert len(shap.fatores) == 1


def test_audit_service_missing_decision_shap() -> None:
    """Valida exceção quando o SHAP for consultado para decisão inexistente."""
    mock_repo = MagicMock(spec=AuditRepository)
    mock_repo.get_shap_explanation.side_effect = EntityNotFoundError("Decisão não encontrada")

    service = AuditService(repository=mock_repo)
    with pytest.raises(EntityNotFoundError):
        service.get_shap_explanation("dec_inexistente")
