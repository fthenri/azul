from __future__ import annotations

import logging
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from back.app.config import Settings, get_settings
from back.app.schemas.audit import DecisaoAuditoria, VersaoModelos

logger = logging.getLogger("azul.persistence.audit")

_audit_init_lock = threading.Lock()
_initialized_audit_dbs: set[str] = set()


class AuditStore:
    """Repositório de persistência transacional em SQLite para logs de auditoria e governança."""

    def __init__(self, settings: Optional[Settings] = None) -> None:
        self.settings = settings or get_settings()
        self.db_path = self.settings.audit_db_path or (self.settings.project_root / "back" / "audit.db")
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.init_db()

    def _get_connection(self) -> sqlite3.Connection:
        """Cria uma conexão com suporte a concorrência e timeout para escrita."""
        con = sqlite3.connect(
            str(self.db_path),
            check_same_thread=False,
            timeout=30.0,
        )
        con.row_factory = sqlite3.Row
        return con

    def init_db(self) -> None:
        """Cria as tabelas de auditoria se não existirem e insere registros de baseline."""
        db_key = str(self.db_path.resolve())
        if db_key in _initialized_audit_dbs:
            return

        with _audit_init_lock:
            if db_key in _initialized_audit_dbs:
                return

            with self._get_connection() as con:
                con.execute("PRAGMA journal_mode=WAL;")
                con.execute("""
                CREATE TABLE IF NOT EXISTS decisoes_auditoria (
                    decisao_id TEXT PRIMARY KEY,
                    cliente_id TEXT NOT NULL,
                    data_decisao TEXT NOT NULL,
                    tipo_simulacao TEXT NOT NULL,
                    acao_executada TEXT NOT NULL,
                    motivo_bloqueio TEXT,
                    custo_realizado REAL NOT NULL,
                    versao_clv TEXT NOT NULL,
                    versao_churn TEXT NOT NULL,
                    versao_llm TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """)

                # Seed do registro de referência de contract.md caso o banco esteja vazio
                cur = con.execute("SELECT count(*) FROM decisoes_auditoria")
                if cur.fetchone()[0] == 0:
                    try:
                        con.execute("""
                        INSERT OR IGNORE INTO decisoes_auditoria (
                            decisao_id, cliente_id, data_decisao, tipo_simulacao,
                            acao_executada, motivo_bloqueio, custo_realizado,
                            versao_clv, versao_churn, versao_llm
                        ) VALUES (
                            'dec_456',
                            'cli_123',
                            '2026-10-20T14:30:00Z',
                            'Reativa',
                            'Bloqueada pelo Árbitro',
                            'Janela de silêncio de 72h (Cliente já acionado recentemente)',
                            0.00,
                            'v1.2',
                            'v2.0',
                            'gpt-4o-mini-rag'
                        )
                        """)
                        logger.info("Registro de baseline 'dec_456' inserido na auditoria SQLite.")
                    except sqlite3.IntegrityError:
                        logger.debug("Registro de baseline de auditoria já inserido.")

            _initialized_audit_dbs.add(db_key)

    def save_decision(self, decision: DecisaoAuditoria) -> None:
        """Persiste um novo registro de auditoria."""
        sql = """
        INSERT OR REPLACE INTO decisoes_auditoria (
            decisao_id, cliente_id, data_decisao, tipo_simulacao,
            acao_executada, motivo_bloqueio, custo_realizado,
            versao_clv, versao_churn, versao_llm
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        params = (
            decision.decisao_id,
            decision.cliente_id,
            decision.data_decisao,
            decision.tipo_simulacao,
            decision.acao_executada,
            decision.motivo_bloqueio,
            decision.custo_realizado,
            decision.versao_modelos.clv,
            decision.versao_modelos.churn,
            decision.versao_modelos.llm,
        )
        with self._get_connection() as con:
            con.execute(sql, params)
            logger.info("Decisão de auditoria '%s' salva no SQLite.", decision.decisao_id)

    def get_decision(self, decisao_id: str) -> Optional[DecisaoAuditoria]:
        """Recupera uma decisão específica por ID."""
        sql = "SELECT * FROM decisoes_auditoria WHERE decisao_id = ?"
        with self._get_connection() as con:
            row = con.execute(sql, (decisao_id,)).fetchone()
            if not row:
                return None
            return DecisaoAuditoria(
                decisao_id=row["decisao_id"],
                cliente_id=row["cliente_id"],
                data_decisao=row["data_decisao"],
                tipo_simulacao=row["tipo_simulacao"],
                acao_executada=row["acao_executada"],
                motivo_bloqueio=row["motivo_bloqueio"],
                custo_realizado=float(row["custo_realizado"]),
                versao_modelos=VersaoModelos(
                    clv=row["versao_clv"],
                    churn=row["versao_churn"],
                    llm=row["versao_llm"],
                ),
            )

    def list_decisions(self, limit: int = 100, offset: int = 0) -> List[DecisaoAuditoria]:
        """Lista as decisões ordenadas pela mais recente."""
        sql = "SELECT * FROM decisoes_auditoria ORDER BY data_decisao DESC LIMIT ? OFFSET ?"
        with self._get_connection() as con:
            rows = con.execute(sql, (limit, offset)).fetchall()
            return [
                DecisaoAuditoria(
                    decisao_id=row["decisao_id"],
                    cliente_id=row["cliente_id"],
                    data_decisao=row["data_decisao"],
                    tipo_simulacao=row["tipo_simulacao"],
                    acao_executada=row["acao_executada"],
                    motivo_bloqueio=row["motivo_bloqueio"],
                    custo_realizado=float(row["custo_realizado"]),
                    versao_modelos=VersaoModelos(
                        clv=row["versao_clv"],
                        churn=row["versao_churn"],
                        llm=row["versao_llm"],
                    ),
                )
                for row in rows
            ]


_audit_store_instance: Optional[AuditStore] = None
_audit_store_lock = threading.Lock()


def get_audit_store(settings: Optional[Settings] = None) -> AuditStore:
    """Retorna uma instância singleton gerenciada do AuditStore."""
    global _audit_store_instance
    resolved_settings = settings or get_settings()
    target_path = resolved_settings.audit_db_path or (resolved_settings.project_root / "back" / "audit.db")
    with _audit_store_lock:
        if _audit_store_instance is None or _audit_store_instance.db_path != target_path:
            _audit_store_instance = AuditStore(settings=resolved_settings)
    return _audit_store_instance
