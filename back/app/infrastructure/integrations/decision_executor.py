from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from pathlib import Path

from back.app.config import Settings, get_settings
from back.app.core.exceptions import EntityNotFoundError, SimulationExecutionError
from back.app.schemas.simulation import DecisaoFinal, RankingAcao, SimularResponse
from back.executor_decisao import (
    CATALOGO_ACOES,
    arbitrar_melhor_acao,
    carregar_contexto_rag,
    carregar_perfil_cliente_gold,
    gerar_mensagem_llm,
)

logger = logging.getLogger("azul.integrations.executor")

ROTULOS_ACOES: Dict[str, str] = {
    "UPGRADE_EXECUTIVA": "Upgrade de Cabine (Classe Executiva)",
    "ACESSO_LOUNGE_VCP": "Acesso ao Lounge Azul (VCP)",
    "BONUS_5000_PONTOS": "Bônus de 5.000 Pontos Azul Fidelidade",
    "ISENCAO_BAGAGEM_EXTRA": "Isenção de Bagagem Extra (23kg)",
    "CORTESIA_ESPACO_AZUL": "Cortesia de Assento Espaço Azul",
    "MENSAGEM_EXECUTIVA_VIP": "Mensagem Executiva VIP da Diretoria",
    "NAO_FAZER_NADA": "Não Agir (Sem Retorno de Uplift)",
}

REGRAS_RAG: Dict[str, str] = {
    "UPGRADE_EXECUTIVA": (
        "Diretrizes Azul Fidelidade: Upgrades de cabine são aplicáveis exclusivamente para a "
        "Classe Executiva em voos internacionais, priorizando clientes de altíssimo CLV."
    ),
    "ACESSO_LOUNGE_VCP": (
        "Diretrizes Azul Fidelidade: Reconhecimento em salas VIP próprias no Aeroporto de Viracopos "
        "(VCP), Lisboa, Orlando ou Fort Lauderdale para compensação de atrito operacional."
    ),
    "ISENCAO_BAGAGEM_EXTRA": (
        "Diretrizes Azul Fidelidade: Concessão de 1 volume extra de 23kg além da franquia "
        "conforme a categoria do cliente (Topázio 1, Safira 2, Diamante 3 volumes inclusos)."
    ),
    "CORTESIA_ESPACO_AZUL": (
        "Diretrizes Azul Fidelidade: Concessão de cortesia de assento Espaço Azul em voo doméstico "
        "para categorias Básica, Topázio e Safira (Clientes Diamante já possuem benefício ilimitado)."
    ),
    "BONUS_5000_PONTOS": (
        "Diretrizes Azul Fidelidade: Bonificação direta de 5.000 pontos no programa de fidelidade "
        "como incentivo à retenção imediata."
    ),
    "MENSAGEM_EXECUTIVA_VIP": (
        "Diretrizes de Experiência do Cliente: Comunicação humanizada assinada pela Diretoria "
        "de Operações da Azul sem custo financeiro de benefício agregado."
    ),
    "NAO_FAZER_NADA": (
        "Árbitro Matemático: Nenhuma ação do catálogo apresentou retorno líquido positivo "
        "(ROI Uplift <= 0.00). Decisão de Não Intervenção acionada para preservar o orçamento."
    ),
}


class DecisionExecutorAdapter:
    """Adaptador de isolamento para execução do motor de decisões existente."""

    def __init__(self, settings: Optional[Settings] = None) -> None:
        self.settings = settings or get_settings()
        self._contexto_rag: Optional[str] = None

    def get_contexto_rag(self) -> str:
        """Carrega e armazena em cache o contexto RAG do arquivo de regras."""
        if self._contexto_rag is None:
            rag_path = self.settings.rag_rules_path or (self.settings.project_root / "regras_azul_fidelidade.md")
            try:
                self._contexto_rag = carregar_contexto_rag(rag_path)
            except Exception as exc:
                logger.error("Falha ao carregar regras RAG em %s: %s", rag_path, exc)
                raise SimulationExecutionError(f"Arquivo RAG não encontrado: {rag_path}") from exc
        return self._contexto_rag

    def simulate_for_client(self, id_cliente: str) -> SimularResponse:
        """Executa o pipeline completo de decisão de Uplift e RAG para um cliente."""
        try:
            perfil = carregar_perfil_cliente_gold(
                id_cliente=id_cliente,
                data_lake_dir=self.settings.data_lake_dir,
            )
        except ValueError as exc:
            raise EntityNotFoundError(f"Cliente {id_cliente} não encontrado na camada Gold: {exc}") from exc
        except Exception as exc:
            raise SimulationExecutionError(f"Erro ao carregar perfil do cliente: {exc}") from exc

        try:
            decisao_arbitro = arbitrar_melhor_acao(perfil)
            acao_vencedora = decisao_arbitro["acao_vencedora"]
            avaliacoes_uplift = decisao_arbitro["avaliacoes_uplift"]

            contexto_rag = self.get_contexto_rag()
            mensagem_llm = gerar_mensagem_llm(
                perfil_cliente=perfil,
                acao_vencedora=acao_vencedora,
                contexto_rag=contexto_rag,
            )
        except Exception as exc:
            logger.exception("Falha durante o cálculo de arbitragem ou LLM: %s", exc)
            raise SimulationExecutionError(f"Erro na execução da simulação: {exc}") from exc

        # Constrói o ranking de ações ordenado pelo retorno líquido decrescente
        ranking_acoes: List[RankingAcao] = []
        for nome_acao, retorno in avaliacoes_uplift.items():
            custo = CATALOGO_ACOES.get(nome_acao, {}).get("custo", 0.0)
            rotulo = ROTULOS_ACOES.get(nome_acao, nome_acao)
            ranking_acoes.append(
                RankingAcao(
                    acao=rotulo,
                    custo_acao=round(custo, 2),
                    retorno_liquido=round(retorno, 2),
                )
            )

        ranking_acoes.sort(key=lambda item: item.retorno_liquido, reverse=True)

        rotulo_vencedora = ROTULOS_ACOES.get(acao_vencedora, acao_vencedora)
        regra_consultada = REGRAS_RAG.get(acao_vencedora, "Diretriz padrão do programa Azul Fidelidade.")
        uplift_status = "Persuadível" if (acao_vencedora != "NAO_FAZER_NADA" and decisao_arbitro["retorno_liquido"] > 0) else "Não Persuadível"

        return SimularResponse(
            uplift_status=uplift_status,
            ranking_acoes=ranking_acoes,
            decisao_final=DecisaoFinal(
                acao_vencedora=rotulo_vencedora,
                mensagem_llm=mensagem_llm,
                regra_rag_consultada=regra_consultada,
            ),
        )
