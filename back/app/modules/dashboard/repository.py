from __future__ import annotations

import logging
from typing import Any, Dict, List

from back.app.infrastructure.analytics.duckdb_client import DuckDBClient

logger = logging.getLogger("azul.dashboard.repository")


class DashboardRepository:
    """Repositório de dados analíticos para os indicadores do Dashboard Executivo."""

    def __init__(self, duckdb_client: DuckDBClient) -> None:
        self.duckdb_client = duckdb_client

    def get_personas_distribution(self) -> List[Dict[str, Any]]:
        """Consulta agregação de métricas por Persona na camada Gold."""
        sql = """
        SELECT 
            p.persona,
            round(avg(p.clv_previsto), 2) as clv_medio,
            round(avg(e.risco_evasao), 4) as risco_evasao_medio,
            round(avg(p.score_influencia), 1) as score_influencia,
            count(*)::INT as tamanho_bolha
        FROM gold_personas p
        JOIN gold_evasao e ON p.id_cliente = e.id_cliente
        GROUP BY p.persona
        ORDER BY tamanho_bolha DESC
        """
        return self.duckdb_client.query(sql)

    def get_pareto_distribution(self) -> List[Dict[str, Any]]:
        """Calcula a curva de Pareto (80/20) dividindo os clientes em 10 decis por CLV."""
        sql = """
        WITH ranked AS (
            SELECT 
                clv_previsto,
                ntile(10) OVER (ORDER BY clv_previsto DESC) as decil
            FROM gold_clv
        ),
        decil_agg AS (
            SELECT 
                decil,
                sum(clv_previsto) as soma_decil
            FROM ranked
            GROUP BY decil
        ),
        cumulative AS (
            SELECT 
                decil,
                sum(soma_decil) OVER (ORDER BY decil) as valor_acumulado,
                sum(soma_decil) OVER () as total_geral
            FROM decil_agg
        )
        SELECT 
            CASE 
                WHEN decil = 10 THEN '100%'
                ELSE concat('Top ', cast(decil * 10 as VARCHAR), '%')
            END as decil_clientes,
            round(valor_acumulado, 2) as valor_acumulado,
            round(valor_acumulado / total_geral, 4) as percentual_acumulado
        FROM cumulative
        ORDER BY decil ASC
        """
        return self.duckdb_client.query(sql)

    def get_kpis_aggregation(self) -> Dict[str, Any]:
        """Consulta os agregados financeiros da carteira de clientes."""
        sql = """
        SELECT 
            coalesce(round(sum(c.clv_previsto * e.risco_evasao), 2), 0.0) as valor_protegido,
            coalesce(round(sum(c.valor_monetario_expandido - c.valor_monetario_base), 2), 0.0) as valor_gerado,
            coalesce(round(sum(
                CASE 
                    WHEN e.risco_evasao >= 0.7 THEN 300.0
                    WHEN e.risco_evasao >= 0.4 THEN 150.0
                    ELSE 50.0 
                END
            ), 2), 0.0) as custo_total
        FROM gold_clv c
        JOIN gold_evasao e ON c.id_cliente = e.id_cliente
        WHERE e.risco_evasao >= 0.35
        """
        row = self.duckdb_client.query_row(sql)
        return row or {"valor_protegido": 0.0, "valor_gerado": 0.0, "custo_total": 0.0}

    def get_pareto_roi_analysis(self) -> List[Dict[str, Any]]:
        """Comprova matematicamente para a banca que o ROI de retenção do Top 20% supera o CAC e a Cauda Longa."""
        sql = """
        SELECT 
            c.faixa_pareto,
            count(*)::INT as total_clientes,
            round(avg(c.clv_previsto), 2) as clv_medio,
            round(avg(e.risco_evasao), 4) as risco_evasao_medio,
            round(sum(c.clv_previsto * e.risco_evasao), 2) as total_receita_em_risco,
            round(avg(c.clv_previsto * e.risco_evasao), 2) as perda_media_por_cliente,
            round(avg(c.clv_previsto * e.risco_evasao) / 120.0, 1) as roi_retencao_multiplicador
        FROM gold_clv c
        JOIN gold_evasao e ON c.id_cliente = e.id_cliente
        GROUP BY c.faixa_pareto
        ORDER BY clv_medio DESC
        """
        return self.duckdb_client.query(sql)

    def get_sentimento_analise(self) -> List[Dict[str, Any]]:
        """Consulta agregação de análise de sentimento sobre avaliações públicas (Reclame Aqui, App Store, Google Play)."""
        sql = """
        SELECT 
            topico,
            count(*)::INT as total_avaliacoes,
            round(avg(score_sentimento), 4) as score_sentimento_medio,
            round(avg(nota_cliente), 2) as nota_media,
            count(CASE WHEN score_sentimento < -0.10 THEN 1 END)::INT as total_criticas,
            count(CASE WHEN score_sentimento > 0.10 THEN 1 END)::INT as total_elogios
        FROM silver_avaliacoes
        GROUP BY topico
        ORDER BY score_sentimento_medio ASC
        """
        return self.duckdb_client.query(sql)
