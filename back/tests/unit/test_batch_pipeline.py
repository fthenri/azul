from __future__ import annotations

from pathlib import Path
import duckdb
import pandas as pd
import pytest

from back.batch_pipeline import (
    FALLBACK_SEGURANCA_TIER,
    build_prompt_for_passenger,
    run_batch_pipeline,
)


def test_build_prompt_for_passenger_valid() -> None:
    pax = {
        "id_cliente": "AZUL_123",
        "numero_voo": "AD4409",
        "pnr": "ABC1234",
        "contexto_narrativo_llm": "Bagagem atrasada WorldTracer",
    }
    prompt = build_prompt_for_passenger(pax)
    assert "AZUL_123" in prompt
    assert "AD4409" in prompt
    assert "Bagagem atrasada WorldTracer" in prompt


def test_build_prompt_for_passenger_empty_trigger() -> None:
    # Cenários que devem gerar prompt vazio para testar Graceful Degradation
    assert build_prompt_for_passenger({"id_cliente": "AZUL_1", "contexto_narrativo_llm": ""}) == ""
    assert build_prompt_for_passenger({"id_cliente": "AZUL_1", "contexto_narrativo_llm": None}) == ""
    assert build_prompt_for_passenger({"id_cliente": "AZUL_1", "contexto_narrativo_llm": "EMPTY_PROMPT"}) == ""
    assert build_prompt_for_passenger({"id_cliente": "", "contexto_narrativo_llm": "Contexto valido"}) == ""


def test_batch_pipeline_end_to_end_and_idempotency(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    """Testa isolamento (staging), graceful degradation, upsert no DuckDB e idempotência."""
    gold_dir = tmp_path / "gold"
    silver_dir = tmp_path / "silver"
    gold_dir.mkdir(parents=True)
    silver_dir.mkdir(parents=True)

    gold_file = gold_dir / "contexto_passageiro.parquet"

    # Cria tabela Gold inicial com 3 registros:
    # 1. Normal com contexto
    # 2. Com trigger EMPTY_PROMPT (para forçar Graceful Degradation)
    # 3. Normal sem ocorrência recente
    initial_data = pd.DataFrame([
        {
            "id_cliente": "CLI_001",
            "pnr": "PNR001",
            "numero_voo": "4409",
            "tem_alerta_bagagem": True,
            "bagagem_codigo_rastreio": "VCP1234",
            "bagagem_status": "LOCALIZADA",
            "tem_ssr": False,
            "ssr_codigo": "",
            "ssr_descricao": "",
            "tem_sac": False,
            "sac_protocolo": "",
            "sac_motivo": "",
            "sac_status": "",
            "contexto_narrativo_llm": "Bagagem localizada em trânsito",
            "data_atualizacao": "2026-10-26T00:00:00Z",
        },
        {
            "id_cliente": "CLI_002",
            "pnr": "PNR002",
            "numero_voo": "4409",
            "tem_alerta_bagagem": False,
            "bagagem_codigo_rastreio": "",
            "bagagem_status": "",
            "tem_ssr": False,
            "ssr_codigo": "",
            "ssr_descricao": "",
            "tem_sac": False,
            "sac_protocolo": "",
            "sac_motivo": "",
            "sac_status": "",
            "contexto_narrativo_llm": "EMPTY_PROMPT",  # Simula erro de prompt para disparar graceful degradation
            "data_atualizacao": "2026-10-26T00:00:00Z",
        },
        {
            "id_cliente": "CLI_003",
            "pnr": "PNR003",
            "numero_voo": "4409",
            "tem_alerta_bagagem": False,
            "bagagem_codigo_rastreio": "",
            "bagagem_status": "",
            "tem_ssr": True,
            "ssr_codigo": "PETC",
            "ssr_descricao": "Pet em cabine",
            "tem_sac": False,
            "sac_protocolo": "",
            "sac_motivo": "",
            "sac_status": "",
            "contexto_narrativo_llm": "Pet em cabine",
            "data_atualizacao": "2026-10-26T00:00:00Z",
        },
    ])
    initial_data.to_parquet(gold_file, engine="pyarrow", index=False)

    # Cria tabelas Gold auxiliares de CLV e Evasão para o cálculo financeiro
    pd.DataFrame([
        {"id_cliente": "CLI_001", "clv_previsto": 10000.0},
        {"id_cliente": "CLI_002", "clv_previsto": 8000.0},
        {"id_cliente": "CLI_003", "clv_previsto": 12000.0},
    ]).to_parquet(gold_dir / "clv_clientes.parquet", engine="pyarrow", index=False)

    pd.DataFrame([
        {"id_cliente": "CLI_001", "risco_evasao": 0.40},
        {"id_cliente": "CLI_002", "risco_evasao": 0.35},
        {"id_cliente": "CLI_003", "risco_evasao": 0.50},
    ]).to_parquet(gold_dir / "evasao_clientes.parquet", engine="pyarrow", index=False)

    # 1ª Execução: deve processar os 3 registros
    res1 = run_batch_pipeline(data_lake_dir=tmp_path, delay_seconds=0.0)
    assert res1["registros_processados"] == 3

    # Valida logs no stdout
    captured1 = capsys.readouterr()
    assert "Iniciando Lote" in captured1.out
    assert "Registros processados: 3" in captured1.out
    assert "Upsert concluído no Data Lake" in captured1.out

    # Valida arquivo de staging criado
    staging_file = silver_dir / "silver_llm_staging.parquet"
    assert staging_file.exists()
    staging_df = pd.read_parquet(staging_file)
    assert len(staging_df) == 3

    # Valida tabela Gold atualizada via DuckDB
    con = duckdb.connect()
    gold_res = con.execute(f"SELECT id_cliente, llm_mensagem_comissaria FROM read_parquet('{gold_file.as_posix()}') ORDER BY id_cliente").df()

    # CLI_001 e CLI_003 receberam a mensagem da LLM (Mock ou Real com prefixo RAG)
    val_cli1 = gold_res.loc[gold_res["id_cliente"] == "CLI_001", "llm_mensagem_comissaria"].values[0]
    val_cli3 = gold_res.loc[gold_res["id_cliente"] == "CLI_003", "llm_mensagem_comissaria"].values[0]
    assert "[GERADO VIA BATCH]" in val_cli1 or "[RAG: Azul Fidelidade Res. 400]" in val_cli1
    assert "[GERADO VIA BATCH]" in val_cli3 or "[RAG: Azul Fidelidade Res. 400]" in val_cli3

    # CLI_002 disparou Graceful Degradation devido ao prompt vazio
    assert gold_res.loc[gold_res["id_cliente"] == "CLI_002", "llm_mensagem_comissaria"].values[0] == FALLBACK_SEGURANCA_TIER

    # 2ª Execução: IDEMPOTÊNCIA ESTRITA (0 registros devem ser processados)
    res2 = run_batch_pipeline(data_lake_dir=tmp_path, delay_seconds=0.0)
    assert res2["registros_processados"] == 0

    captured2 = capsys.readouterr()
    assert "Iniciando Lote" in captured2.out
    assert "Registros processados: 0" in captured2.out
    assert "Upsert concluído no Data Lake" in captured2.out

