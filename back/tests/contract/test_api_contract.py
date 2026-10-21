from __future__ import annotations

import time
from fastapi.testclient import TestClient

from back.app.schemas.audit import DecisaoAuditoria, ShapResponse
from back.app.schemas.dashboard import DashboardKPIs, ParetoData, PersonaData
from back.app.schemas.moments import Momento
from back.app.schemas.simulation import SimularResponse


def test_full_api_contract_e2e(client: TestClient) -> None:
    """Validação ponta a ponta de todos os endpoints da API contra os contratos do frontend."""

    # 1. Health Check
    res_health = client.get("/api/v1/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] in ("healthy", "degraded")

    # 2. Dashboard KPIs
    t0 = time.perf_counter()
    res_kpis = client.get("/api/v1/dashboard/kpis")
    t_kpis = (time.perf_counter() - t0) * 1000
    assert res_kpis.status_code == 200
    kpis = DashboardKPIs.model_validate(res_kpis.json())
    assert kpis.valor_protegido > 0
    assert kpis.roi_por_real_gasto >= 0

    # 3. Dashboard Personas
    t0 = time.perf_counter()
    res_personas = client.get("/api/v1/dashboard/personas")
    t_personas = (time.perf_counter() - t0) * 1000
    assert res_personas.status_code == 200
    personas = [PersonaData.model_validate(p) for p in res_personas.json()]
    assert len(personas) >= 2

    # 4. Dashboard Pareto
    t0 = time.perf_counter()
    res_pareto = client.get("/api/v1/dashboard/pareto")
    t_pareto = (time.perf_counter() - t0) * 1000
    assert res_pareto.status_code == 200
    pareto = [ParetoData.model_validate(p) for p in res_pareto.json()]
    assert len(pareto) == 10
    assert pareto[-1].percentual_acumulado == 1.0

    # 5. Momentos
    t0 = time.perf_counter()
    res_mom = client.get("/api/v1/momentos")
    t_mom = (time.perf_counter() - t0) * 1000
    assert res_mom.status_code == 200
    momentos = [Momento.model_validate(m) for m in res_mom.json()]
    assert len(momentos) > 0

    # 6. Simulação do Motor
    target_momento_id = momentos[0].id
    t0 = time.perf_counter()
    res_sim = client.post("/api/v1/motor/simular", json={"momento_id": target_momento_id})
    t_sim = (time.perf_counter() - t0) * 1000
    assert res_sim.status_code == 200
    sim = SimularResponse.model_validate(res_sim.json())
    assert sim.uplift_status in ("Persuadível", "Não Persuadível")
    assert len(sim.ranking_acoes) > 0
    assert len(sim.decisao_final.mensagem_llm) > 0

    # 7. Listagem de Auditoria
    t0 = time.perf_counter()
    res_audit = client.get("/api/v1/auditoria/decisoes")
    t_audit = (time.perf_counter() - t0) * 1000
    assert res_audit.status_code == 200
    decisions = [DecisaoAuditoria.model_validate(d) for d in res_audit.json()]
    assert len(decisions) >= 2

    # 8. Explicabilidade SHAP
    latest_id = decisions[0].decisao_id
    t0 = time.perf_counter()
    res_shap = client.get(f"/api/v1/auditoria/decisoes/{latest_id}/shap")
    t_shap = (time.perf_counter() - t0) * 1000
    assert res_shap.status_code == 200
    shap = ShapResponse.model_validate(res_shap.json())
    assert shap.risco_base > 0
    assert len(shap.fatores) > 0

    # Registra baselines de performance
    print(f"\n[PERFORMANCE BASELINE]")
    print(f"  • GET /dashboard/kpis        : {t_kpis:.2f} ms")
    print(f"  • GET /dashboard/personas    : {t_personas:.2f} ms")
    print(f"  • GET /dashboard/pareto      : {t_pareto:.2f} ms")
    print(f"  • GET /momentos              : {t_mom:.2f} ms")
    print(f"  • POST /motor/simular        : {t_sim:.2f} ms")
    print(f"  • GET /auditoria/decisoes    : {t_audit:.2f} ms")
    print(f"  • GET /auditoria/{latest_id}/shap : {t_shap:.2f} ms")
