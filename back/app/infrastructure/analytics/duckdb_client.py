from __future__ import annotations

import logging
import threading
from typing import Any, Dict, List, Optional
import duckdb

from back.app.config import Settings, get_settings
from back.app.core.exceptions import DataLakeError
from back.app.infrastructure.analytics.parquet_catalog import ParquetCatalog

logger = logging.getLogger("azul.analytics.duckdb")


class DuckDBClient:
    """Cliente gerenciado para consultas OLAP vetorizadas sobre os Parquets da Azul."""

    def __init__(self, settings: Optional[Settings] = None) -> None:
        self.settings = settings or get_settings()
        self.catalog = ParquetCatalog(self.settings)
        self._connection: Optional[duckdb.DuckDBPyConnection] = None
        self._lock = threading.Lock()
        self._is_initialized = False

    def initialize(self) -> None:
        """Inicializa a conexão in-memory e registra as views do catálogo Parquet."""
        with self._lock:
            if self._is_initialized and self._connection is not None:
                return

            try:
                # Conexão base em memória para catálogo de views
                self._connection = duckdb.connect(database=":memory:", read_only=False)
                # Configurações de performance do DuckDB
                self._connection.execute("SET preserve_insertion_order=false;")
                # Registra as views analíticas
                self.catalog.register_views(self._connection)
                self._is_initialized = True
                logger.info("DuckDBClient inicializado e views Parquet registradas com sucesso.")
            except Exception as exc:
                self._is_initialized = False
                logger.exception("Falha ao inicializar o DuckDBClient: %s", exc)
                raise DataLakeError(f"Erro na inicialização do motor analítico DuckDB: {exc}") from exc

    def _ensure_initialized(self) -> duckdb.DuckDBPyConnection:
        """Garante que a conexão base está disponível."""
        if not self._is_initialized or self._connection is None:
            self.initialize()
        assert self._connection is not None
        return self._connection

    def get_cursor(self) -> duckdb.DuckDBPyConnection:
        """Retorna um cursor thread-safe derivado da conexão compartilhada."""
        base_con = self._ensure_initialized()
        return base_con.cursor()

    def query(self, sql: str, params: Optional[List[Any] | tuple] = None) -> List[Dict[str, Any]]:
        """Executa uma query analítica e retorna o resultado como uma lista de dicionários."""
        cursor = self.get_cursor()
        try:
            if params:
                cursor.execute(sql, params)
            else:
                cursor.execute(sql)

            rows = cursor.fetchall()
            if not cursor.description:
                return []

            columns = [col[0] for col in cursor.description]
            return [dict(zip(columns, row)) for row in rows]
        except Exception as exc:
            logger.error("Erro ao executar query analítica DuckDB: %s | SQL: %s", exc, sql)
            raise DataLakeError(f"Falha na consulta analítica: {exc}") from exc
        finally:
            cursor.close()

    def query_row(self, sql: str, params: Optional[List[Any] | tuple] = None) -> Optional[Dict[str, Any]]:
        """Executa query e retorna a primeira linha ou None."""
        results = self.query(sql, params)
        return results[0] if results else None

    def query_scalar(self, sql: str, params: Optional[List[Any] | tuple] = None) -> Any:
        """Executa query e retorna o valor escalar da primeira coluna da primeira linha."""
        cursor = self.get_cursor()
        try:
            if params:
                cursor.execute(sql, params)
            else:
                cursor.execute(sql)
            row = cursor.fetchone()
            return row[0] if row else None
        except Exception as exc:
            logger.error("Erro ao executar query escalar DuckDB: %s | SQL: %s", exc, sql)
            raise DataLakeError(f"Falha na consulta escalar: {exc}") from exc
        finally:
            cursor.close()

    def close(self) -> None:
        """Encerra a conexão in-memory."""
        with self._lock:
            if self._connection is not None:
                try:
                    self._connection.close()
                    logger.info("DuckDBClient encerrado com sucesso.")
                finally:
                    self._connection = None
                    self._is_initialized = False


_duckdb_client_instance: Optional[DuckDBClient] = None
_instance_lock = threading.Lock()


def get_duckdb_client(settings: Optional[Settings] = None) -> DuckDBClient:
    """Retorna uma instância singleton gerenciada do DuckDBClient."""
    global _duckdb_client_instance
    if _duckdb_client_instance is None:
        with _instance_lock:
            if _duckdb_client_instance is None:
                client = DuckDBClient(settings=settings)
                client.initialize()
                _duckdb_client_instance = client
    return _duckdb_client_instance
