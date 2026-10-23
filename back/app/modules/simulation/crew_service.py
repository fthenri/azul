from __future__ import annotations

import logging
from typing import Any, List

from back.app.config import Settings, get_settings
from back.app.core.exceptions import EntityNotFoundError
from back.app.infrastructure.analytics.duckdb_client import DuckDBClient
from back.app.schemas.simulation import (
    AssentoCliente,
    AssentoVoo,
    MetadataAeronave,
    SimularBordoResponse,
    VooSimuladoResponse,
)
from back.executor_decisao import (
    ROTULOS_ACOES_BORDO,
    arbitrar_acao_bordo,
    carregar_contexto_rag,
    carregar_perfil_cliente_gold,
    gerar_instrucao_bordo_llm,
)

logger = logging.getLogger("azul.simulation.crew")

FIRST_NAMES = [
    "Lucas", "Mariana", "Gabriel", "Beatriz", "Rodrigo", "Juliana", "Felipe", "Camila",
    "Eduardo", "Larissa", "Thiago", "Fernanda", "Bruno", "Amanda", "Rafael", "Letícia",
    "Leonardo", "Carolina", "Guilherme", "Patrícia", "Marcelo", "Renata", "Gustavo", "Vanessa",
    "André", "Daniela", "Diego", "Bárbara", "Matheus", "Tatiane", "Alexandre", "Aline",
    "Vinícius", "Priscila", "Fábio", "Luana", "Caio", "Jéssica", "Danilo", "Sabrina",
    "Igor", "Bruna", "Renan", "Carla", "Vitor", "Flávia", "Leandro", "Mônica"
]
LAST_NAMES = [
    "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira",
    "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes",
    "Soares", "Fernandes", "Vieira", "Barbosa", "Rocha", "Dias", "Nascimento", "Andrade",
    "Moreira", "Nunes", "Marques", "Machado", "Mendes", "Freitas", "Cardoso", "Ramos",
    "Gonçalves", "Santana", "Teixeira", "Araújo", "Castro", "Cavalcanti", "Macedo", "Pinheiro"
]


FROTA_AZUL: dict[str, dict[str, Any]] = {
    "A320neo": {
        "modelo": "Airbus A320neo",
        "codigo": "A320neo",
        "fileiras": 29,
        "layout": ["A", "B", "C", "D", "E", "F"],
    },
    "E195-E2": {
        "modelo": "Embraer E195-E2",
        "codigo": "E195-E2",
        "fileiras": 34,
        "layout": ["A", "B", "C", "D"],
    },
    "ATR 72-600": {
        "modelo": "ATR 72-600",
        "codigo": "ATR 72-600",
        "fileiras": 18,
        "layout": ["A", "B", "C", "D"],
    },
}


def gerar_nome_passageiro(id_cliente: str) -> str:
    """Gera um nome brasileiro plausível e determinístico a partir do hash do identificador."""
    val = sum(ord(c) for c in str(id_cliente))
    first = FIRST_NAMES[val % len(FIRST_NAMES)]
    last = LAST_NAMES[(val // len(FIRST_NAMES)) % len(LAST_NAMES)]
    return f"{first} {last}"


class CrewService:
    """Serviço de aplicação para o Guest Service Tool da Tripulação (Voo ao Vivo)."""

    def __init__(
        self,
        duckdb_client: DuckDBClient,
        settings: Settings | None = None,
    ) -> None:
        self.duckdb_client = duckdb_client
        self.settings = settings or get_settings()
        self._contexto_rag: str | None = None

    def get_contexto_rag(self) -> str:
        """Carrega e armazena em cache o contexto RAG."""
        if self._contexto_rag is None:
            rag_path = self.settings.rag_rules_path or (self.settings.project_root / "regras_azul_fidelidade.md")
            self._contexto_rag = carregar_contexto_rag(rag_path)
        return self._contexto_rag

    def get_simulated_flight(self, modelo_aeronave: str | None = None) -> VooSimuladoResponse:
        """Gera o mapa de assentos para um voo simulado sorteando um modelo da frota Azul."""
        import random

        if modelo_aeronave and modelo_aeronave in FROTA_AZUL:
            aeronave = FROTA_AZUL[modelo_aeronave]
        else:
            codigo_sorteado = random.choice(list(FROTA_AZUL.keys()))
            aeronave = FROTA_AZUL[codigo_sorteado]

        fileiras = int(aeronave["fileiras"])
        layout = list(aeronave["layout"])
        assentos_codigos: list[str] = [
            f"{row}{col}" for row in range(1, fileiras + 1) for col in layout
        ]
        total_assentos = len(assentos_codigos)

        # Proporções analíticas baseadas na capacidade da aeronave sorteada
        qtd_vips = max(int(total_assentos * 0.16), 10)
        qtd_criticos = max(int(total_assentos * 0.14), 8)

        sql_vips = f"""
        SELECT c.id_cliente, s.tier_fidelidade, p.persona, round(c.clv_previsto, 2) as clv_previsto,
               c.faixa_pareto, round(e.risco_evasao, 4) as risco_evasao, round(e.score_atrito_acumulado, 2) as score_atrito_acumulado
        FROM gold_clv c
        JOIN gold_evasao e ON c.id_cliente = e.id_cliente
        JOIN gold_personas p ON c.id_cliente = p.id_cliente
        JOIN silver_clientes s ON c.id_cliente = s.id_cliente
        WHERE c.faixa_pareto IN ('Top 10% Receita', 'Top 20% Receita') AND e.risco_evasao <= 0.60
        ORDER BY c.clv_previsto DESC
        LIMIT {qtd_vips + 15}
        """

        sql_criticos = f"""
        SELECT c.id_cliente, s.tier_fidelidade, p.persona, round(c.clv_previsto, 2) as clv_previsto,
               c.faixa_pareto, round(e.risco_evasao, 4) as risco_evasao, round(e.score_atrito_acumulado, 2) as score_atrito_acumulado
        FROM gold_clv c
        JOIN gold_evasao e ON c.id_cliente = e.id_cliente
        JOIN gold_personas p ON c.id_cliente = p.id_cliente
        JOIN silver_clientes s ON c.id_cliente = s.id_cliente
        WHERE e.risco_evasao > 0.60
        ORDER BY e.risco_evasao DESC
        LIMIT {qtd_criticos + 15}
        """

        sql_normais = f"""
        SELECT c.id_cliente, s.tier_fidelidade, p.persona, round(c.clv_previsto, 2) as clv_previsto,
               c.faixa_pareto, round(e.risco_evasao, 4) as risco_evasao, round(e.score_atrito_acumulado, 2) as score_atrito_acumulado
        FROM gold_clv c
        JOIN gold_evasao e ON c.id_cliente = e.id_cliente
        JOIN gold_personas p ON c.id_cliente = p.id_cliente
        JOIN silver_clientes s ON c.id_cliente = s.id_cliente
        WHERE e.risco_evasao <= 0.60 AND c.faixa_pareto NOT IN ('Top 10% Receita', 'Top 20% Receita')
        ORDER BY c.recencia_dias ASC
        LIMIT {total_assentos + 35}
        """

        vips = self.duckdb_client.query(sql_vips)
        criticos = self.duckdb_client.query(sql_criticos)
        normais = self.duckdb_client.query(sql_normais)

        # Fileiras 1 a 4 (Espaço Azul): prioriza passageiros VIPs
        assentos_espaco_azul = 4 * len(layout)
        passageiros_pool: list[dict[str, Any]] = []

        vip_idx = 0
        crit_idx = 0
        norm_idx = 0
        step_critico = 7 if len(layout) == 6 else 5

        for seat_num in range(total_assentos):
            if seat_num < assentos_espaco_azul and vip_idx < len(vips):
                passageiros_pool.append(vips[vip_idx])
                vip_idx += 1
            elif (seat_num % step_critico == 2) and crit_idx < len(criticos):
                passageiros_pool.append(criticos[crit_idx])
                crit_idx += 1
            elif norm_idx < len(normais):
                passageiros_pool.append(normais[norm_idx])
                norm_idx += 1
            elif crit_idx < len(criticos):
                passageiros_pool.append(criticos[crit_idx])
                crit_idx += 1
            elif vip_idx < len(vips):
                passageiros_pool.append(vips[vip_idx])
                vip_idx += 1
            else:
                break

        resultado: List[AssentoVoo] = []
        for idx, passageiro in enumerate(passageiros_pool):
            if idx >= total_assentos:
                break
            codigo_assento = assentos_codigos[idx]
            risco = float(passageiro["risco_evasao"])
            pareto = str(passageiro["faixa_pareto"])

            if risco > 0.60:
                status = "critico"
            elif pareto in ("Top 10% Receita", "Top 20% Receita"):
                status = "vip"
            else:
                status = "normal"

            cliente_dto = AssentoCliente(
                id_cliente=str(passageiro["id_cliente"]),
                nome=gerar_nome_passageiro(passageiro["id_cliente"]),
                tier_fidelidade=str(passageiro["tier_fidelidade"]),
                persona=str(passageiro["persona"]),
                clv_previsto=float(passageiro["clv_previsto"]),
                faixa_pareto=pareto,
                risco_evasao=risco,
                score_atrito_acumulado=float(passageiro["score_atrito_acumulado"]),
            )

            resultado.append(
                AssentoVoo(
                    assento=codigo_assento,
                    status=status,
                    dados_cliente=cliente_dto,
                )
            )

        metadata = MetadataAeronave(
            modelo=str(aeronave["modelo"]),
            codigo=str(aeronave["codigo"]),
            fileiras=fileiras,
            layout=layout,
            total_assentos=total_assentos,
        )

        return VooSimuladoResponse(
            metadata_aeronave=metadata,
            assentos=resultado,
        )

    def simulate_in_flight_action(
        self,
        id_cliente: str,
        assento: str,
    ) -> SimularBordoResponse:
        """Arbitra ação de bordo e gera instrução do comissário via LLM."""
        # 1. Recupera o perfil analítico completo na Camada Gold via DuckDB (com faixa_pareto)
        sql = """
        SELECT c.id_cliente, s.tier_fidelidade, p.persona, c.clv_previsto,
               c.faixa_pareto, e.risco_evasao, e.score_atrito_acumulado
        FROM gold_clv c
        JOIN gold_evasao e ON c.id_cliente = e.id_cliente
        JOIN gold_personas p ON c.id_cliente = p.id_cliente
        JOIN silver_clientes s ON c.id_cliente = s.id_cliente
        WHERE c.id_cliente = ?
        LIMIT 1
        """
        row = self.duckdb_client.query_row(sql, [id_cliente])
        if row:
            perfil = {
                "id_cliente": str(row["id_cliente"]),
                "tier_fidelidade": str(row["tier_fidelidade"]),
                "persona": str(row["persona"]),
                "clv_previsto": float(row["clv_previsto"]),
                "faixa_pareto": str(row["faixa_pareto"]),
                "risco_evasao": float(row["risco_evasao"]),
                "score_atrito_acumulado": float(row["score_atrito_acumulado"]),
            }
        else:
            # Fallback resiliente para busca direta via Parquet se necessário
            try:
                perfil = carregar_perfil_cliente_gold(
                    id_cliente=id_cliente,
                    data_lake_dir=self.settings.data_lake_dir,
                )
            except Exception:
                raise EntityNotFoundError(f"Passageiro '{id_cliente}' não encontrado na Camada Gold.")

        # 2. Árbitro de Bordo
        decisao = arbitrar_acao_bordo(perfil)
        acao_vencedora: str = str(decisao.get("acao_vencedora", "ABORDAGEM_CHEFE_CABINE"))
        rotulo_acao: str = ROTULOS_ACOES_BORDO.get(acao_vencedora) or acao_vencedora

        # 3. Agente LLM para comissário (passa o código técnico da ação vencedora para o prompt e mock)
        contexto_rag = self.get_contexto_rag()
        resultado_llm = gerar_instrucao_bordo_llm(
            perfil_cliente=perfil,
            assento=assento,
            acao_vencedora=acao_vencedora,
            contexto_rag=contexto_rag,
        )

        return SimularBordoResponse(
            assento=assento,
            id_cliente=id_cliente,
            acao_sugerida=rotulo_acao,
            custo_acao=float(decisao.get("custo_acao", 0.0)),
            retorno_liquido=float(decisao.get("retorno_liquido", 0.0)),
            instrucao_comissario=str(resultado_llm.get("instrucao_comissario", "")),
            dados_cliente={
                "id_cliente": perfil.get("id_cliente"),
                "nome": gerar_nome_passageiro(str(perfil.get("id_cliente", ""))),
                "tier_fidelidade": perfil.get("tier_fidelidade"),
                "persona": perfil.get("persona"),
                "clv_previsto": perfil.get("clv_previsto"),
                "faixa_pareto": perfil.get("faixa_pareto", "Cauda Longa"),
                "risco_evasao": perfil.get("risco_evasao"),
                "score_atrito_acumulado": perfil.get("score_atrito_acumulado"),
            },
        )

