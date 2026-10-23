from __future__ import annotations

import logging
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

from back.app.config import Settings, get_settings
from back.app.core.security import get_password_hash

logger = logging.getLogger("azul.persistence.user")


class UserStore:
    """Repositório SQLite de usuários corporativos com controle de acesso RBAC."""

    def __init__(self, settings: Optional[Settings] = None) -> None:
        self.settings = settings or get_settings()
        self.db_path = self.settings.auth_db_path or (self.settings.project_root / "back" / "audit.db")
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
        """Cria a tabela de usuários caso não exista e popula contas de baseline."""
        with self._get_connection() as con:
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

                con.executemany("""
                INSERT INTO users (id, name, email, hashed_password, role, is_active)
                VALUES (?, ?, ?, ?, ?, ?);
                """, users_seed)
                logger.info("Usuários de baseline criados com sucesso no banco: gestor@azul.com.br e comissario@azul.com.br")

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

