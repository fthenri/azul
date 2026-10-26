from __future__ import annotations

import logging
import sys
from pathlib import Path

import duckdb
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger("azul.gold.contexto")


def resolve_data_lake_dir() -> Path:
    project_root = Path(__file__).resolve().parent.parent
    return project_root / "data_lake"


def build_gold_contexto(
    clientes_silver_path: Path,
    viagens_silver_path: Path,
    bagagem_silver_path: Path,
    ssr_silver_path: Path,
    sac_silver_path: Path,
    gold_output_path: Path,
) -> pd.DataFrame:
    """Constrói o Data Contract analítico gold_contexto_passageiro via DuckDB (LEFT JOINs).
    
    Consolida as 3 tabelas satélite em uma coluna de sumarização unificada `contexto_narrativo_llm`.
    """
    logger.info("Iniciando construção do Data Contract de Contexto Operacional...")

    con = duckdb.connect()

    # Registra as fontes no DuckDB
    con.register("clientes_silver", pd.read_parquet(clientes_silver_path))
    con.register("viagens_silver", pd.read_parquet(viagens_silver_path))
    con.register("bagagem_silver", pd.read_parquet(bagagem_silver_path) if bagagem_silver_path.exists() else pd.DataFrame(columns=["id_cliente", "pnr", "codigo_rastreio", "status_bagagem"]))
    con.register("ssr_silver", pd.read_parquet(ssr_silver_path) if ssr_silver_path.exists() else pd.DataFrame(columns=["id_cliente", "pnr", "codigo_ssr", "descricao_ssr"]))
    con.register("sac_silver", pd.read_parquet(sac_silver_path) if sac_silver_path.exists() else pd.DataFrame(columns=["id_cliente", "protocolo_sac", "motivo_reclamacao", "status_atendimento"]))

    sql = """
    WITH active_pax AS (
        SELECT DISTINCT id_cliente, pnr, numero_voo
        FROM viagens_silver
        WHERE situacao_voo IN ('A EMBARCAR', 'PROGRAMADO')
    ),
    consolidated AS (
        SELECT 
            c.id_cliente,
            COALESCE(ap.pnr, 'SOLO') AS pnr,
            COALESCE(ap.numero_voo, '') AS numero_voo,
            CASE WHEN b.codigo_rastreio IS NOT NULL THEN TRUE ELSE FALSE END AS tem_alerta_bagagem,
            COALESCE(b.codigo_rastreio, '') AS bagagem_codigo_rastreio,
            COALESCE(b.status_bagagem, '') AS bagagem_status,
            CASE WHEN s.codigo_ssr IS NOT NULL THEN TRUE ELSE FALSE END AS tem_ssr,
            COALESCE(s.codigo_ssr, '') AS ssr_codigo,
            COALESCE(s.descricao_ssr, '') AS ssr_descricao,
            CASE WHEN a.protocolo_sac IS NOT NULL THEN TRUE ELSE FALSE END AS tem_sac,
            COALESCE(a.protocolo_sac, '') AS sac_protocolo,
            COALESCE(a.motivo_reclamacao, '') AS sac_motivo,
            COALESCE(a.status_atendimento, '') AS sac_status,
            -- Data Contract: Sintetiza o achado narrativo para consumo do LLM/RAG
            CASE 
                WHEN b.codigo_rastreio IS NOT NULL OR s.codigo_ssr IS NOT NULL OR a.protocolo_sac IS NOT NULL THEN
                    CONCAT_WS('. ', 
                        CASE WHEN b.codigo_rastreio IS NOT NULL 
                             THEN CONCAT('Bagagem (WorldTracer ', b.codigo_rastreio, '): ', b.status_bagagem) 
                             ELSE NULL END,
                        CASE WHEN s.codigo_ssr IS NOT NULL 
                             THEN CONCAT('Serviço Especial (SSR ', s.codigo_ssr, '): ', s.descricao_ssr) 
                             ELSE NULL END,
                        CASE WHEN a.protocolo_sac IS NOT NULL 
                             THEN CONCAT('Ouvidoria/SAC (', a.protocolo_sac, '): ', a.motivo_reclamacao, ' [', a.status_atendimento, ']') 
                             ELSE NULL END
                    )
                ELSE 'Sem ocorrências recentes'
            END AS contexto_narrativo_llm,
            CURRENT_TIMESTAMP AS data_atualizacao
        FROM clientes_silver c
        LEFT JOIN active_pax ap ON c.id_cliente = ap.id_cliente
        LEFT JOIN bagagem_silver b ON c.id_cliente = b.id_cliente
        LEFT JOIN ssr_silver s ON c.id_cliente = s.id_cliente
        LEFT JOIN sac_silver a ON c.id_cliente = a.id_cliente
    )
    SELECT * FROM consolidated
    """

    df_contexto = con.execute(sql).df()
    gold_output_path.parent.mkdir(parents=True, exist_ok=True)
    df_contexto.to_parquet(gold_output_path, engine="pyarrow", compression="snappy", index=False)

    pax_com_contexto = df_contexto[df_contexto["contexto_narrativo_llm"] != "Sem ocorrências recentes"]
    logger.info(
        "Data Contract de Contexto salvo em %s (%d clientes | %d com ocorrências/SSRs ativos)",
        gold_output_path,
        len(df_contexto),
        len(pax_com_contexto),
    )
    return df_contexto


def run_gold_contexto_pipeline() -> Path:
    data_lake_dir = resolve_data_lake_dir()
    silver_dir = data_lake_dir / "silver"
    gold_dir = data_lake_dir / "gold"

    clientes_silver = silver_dir / "clientes_silver.parquet"
    viagens_silver = silver_dir / "viagens_silver.parquet"
    bagagem_silver = silver_dir / "bagagem_logs_silver.parquet"
    ssr_silver = silver_dir / "ssr_logs_silver.parquet"
    sac_silver = silver_dir / "sac_logs_silver.parquet"
    gold_output = gold_dir / "contexto_passageiro.parquet"

    build_gold_contexto(
        clientes_silver_path=clientes_silver,
        viagens_silver_path=viagens_silver,
        bagagem_silver_path=bagagem_silver,
        ssr_silver_path=ssr_silver,
        sac_silver_path=sac_silver,
        gold_output_path=gold_output,
    )
    return gold_output


if __name__ == "__main__":
    run_gold_contexto_pipeline()
