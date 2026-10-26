from __future__ import annotations

import argparse
from datetime import datetime, timezone
import logging
import os
from pathlib import Path
import sys
from typing import Any, Dict, List

import duckdb
import pandas as pd

from back.app.infrastructure.ai.real_llm_client import RealLLMClient

# Configuração de logging estruturado
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger("azul.dataops.batch_llm")

# Constantes de mensagens de fallback e segurança corporativa
FALLBACK_SEGURANCA_TIER = "Instrução pendente. Siga o protocolo padrão do Tier."


def resolve_data_lake_dir() -> Path:
    """Localiza o diretório raiz do Data Lake em tempo de execução."""
    if os.getenv("DATA_LAKE_DIR"):
        return Path(os.getenv("DATA_LAKE_DIR")).resolve()
    current_dir = Path(__file__).resolve().parent
    candidates = [
        current_dir.parent / "data_lake",
        current_dir / "data_lake",
        Path("/app/data_lake"),
    ]
    for c in candidates:
        if c.exists() and (c / "gold").exists():
            return c
    return current_dir.parent / "data_lake"


def build_prompt_for_passenger(pax: Dict[str, Any]) -> str:
    """Constrói o prompt de inferência a partir do contexto do passageiro.
    
    Se o passageiro não possuir contexto ou dados mínimos (ou marcador de teste),
    retorna string vazia para ativar o fluxo de Graceful Degradation.
    """
    id_cliente = pax.get("id_cliente")
    ctx = pax.get("contexto_narrativo_llm")

    # Caso de borda: prompt vazio para simular/testar Graceful Degradation
    if not id_cliente or ctx is None:
        return ""

    ctx_str = str(ctx).strip()
    if not ctx_str or ctx_str in ("EMPTY_PROMPT", "SIMULAR_ERRO"):
        return ""

    voo = pax.get("numero_voo") or "N/A"
    pnr = pax.get("pnr") or "SOLO"

    return (
        f"Gere instrução tática de bordo para a tripulação Azul. "
        f"Cliente: {id_cliente}, Voo: {voo}, PNR: {pnr}. "
        f"Contexto Operacional: {ctx_str}."
    )


def run_batch_pipeline(
    data_lake_dir: Path | None = None,
    delay_seconds: float | None = None,
    limit: int | None = None,
) -> Dict[str, Any]:
    """Executa o pipeline em lote de inferência LLM com isolamento (Staging) e MERGE no Data Lake.
    
    Padrões arquiteturais atendidos:
    1. Idempotência: busca apenas registros pendentes (llm_mensagem_comissaria IS NULL ou vazio).
    2. Graceful Degradation: fallback para string de segurança em caso de falha/prompt vazio.
    3. Staging Isolation: resultados intermediários gravados em silver_llm_staging.parquet.
    4. Upsert/Merge: recriação atômica via DuckDB na tabela Gold.
    """
    logger.info("Iniciando Lote...")
    print("Iniciando Lote")

    # 1. Resolução de caminhos no Data Lake
    dl_dir = data_lake_dir or resolve_data_lake_dir()
    gold_dir = dl_dir / "gold"
    silver_dir = dl_dir / "silver"

    gold_contexto_path = gold_dir / "contexto_passageiro.parquet"
    staging_path = silver_dir / "silver_llm_staging.parquet"

    if not gold_contexto_path.exists():
        raise FileNotFoundError(
            f"Tabela Gold de contexto não encontrada em: {gold_contexto_path}"
        )

    # 2. Conexão analítica DuckDB e inspeção de schema
    con = duckdb.connect()
    schema_cols = [
        r[0]
        for r in con.execute(
            f"DESCRIBE SELECT * FROM read_parquet('{gold_contexto_path.as_posix()}')"
        ).fetchall()
    ]
    has_llm_col = "llm_mensagem_comissaria" in schema_cols

    # Registra view analítica gold_contexto_passageiro tratando ausência inicial da coluna
    if not has_llm_col:
        con.execute(f"""
            CREATE OR REPLACE VIEW gold_contexto_passageiro AS
            SELECT *, CAST(NULL AS VARCHAR) AS llm_mensagem_comissaria
            FROM read_parquet('{gold_contexto_path.as_posix()}')
        """)
    else:
        con.execute(f"""
            CREATE OR REPLACE VIEW gold_contexto_passageiro AS
            SELECT *
            FROM read_parquet('{gold_contexto_path.as_posix()}')
        """)

    # 3. Query idempotente: apenas registros onde llm_mensagem_comissaria IS NULL ou vazio
    query = """
        SELECT *
        FROM gold_contexto_passageiro
        WHERE llm_mensagem_comissaria IS NULL
           OR TRIM(COALESCE(llm_mensagem_comissaria, '')) = ''
    """
    if limit is not None and limit > 0:
        query += f" LIMIT {limit}"

    pending_df = con.execute(query).df()
    num_pendentes = len(pending_df)
    logger.info("Registros pendentes identificados para inferência LLM: %d", num_pendentes)

    # 4. Configuração do Real LLM Client
    llm_client = RealLLMClient()

    # 5. Processamento em loop isolado (Graceful Degradation)
    staging_records: List[Dict[str, Any]] = []

    for _, row in pending_df.iterrows():
        pax = row.to_dict()
        prompt = build_prompt_for_passenger(pax)

        try:
            mensagem = llm_client.generate(prompt)
        except Exception as exc:
            logger.warning(
                "Falha na inferência LLM para cliente %s (%s). Injetando fallback de segurança.",
                pax.get("id_cliente"),
                exc,
            )
            mensagem = FALLBACK_SEGURANCA_TIER

        staging_records.append({
            "id_cliente": pax["id_cliente"],
            "llm_mensagem_comissaria": mensagem,
            "data_atualizacao": datetime.now(timezone.utc).isoformat(),
        })

    # Log obrigatório: Registros processados: X
    num_processados = len(staging_records)
    logger.info("Registros processados: %d", num_processados)
    print(f"Registros processados: {num_processados}")

    # 6. Gravação da camada de Staging e MERGE massivo na camada Gold
    if staging_records:
        df_staging = pd.DataFrame(staging_records)
        staging_path.parent.mkdir(parents=True, exist_ok=True)
        df_staging.to_parquet(staging_path, engine="pyarrow", compression="snappy", index=False)
        logger.info("Resultados do lote gravados em staging: %s (%d registros)", staging_path, num_processados)

        # Upsert massivo via DuckDB utilizando recriação atômica
        con.register("silver_llm_staging", df_staging)
        temp_gold_path = gold_contexto_path.with_suffix(".parquet.tmp")

        merge_sql = f"""
            SELECT 
                g.id_cliente,
                g.pnr,
                g.numero_voo,
                g.tem_alerta_bagagem,
                g.bagagem_codigo_rastreio,
                g.bagagem_status,
                g.tem_ssr,
                g.ssr_codigo,
                g.ssr_descricao,
                g.tem_sac,
                g.sac_protocolo,
                g.sac_motivo,
                g.sac_status,
                g.contexto_narrativo_llm,
                COALESCE(s.llm_mensagem_comissaria, {("g.llm_mensagem_comissaria" if has_llm_col else "CAST(NULL AS VARCHAR)")}) AS llm_mensagem_comissaria,
                CASE 
                    WHEN s.id_cliente IS NOT NULL THEN CURRENT_TIMESTAMP 
                    ELSE TRY_CAST(g.data_atualizacao AS TIMESTAMP WITH TIME ZONE) 
                END AS data_atualizacao
            FROM read_parquet('{gold_contexto_path.as_posix()}') g
            LEFT JOIN silver_llm_staging s ON g.id_cliente = s.id_cliente
        """
        con.execute(f"COPY ({merge_sql}) TO '{temp_gold_path.as_posix()}' (FORMAT PARQUET, COMPRESSION SNAPPY)")
        temp_gold_path.replace(gold_contexto_path)

    # Log obrigatório: Upsert concluído no Data Lake
    logger.info("Upsert concluído no Data Lake")
    print("Upsert concluído no Data Lake")

    return {
        "status": "sucesso",
        "registros_processados": num_processados,
        "data_lake_gold": str(gold_contexto_path),
        "staging_silver": str(staging_path) if staging_records else None,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Pipeline Batch de Inferência LLM para Instruções Operacionais de Cabine"
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=None,
        help="Delay simulado de rede por chamada LLM em segundos",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limite máximo de registros para execução parcial do lote",
    )
    args = parser.parse_args()

    run_batch_pipeline(delay_seconds=args.delay, limit=args.limit)


if __name__ == "__main__":
    main()
