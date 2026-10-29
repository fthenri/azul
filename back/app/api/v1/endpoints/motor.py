from __future__ import annotations

from typing import List
from fastapi import APIRouter, Depends

from back.app.api.dependencies import (
    RequireCommissionerOrManagerDep,
    RequireManagerDep,
    get_crew_service,
    get_simulation_service,
)
from back.app.modules.simulation.crew_service import CrewService
from back.app.modules.simulation.service import SimulationService
from back.app.schemas.simulation import (
    AcaoConcluidaPayload,
    AcaoConcluidaResponse,
    AssentoVoo,
    SimularBordoPayload,
    SimularBordoResponse,
    SimularPayload,
    SimularResponse,
    VooSimuladoResponse,
)

router = APIRouter(prefix="/motor", tags=["Central de Decisões"])


# Estrutura da rota POST para o motor de simulação (Uplift e Agente LLM)
@router.post(
    "/simular",
    response_model=SimularResponse,
    summary="Executar Motor de Simulação",
    description="Aciona o Árbitro Matemático e o Agente LLM para um momento ou cliente específico, calculando Uplift e melhor ação.",
)
async def simular_motor(
    payload: SimularPayload,
    _user: RequireManagerDep,
    service: SimulationService = Depends(get_simulation_service),
) -> SimularResponse:
    target_id = payload.id_cliente or payload.cliente_id
    return service.simulate(momento_id=payload.momento_id, id_cliente=target_id)


# Estrutura da rota POST para simulação de ação de bordo da tripulação
@router.post(
    "/simular-bordo",
    response_model=SimularBordoResponse,
    summary="Executar Simulação de Ação de Bordo",
    description="Arbitra a melhor ação de baixo custo para o passageiro no assento e gera a instrução de abordagem para o comissário.",
)
async def simular_bordo(
    payload: SimularBordoPayload,
    _user: RequireCommissionerOrManagerDep,
    crew_service: CrewService = Depends(get_crew_service),
) -> SimularBordoResponse:
    return crew_service.simulate_in_flight_action(
        id_cliente=payload.id_cliente,
        assento=payload.assento,
    )


# Rota do mapa de voo simulado dentro do router motor
@router.get(
    "/voo-simulado",
    response_model=VooSimuladoResponse,
    summary="Obter Mapa de Assentos do Voo Simulado",
    description="Retorna a distribuição dinâmica de passageiros da Camada Gold com metadados da aeronave sorteada.",
)
async def get_voo_simulado_motor(
    modelo: str | None = None,
    _user: RequireCommissionerOrManagerDep = None,
    crew_service: CrewService = Depends(get_crew_service),
) -> VooSimuladoResponse:
    return crew_service.get_simulated_flight(modelo_aeronave=modelo)


@router.post(
    "/acao-concluida",
    response_model=AcaoConcluidaResponse,
    summary="Registrar Ação Concluída para Feedback Loop (MLOps)",
    description="Registra a conclusão de uma ação (ONBOARD_CREW ou OFFBOARD_CRM), alimentando o log transacional SQLite de Feedback Loop com trava anti-duplicação.",
)
async def registrar_acao_concluida(
    payload: AcaoConcluidaPayload,
    _user: RequireCommissionerOrManagerDep = None,
    crew_service: CrewService = Depends(get_crew_service),
) -> AcaoConcluidaResponse:
    res = crew_service.register_action_feedback(flight_id=payload.flight_id, payload=payload)
    return AcaoConcluidaResponse(**res)
