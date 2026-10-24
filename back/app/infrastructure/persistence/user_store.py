from __future__ import annotations

import logging
import sqlite3
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional

from back.app.config import Settings, get_settings
from back.app.core.security import get_password_hash

logger = logging.getLogger("azul.persistence.user")

_db_init_lock = threading.Lock()
_initialized_dbs: set[str] = set()


class UserStore:
    """Repositório SQLite de usuários corporativos com controle de acesso RBAC."""

    def __init__(self, settings: Optional[Settings] = None) -> None:
        self.settings = settings or get_settings()
        self.db_path = (
            self.settings.auth_db_path
            or self.settings.audit_db_path
            or (self.settings.project_root / "back" / "audit.db")
        )
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.init_db()

    def _get_connection(self) -> sqlite3.Connection:
        """Cria conexão SQLite otimizada para concorrência."""
        con = sqlite3.connect(
            str(self.db_path),
            check_same_thread=False,
            timeout=30.0,
        )
        con.row_factory = sqlite3.Row
        return con

    def init_db(self) -> None:
        """Cria a tabela de usuários caso não exista e popula contas de baseline de forma thread-safe."""
        db_key = str(self.db_path.resolve())
        if db_key in _initialized_dbs:
            return

        with _db_init_lock:
            if db_key in _initialized_dbs:
                return

            with self._get_connection() as con:
                con.execute("PRAGMA journal_mode=WAL;")
                con.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    hashed_password TEXT NOT NULL,
                    role TEXT NOT NULL CHECK(role IN ('manager', 'commissioner')),
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """)

                # Seed automático para avaliação e demonstração
                cur = con.execute("SELECT count(*) FROM users")
                if cur.fetchone()[0] == 0:
                    default_password_hash = get_password_hash("azul1234")

                    users_seed = [
                        (
                            "usr_manager_01",
                            "Carlos Silveira (Gestor CRM)",
                            "gestor@azul.com.br",
                            default_password_hash,
                            "manager",
                            1,
                        ),
                        (
                            "usr_commissioner_01",
                            "Mariana Souza (Chefe de Cabine)",
                            "comissario@azul.com.br",
                            default_password_hash,
                            "commissioner",
                            1,
                        ),
                    ]

                    try:
                        con.executemany("""
                        INSERT OR IGNORE INTO users (id, name, email, hashed_password, role, is_active)
                        VALUES (?, ?, ?, ?, ?, ?);
                        """, users_seed)
                        logger.info("Usuários de baseline criados com sucesso no banco: gestor@azul.com.br e comissario@azul.com.br")
                    except sqlite3.IntegrityError:
                        logger.debug("Usuários de baseline já inseridos concorrentemente.")

            _initialized_dbs.add(db_key)

    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Busca usuário pelo endereço de e-mail (case-insensitive)."""
        sql = "SELECT * FROM users WHERE lower(email) = lower(?) LIMIT 1"
        with self._get_connection() as con:
            row = con.execute(sql, (email.strip(),)).fetchone()
            return dict(row) if row else None

    def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Busca usuário pelo identificador único."""
        sql = "SELECT * FROM users WHERE id = ? LIMIT 1"
        with self._get_connection() as con:
            row = con.execute(sql, (user_id,)).fetchone()
            return dict(row) if row else None

    def list_users(self) -> List[Dict[str, Any]]:
        """Lista todos os usuários cadastrados."""
        sql = "SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at ASC"
        with self._get_connection() as con:
            rows = con.execute(sql).fetchall()
            return [dict(r) for r in rows]


_user_store_instance: Optional[UserStore] = None
_store_lock = threading.Lock()


def get_user_store(settings: Optional[Settings] = None) -> UserStore:
    """Retorna uma instância singleton gerenciada do UserStore."""
    global _user_store_instance
    resolved_settings = settings or get_settings()
    target_path = (
        resolved_settings.auth_db_path
        or resolved_settings.audit_db_path
        or (resolved_settings.project_root / "back" / "audit.db")
    )
    with _store_lock:
        if _user_store_instance is None or _user_store_instance.db_path != target_path:
            _user_store_instance = UserStore(settings=resolved_settings)
    return _user_store_instance
