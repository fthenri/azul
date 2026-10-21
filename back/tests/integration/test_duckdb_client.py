from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import pytest

from back.app.config import Settings
from back.app.core.exceptions import DataLakeError
from back.app.infrastructure.analytics.duckdb_client import DuckDBClient
from back.app.infrastructure.analytics.parquet_catalog import ParquetCatalog


def test_duckdb_views_registration_and_counts(test_settings: Settings) -> None:
    """Valida se o DuckDB registra todas as views e consegue consultar os Parquets reais."""
    client = DuckDBClient(settings=test_settings)
    client.initialize()

    # Consulta contagem da camada Gold
    total_clv = client.query_scalar("SELECT count(*) FROM gold_clv")
    assert total_clv == 5000

    total_evasao = client.query_scalar("SELECT count(*) FROM gold_evasao")
    assert total_evasao == 5000

    total_personas = client.query_scalar("SELECT count(*) FROM gold_personas")
    assert total_personas == 5000

    # Consulta contagem da camada Silver
    total_viagens = client.query_scalar("SELECT count(*) FROM silver_viagens")
    assert total_viagens > 0

    client.close()


def test_duckdb_analytical_join_query(test_settings: Settings) -> None:
    """Valida queries analíticas com JOIN e agregações estatísticas."""
    client = DuckDBClient(settings=test_settings)
    client.initialize()

    sql = """
    SELECT 
        p.persona,
        count(*) as total_clientes,
        round(avg(c.clv_previsto), 2) as media_clv,
        round(avg(e.risco_evasao), 4) as media_risco
    FROM gold_clv c
    JOIN gold_evasao e ON c.id_cliente = e.id_cliente
    JOIN gold_personas p ON c.id_cliente = p.id_cliente
    GROUP BY p.persona
    ORDER BY total_clientes DESC
    """
    rows = client.query(sql)
    assert len(rows) > 0
    for r in rows:
        assert "persona" in r
        assert r["total_clientes"] > 0
        assert r["media_clv"] > 0
        assert 0.0 <= r["media_risco"] <= 1.0

    client.close()


def test_duckdb_fail_fast_on_missing_parquet(tmp_path: Path) -> None:
    """Valida se o catálogo levanta DataLakeError ao tentar registrar diretório vazio."""
    fake_settings = Settings(
        project_root=tmp_path,
        data_lake_dir=tmp_path / "empty_lake",
        gold_dir=tmp_path / "empty_lake" / "gold",
        silver_dir=tmp_path / "empty_lake" / "silver",
    )
    catalog = ParquetCatalog(fake_settings)
    with pytest.raises(DataLakeError):
        catalog.validate_sources()


def test_duckdb_concurrent_threads_safety(test_settings: Settings) -> None:
    """Verifica se múltiplas threads executando queries em paralelo mantêm isolamento e integridade."""
    client = DuckDBClient(settings=test_settings)
    client.initialize()

    def run_query(idx: int) -> int:
        return client.query_scalar(f"SELECT {idx} + count(*) FROM gold_clv")

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(run_query, i) for i in range(10)]
        results = [f.result() for f in futures]

    assert len(results) == 10
    for i, res in enumerate(results):
        assert res == i + 5000

    client.close()
