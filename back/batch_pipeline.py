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
from back.app.modules.simulation.crew_service import gerar_nome_passageiro
from back.executor_decisao import (
    FALLBACK_ROI_NEGATIVO,
    MENSAGEM_VETO_POLITICA,
    ROTULOS_ACOES_BORDO,
    arbitrar_acao_bordo,
)

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
FALLBACK_OFFBOARD = "Mensagem pendente. Favor acionar a régua de relacionamento padrão."


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
    has_acao_col = "acao_vencedora" in schema_cols
    has_custo_col = "custo_acao" in schema_cols
    has_llm_col = "llm_mensagem_comissaria" in schema_cols
    has_offboard_col = "mensagem_llm_offboard" in schema_cols

    # Registra view analítica gold_contexto_passageiro tratando ausência inicial das colunas
    extra_cols = []
    if not has_acao_col:
        extra_cols.append("CAST(NULL AS VARCHAR) AS acao_vencedora")
    if not has_custo_col:
        extra_cols.append("CAST(NULL AS DOUBLE) AS custo_acao")
    if not has_llm_col:
        extra_cols.append("CAST(NULL AS VARCHAR) AS llm_mensagem_comissaria")
    if not has_offboard_col:
        extra_cols.append("CAST(NULL AS VARCHAR) AS mensagem_llm_offboard")
    extra_sql = (", " + ", ".join(extra_cols)) if extra_cols else ""

    con.execute(f"""
        CREATE OR REPLACE VIEW gold_contexto_passageiro AS
        SELECT *{extra_sql}
        FROM read_parquet('{gold_contexto_path.as_posix()}')
    """)

    # Registra views analíticas auxiliares para cálculo de risco e priorização por voo com inspeção resiliente de schema
    evasao_path = gold_dir / "evasao_clientes.parquet"
    clv_path = gold_dir / "clv_clientes.parquet"
    personas_path = gold_dir / "personas_clientes.parquet"
    clientes_path = silver_dir / "clientes_silver.parquet"

    if evasao_path.exists():
        evasao_cols = [r[0] for r in con.execute(f"DESCRIBE SELECT * FROM read_parquet('{evasao_path.as_posix()}')").fetchall()]
        extra_evasao = "" if "score_atrito_acumulado" in evasao_cols else ", 0.0 AS score_atrito_acumulado"
        con.execute(f"CREATE OR REPLACE VIEW gold_evasao AS SELECT *{extra_evasao} FROM read_parquet('{evasao_path.as_posix()}')")
    else:
        con.execute("CREATE OR REPLACE VIEW gold_evasao AS SELECT '' AS id_cliente, 0.0 AS risco_evasao, 0.0 AS score_atrito_acumulado")

    if clv_path.exists():
        con.execute(f"CREATE OR REPLACE VIEW gold_clv AS SELECT * FROM read_parquet('{clv_path.as_posix()}')")
    else:
        con.execute("CREATE OR REPLACE VIEW gold_clv AS SELECT '' AS id_cliente, 0.0 AS clv_previsto")

    if personas_path.exists():
        personas_cols = [r[0] for r in con.execute(f"DESCRIBE SELECT * FROM read_parquet('{personas_path.as_posix()}')").fetchall()]
        extra_personas = "" if "persona" in personas_cols else ", 'Turista Eventual' AS persona"
        con.execute(f"CREATE OR REPLACE VIEW gold_personas AS SELECT *{extra_personas} FROM read_parquet('{personas_path.as_posix()}')")
    else:
        con.execute("CREATE OR REPLACE VIEW gold_personas AS SELECT '' AS id_cliente, 'Turista Eventual' AS persona")

    if clientes_path.exists():
        clientes_cols = [r[0] for r in con.execute(f"DESCRIBE SELECT * FROM read_parquet('{clientes_path.as_posix()}')").fetchall()]
        extra_clientes = "" if "tier_fidelidade" in clientes_cols else ", 'Basico' AS tier_fidelidade"
        con.execute(f"CREATE OR REPLACE VIEW silver_clientes AS SELECT *{extra_clientes} FROM read_parquet('{clientes_path.as_posix()}')")
    else:
        con.execute("CREATE OR REPLACE VIEW silver_clientes AS SELECT '' AS id_cliente, 'Basico' AS tier_fidelidade")

    # 3. Query: Top 5 clientes prioritários por voo + passageiros com risco financeiro / ROI negativo / Veto de Política
    query = """
        WITH ranked AS (
            SELECT 
                g.*,
                COALESCE(s.tier_fidelidade, 'Basico') AS tier_fidelidade,
                COALESCE(p.persona, 'Turista Eventual') AS persona,
                COALESCE(e.risco_evasao, 0.0) AS risco_evasao,
                COALESCE(e.score_atrito_acumulado, 0.0) AS score_atrito_acumulado,
                COALESCE(c.clv_previsto, 0.0) AS clv_previsto,
                COALESCE(c.clv_previsto, 0.0) * COALESCE(e.risco_evasao, 0.0) AS valor_em_risco,
                ROW_NUMBER() OVER(
                    PARTITION BY g.numero_voo 
                    ORDER BY (COALESCE(c.clv_previsto, 0.0) * COALESCE(e.risco_evasao, 0.0)) DESC, g.id_cliente
                ) AS ranking_voo
            FROM gold_contexto_passageiro g
            LEFT JOIN gold_evasao e ON g.id_cliente = e.id_cliente
            LEFT JOIN gold_clv c ON g.id_cliente = c.id_cliente
            LEFT JOIN gold_personas p ON g.id_cliente = p.id_cliente
            LEFT JOIN silver_clientes s ON g.id_cliente = s.id_cliente
            WHERE g.numero_voo IS NOT NULL 
              AND TRIM(g.numero_voo) != ''
              AND (
                  g.llm_mensagem_comissaria IS NULL 
                  OR TRIM(COALESCE(g.llm_mensagem_comissaria, '')) = ''
                  OR g.llm_mensagem_comissaria LIKE '[GERADO VIA BATCH]%'
                  OR (
                      g.llm_mensagem_comissaria NOT LIKE 'Decisão Analítica:%'
                      AND COALESCE(s.tier_fidelidade, 'Basico') IN ('Basico', 'Básico')
                      AND COALESCE(e.score_atrito_acumulado, 0.0) <= 0.0
                      AND (g.contexto_narrativo_llm IS NULL OR g.contexto_narrativo_llm = 'Sem ocorrências recentes')
                  )
              )
        )
        SELECT * FROM ranked
        WHERE ranking_voo <= 5
           OR ((COALESCE(clv_previsto, 0.0) * COALESCE(risco_evasao, 0.0) * 0.15) - 5.0 <= 0)
           OR (
               (tier_fidelidade IN ('Basico', 'Básico') OR persona = 'Turista Eventual')
               AND score_atrito_acumulado <= 0.0
               AND (contexto_narrativo_llm IS NULL OR contexto_narrativo_llm = 'Sem ocorrências recentes')
           )
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
        nome_cliente = (
            pax.get("nome")
            or pax.get("passageiro")
            or (pax.get("dados_cliente") or {}).get("nome")
            or gerar_nome_passageiro(str(pax.get("id_cliente") or ""))
        )
        contexto_passageiro = str(pax.get("contexto_narrativo_llm") or "Sem ocorrências recentes")

        # Resolve ação recomendada a partir do contexto ou perfil
        perfil = {
            "id_cliente": str(pax.get("id_cliente")),
            "nome": nome_cliente,
            "contexto_narrativo_llm": contexto_passageiro,
            "tier_fidelidade": str(pax.get("tier_fidelidade") or "Basico"),
            "persona": str(pax.get("persona") or "Turista Eventual"),
            "clv_previsto": float(pax.get("clv_previsto") or 0.0),
            "risco_evasao": float(pax.get("risco_evasao") or 0.0),
            "score_atrito_acumulado": float(pax.get("score_atrito_acumulado") or 0.0),
            "ssr_codigo": pax.get("ssr_codigo"),
            "sac_motivo": pax.get("sac_motivo"),
            "tem_sac": pax.get("tem_sac"),
            "tem_alerta_bagagem": pax.get("tem_alerta_bagagem"),
        }
        decisao = arbitrar_acao_bordo(perfil)
        retorno_liquido = float(decisao.get("retorno_liquido") or 0.0)
        acao_tecnica = decisao.get("acao_vencedora", "ABORDAGEM_CHEFE_CABINE")
        rotulo_acao = ROTULOS_ACOES_BORDO.get(acao_tecnica, acao_tecnica)
        custo_acao = float(decisao.get("custo_acao") or 0.0)
        motivo_bloqueio = decisao.get("motivo_bloqueio")

        # Regra Estrita de Trava do LLM (Economia de Tokens / Proteção de Caixa):
        # Se Retorno_Liquido <= 0 ou Veto por Política Comercial, o sistema NÃO deve chamar o OpenRouter (Gemini).
        if decisao.get("tipo_veto") == "POLITICA" or motivo_bloqueio == MENSAGEM_VETO_POLITICA:
            acao_vencedora = "Nenhuma Ação"
            custo_acao = 0.0
            retorno_liquido = 0.0
            mensagem = MENSAGEM_VETO_POLITICA
            mensagem_offboard = MENSAGEM_VETO_POLITICA
        elif retorno_liquido <= 0.0 or acao_tecnica in ("NENHUMA_ACAO", "Nenhuma Ação") or rotulo_acao == "Nenhuma Ação":
            acao_vencedora = "Nenhuma Ação"
            custo_acao = 0.0
            retorno_liquido = 0.0
            mensagem = FALLBACK_ROI_NEGATIVO
            mensagem_offboard = FALLBACK_ROI_NEGATIVO
        else:
            acao_vencedora = rotulo_acao
            curr_msg = str(pax.get("llm_mensagem_comissaria") or "").strip()
            curr_off = str(pax.get("mensagem_llm_offboard") or "").strip()

            if curr_msg.startswith("[RAG: Azul Fidelidade Res. 400]"):
                mensagem = curr_msg
            else:
                try:
                    mensagem = llm_client.gerar_instrucao_comissaria(
                        nome_cliente=nome_cliente,
                        contexto_passageiro=contexto_passageiro,
                        acao_vencedora=rotulo_acao,
                    )
                except Exception as exc:
                    logger.warning(
                        "Falha na inferência LLM para cliente %s (%s). Injetando fallback de segurança.",
                        pax.get("id_cliente"),
                        exc,
                    )
                    mensagem = FALLBACK_SEGURANCA_TIER

            if curr_off.startswith("[RAG: Azul Fidelidade Res. 400]"):
                mensagem_offboard = curr_off
            else:
                try:
                    mensagem_offboard = llm_client.gerar_mensagem_offboard(
                        nome_cliente=nome_cliente,
                        contexto_passageiro=contexto_passageiro,
                        acao_vencedora=rotulo_acao,
                    )
                except Exception as exc:
                    logger.warning(
                        "Falha na inferência LLM off-board para cliente %s (%s). Injetando fallback de segurança.",
                        pax.get("id_cliente"),
                        exc,
                    )
                    mensagem_offboard = FALLBACK_OFFBOARD

        staging_records.append({
            "id_cliente": pax["id_cliente"],
            "acao_vencedora": acao_vencedora,
            "custo_acao": custo_acao,
            "llm_mensagem_comissaria": mensagem,
            "mensagem_llm_offboard": mensagem_offboard,
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
                CASE
                    WHEN s.id_cliente IS NOT NULL THEN s.acao_vencedora
                    WHEN {("g.llm_mensagem_comissaria LIKE 'Decisão Analítica:%' OR g.llm_mensagem_comissaria LIKE '%Intervenção cancelada%' OR g.llm_mensagem_comissaria LIKE '%Veto%'" if has_llm_col else "FALSE")} THEN 'Nenhuma Ação'
                    ELSE {("g.acao_vencedora" if has_acao_col else "CAST(NULL AS VARCHAR)")}
                END AS acao_vencedora,
                CASE
                    WHEN s.id_cliente IS NOT NULL THEN s.custo_acao
                    WHEN {("g.llm_mensagem_comissaria LIKE 'Decisão Analítica:%' OR g.llm_mensagem_comissaria LIKE '%Intervenção cancelada%' OR g.llm_mensagem_comissaria LIKE '%Veto%'" if has_llm_col else "FALSE")} THEN 0.0
                    ELSE {("g.custo_acao" if has_custo_col else "CAST(NULL AS DOUBLE)")}
                END AS custo_acao,
                COALESCE(s.llm_mensagem_comissaria, {("g.llm_mensagem_comissaria" if has_llm_col else "CAST(NULL AS VARCHAR)")}) AS llm_mensagem_comissaria,
                COALESCE(s.mensagem_llm_offboard, {("g.mensagem_llm_offboard" if has_offboard_col else "CAST(NULL AS VARCHAR)")}) AS mensagem_llm_offboard,
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
