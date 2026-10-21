from __future__ import annotations

import pytest
from pydantic import ValidationError

from back.app.schemas.audit import DecisaoAuditoria, ShapResponse, VersaoModelos
from back.app.schemas.dashboard import DashboardKPIs, ParetoData, PersonaData
from back.app.schemas.moments import Momento
from back.app.schemas.simulation import SimularPayload, SimularResponse


def test_dashboard_kpis_contract_compliance() -> None:
    """Valida aderência do schema DashboardKPIs com o payload de contract.md."""
    raw_data = {
        "valor_protegido": 1250000.00,
        "valor_gerado": 850000.00,
        "custo_total": 150000.00,
        "roi_por_real_gasto": 14.00,
    }
    model = DashboardKPIs.model_validate(raw_data)
    assert model.valor_protegido == 1250000.0
    assert model.roi_por_real_gasto == 14.0
    # Verifica serialização json
    dump = model.model_dump()
    assert dump == raw_data


def test_personas_contract_compliance() -> None:
    """Valida aderência do schema PersonaData com contract.md."""
    raw_data = [
        {
            "persona": "Executivo Frequente",
            "clv_medio": 8500.00,
            "risco_evasao_medio": 0.45,
            "tamanho_bolha": 1200,
        },
        {
            "persona": "Família/Lazer Premium",
            "clv_medio": 4200.00,
            "risco_evasao_medio": 0.25,
            "tamanho_bolha": 3500,
        },
    ]
    models = [PersonaData.model_validate(item) for item in raw_data]
    assert len(models) == 2
    assert models[0].tamanho_bolha == 1200


def test_pareto_contract_compliance() -> None:
    """Valida aderência do schema ParetoData."""
    raw_data = {
        "decil_clientes": "Top 10%",
        "valor_acumulado": 5500000.00,
        "percentual_acumulado": 0.65,
    }
    model = ParetoData.model_validate(raw_data)
    assert model.decil_clientes == "Top 10%"
    assert model.percentual_acumulado == 0.65


def test_momento_contract_compliance() -> None:
    """Valida schema Momento."""
    raw_data = {
        "id": "mom_789",
        "cliente_id": "cli_123",
        "tipo_simulacao": "Reativa",
        "descricao": "Atraso crítico de 4 horas - Voo AD4321",
        "persona": "Executivo Frequente",
        "clv_previsto": 8500.00,
        "risco_evasao_atual": 0.85,
    }
    model = Momento.model_validate(raw_data)
    assert model.id == "mom_789"
    assert model.tipo_simulacao == "Reativa"


def test_simular_payload_and_response_compliance() -> None:
    """Valida payload e resposta do motor de simulação."""
    payload = SimularPayload.model_validate({"momento_id": "mom_789"})
    assert payload.momento_id == "mom_789"

    with pytest.raises(ValidationError):
        SimularPayload.model_validate({"momento_id": ""})

    with pytest.raises(ValidationError):
        SimularPayload.model_validate({"momento_id": "mom_123", "campo_extra": "invalido"})

    raw_response = {
        "uplift_status": "Persuadível",
        "ranking_acoes": [
            {
                "acao": "Upgrade de Cabine",
                "custo_acao": 300.00,
                "retorno_liquido": 850.00,
            },
            {
                "acao": "Voucher Azul Viagens R$ 150",
                "custo_acao": 150.00,
                "retorno_liquido": 450.00,
            },
        ],
        "decisao_final": {
            "acao_vencedora": "Upgrade de Cabine",
            "mensagem_llm": "Mensagem gerada pelo agente RAG",
            "regra_rag_consultada": "Regra diamante",
        },
    }
    resp_model = SimularResponse.model_validate(raw_response)
    assert resp_model.uplift_status == "Persuadível"
    assert len(resp_model.ranking_acoes) == 2


def test_audit_and_shap_compliance() -> None:
    """Valida schemas de auditoria e explicabilidade SHAP."""
    raw_audit = {
        "decisao_id": "dec_456",
        "cliente_id": "cli_123",
        "data_decisao": "2026-10-20T14:30:00Z",
        "tipo_simulacao": "Reativa",
        "acao_executada": "Bloqueada pelo Árbitro",
        "motivo_bloqueio": "Janela de silêncio de 72h",
        "custo_realizado": 0.00,
        "versao_modelos": {
            "clv": "v1.2",
            "churn": "v2.0",
            "llm": "gpt-4o-mini-rag",
        },
    }
    audit_model = DecisaoAuditoria.model_validate(raw_audit)
    assert audit_model.decisao_id == "dec_456"
    assert audit_model.motivo_bloqueio is not None

    raw_shap = {
        "risco_base": 0.20,
        "fatores": [
            {"variavel": "Atraso > 60 min recente", "impacto": 0.35, "direcao": "positivo"},
            {"variavel": "Recência de voo < 15 dias", "impacto": -0.05, "direcao": "negativo"},
        ],
    }
    shap_model = ShapResponse.model_validate(raw_shap)
    assert shap_model.risco_base == 0.20
    assert len(shap_model.fatores) == 2
    assert shap_model.fatores[0].direcao == "positivo"
