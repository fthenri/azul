from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from back.app.infrastructure.analytics.duckdb_client import DuckDBClient

logger = logging.getLogger("azul.moments.repository")


class MomentsRepository:
    """Repositório DuckDB para extração de momentos de atrito elegíveis para intervenção."""

    def __init__(self, duckdb_client: DuckDBClient) -> None:
        self.duckdb_client = duckdb_client

    def get_eligible_moments(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Extrai os principais momentos de atrito (atrasos, cancelamentos, extravios) cruzados com a camada Gold."""
        sql = """
        SELECT 
            concat('mom_', v.pnr) as id,
            v.id_cliente as cliente_id,
            CASE 
                WHEN v.situacao_voo = 'CANCELADO' OR v.atraso_enfrentado_minutos >= 120 OR v.teve_bagagem_extraviada = true 
                THEN 'Reativa'
                ELSE 'Proativa'
            END as tipo_simulacao,
            CASE 
                WHEN v.situacao_voo = 'CANCELADO' 
                THEN concat('Cancelamento de voo ', v.numero_voo, ' (', v.origem, ' -> ', v.destino, ')')
                WHEN v.teve_bagagem_extraviada = true 
                THEN concat('Extravio de bagagem com item prioritário - Voo ', v.numero_voo, ' (', v.origem, ' -> ', v.destino, ')')
                WHEN v.atraso_enfrentado_minutos >= 120 
                THEN concat('Atraso crítico de ', cast(cast(v.atraso_enfrentado_minutos as INT) as VARCHAR), ' min - Voo ', v.numero_voo, ' (', v.origem, ' -> ', v.destino, ')')
                ELSE concat('Alerta preditivo de evasão - Voo ', v.numero_voo)
            END as descricao,
            p.persona,
            round(c.clv_previsto, 2) as clv_previsto,
            round(e.risco_evasao, 4) as risco_evasao_atual
        FROM silver_viagens v
        JOIN gold_evasao e ON v.id_cliente = e.id_cliente
        JOIN gold_clv c ON v.id_cliente = c.id_cliente
        JOIN gold_personas p ON v.id_cliente = p.id_cliente
        WHERE v.atraso_enfrentado_minutos >= 120 
           OR v.situacao_voo = 'CANCELADO'
           OR v.teve_bagagem_extraviada = true
        ORDER BY e.risco_evasao DESC, c.clv_previsto DESC
        LIMIT ?
        """
        return self.duckdb_client.query(sql, [limit])

    def resolve_client_id(self, momento_id: str) -> Optional[str]:
        """Resolve o identificador real do cliente a partir do ID do momento."""
        clean_id = momento_id.strip()

        # 1. Se o momento for do padrão mom_<pnr>
        if clean_id.startswith("mom_"):
            pnr = clean_id[4:]
            sql = "SELECT id_cliente FROM silver_viagens WHERE pnr = ? LIMIT 1"
            row = self.duckdb_client.query_row(sql, [pnr])
            if row and row.get("id_cliente"):
                return str(row["id_cliente"])

        # 2. Se o momento for diretamente um id_cliente existente na camada Gold
        sql_check = "SELECT id_cliente FROM gold_clv WHERE id_cliente = ? LIMIT 1"
        row_cli = self.duckdb_client.query_row(sql_check, [clean_id])
        if row_cli and row_cli.get("id_cliente"):
            return str(row_cli["id_cliente"])

        # 3. Fallback especial para cenários de demo previstos em contract.md (ex: 'mom_789')
        if clean_id in ("mom_789", "mom_790", "mom_791"):
            sql_demo = """
            SELECT c.id_cliente 
            FROM gold_clv c
            JOIN gold_evasao e ON c.id_cliente = e.id_cliente
            WHERE e.risco_evasao >= 0.70
            ORDER BY c.clv_previsto DESC
            LIMIT 1
            """
            row_demo = self.duckdb_client.query_row(sql_demo)
            if row_demo and row_demo.get("id_cliente"):
                return str(row_demo["id_cliente"])

        return None
