from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict
import duckdb

from back.app.config import Settings
from back.app.core.exceptions import DataLakeError

logger = logging.getLogger("azul.analytics.catalog")


class ParquetCatalog:
    """Catálogo das fontes Parquet Silver e Gold da Azul."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.gold_dir = settings.gold_dir or (settings.data_lake_dir / "gold")
        self.silver_dir = settings.silver_dir or (settings.data_lake_dir / "silver")

    def get_source_mappings(self) -> Dict[str, Path]:
        """Retorna o mapeamento de nomes lógicos de tabelas para seus arquivos Parquet."""
        return {
            # Fontes Gold (Modelos e Feature Stores)
            "gold_clv": self.gold_dir / "clv_clientes.parquet",
            "gold_evasao": self.gold_dir / "evasao_clientes.parquet",
            "gold_personas": self.gold_dir / "personas_clientes.parquet",
            "gold_contexto_passageiro": self.gold_dir / "contexto_passageiro.parquet",
            # Fontes Silver (Entidades Normalizadas e Tabelas Satélite de CRM)
            "silver_clientes": self.silver_dir / "clientes_silver.parquet",
            "silver_viagens": self.silver_dir / "viagens_silver.parquet",
            "silver_avaliacoes": self.silver_dir / "avaliacoes_silver.parquet",
            "silver_bagagem_logs": self.silver_dir / "bagagem_logs_silver.parquet",
            "silver_ssr_logs": self.silver_dir / "ssr_logs_silver.parquet",
            "silver_sac_logs": self.silver_dir / "sac_logs_silver.parquet",
        }

    def validate_sources(self) -> None:
        """Verifica se todos os arquivos obrigatórios existem em disco (Fail-Fast)."""
        mappings = self.get_source_mappings()
        missing = [f"{name} ({path})" for name, path in mappings.items() if not path.exists()]
        if missing:
            err_msg = f"Arquivos Parquet obrigatórios ausentes no Data Lake: {', '.join(missing)}"
            logger.error(err_msg)
            raise DataLakeError(err_msg)

    def register_views(self, con: duckdb.DuckDBPyConnection) -> None:
        """Registra as views no catálogo DuckDB apontando diretamente para os arquivos Parquet."""
        self.validate_sources()
        mappings = self.get_source_mappings()

        for view_name, path in mappings.items():
            posix_path = path.resolve().as_posix()
            sql = f"CREATE OR REPLACE VIEW {view_name} AS SELECT * FROM read_parquet('{posix_path}')"
            try:
                con.execute(sql)
                logger.debug("View analítica registrada: %s -> %s", view_name, posix_path)
            except Exception as exc:
                err_msg = f"Falha ao registrar view DuckDB '{view_name}' para o arquivo {posix_path}: {exc}"
                logger.error(err_msg)
                raise DataLakeError(err_msg) from exc

        logger.info("Todas as %d views analíticas foram registradas no DuckDB.", len(mappings))
