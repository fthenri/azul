from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

logger = logging.getLogger("azul.core.security")

# Tenta carregar bibliotecas externas; caso não estejam disponíveis, os fallbacks nativos são ativados.
try:
    from passlib.context import CryptContext
    pwd_context: Optional[CryptContext] = CryptContext(schemes=["bcrypt"], deprecated="auto")
except Exception:
    pwd_context = None

try:
    import jwt as pyjwt
except Exception:
    pyjwt = None


# ============================================================================
# HASHING E VERIFICAÇÃO DE SENHAS
# ============================================================================

def get_password_hash(password: str) -> str:
    """Gera o hash seguro da senha com bcrypt ou PBKDF2-HMAC-SHA256 como fallback nativo."""
    if pwd_context is not None:
        try:
            return pwd_context.hash(password)
        except Exception as exc:
            logger.warning("Falha ao usar passlib bcrypt (%s). Utilizando fallback nativo PBKDF2.", exc)

    # Fallback nativo: PBKDF2 com HMAC-SHA256 e 100.000 iterações (OWASP compliant)
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return f"pbkdf2:sha256:100000${salt}${key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica se a senha em texto plano confere com o hash armazenado."""
    if hashed_password.startswith("pbkdf2:sha256:"):
        try:
            parts = hashed_password.split("$")
            if len(parts) != 3:
                return False
            params, salt, expected_hex = parts
            iterations = int(params.split(":")[2])
            calc_key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), iterations)
            return hmac.compare_digest(calc_key.hex(), expected_hex)
        except Exception as exc:
            logger.error("Erro na verificação nativa PBKDF2: %s", exc)
            return False

    if pwd_context is not None:
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception as exc:
            logger.warning("Falha ao usar passlib para verificar bcrypt: %s", exc)

    return False


# ============================================================================
# GERAÇÃO E DECODIFICAÇÃO DE TOKENS JWT
# ============================================================================

def _b64_url_encode(data: bytes) -> str:
    """Codifica bytes em Base64 URL Safe sem padding '='."""
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64_url_decode(s: str) -> bytes:
    """Decodifica string Base64 URL Safe adicionando o padding necessário."""
    rem = len(s) % 4
    if rem > 0:
        s += "=" * (4 - rem)
    return base64.urlsafe_b64decode(s)


def create_access_token(
    data: Dict[str, Any],
    secret_key: str,
    algorithm: str = "HS256",
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Gera um token JWT com claims e tempo de expiração."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=480)

    to_encode.update({
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
    })

    if pyjwt is not None:
        try:
            return pyjwt.encode(to_encode, secret_key, algorithm=algorithm)
        except Exception as exc:
            logger.warning("Falha ao codificar com pyjwt (%s). Utilizando gerador nativo.", exc)

    # Implementação padrão nativa HS256
    header = {"alg": "HS256", "typ": "JWT"}
    header_bytes = json.dumps(header, separators=(",", ":")).encode("utf-8")
    payload_bytes = json.dumps(to_encode, separators=(",", ":")).encode("utf-8")

    segments = [
        _b64_url_encode(header_bytes),
        _b64_url_encode(payload_bytes),
    ]
    signing_input = ".".join(segments).encode("utf-8")
    signature = hmac.new(secret_key.encode("utf-8"), signing_input, hashlib.sha256).digest()
    segments.append(_b64_url_encode(signature))

    return ".".join(segments)


def decode_access_token(
    token: str,
    secret_key: str,
    algorithm: str = "HS256",
) -> Dict[str, Any]:
    """Valida assinatura, formato e expiração do JWT, retornando o payload decodificado."""
    if pyjwt is not None:
        try:
            return pyjwt.decode(token, secret_key, algorithms=[algorithm])
        except Exception as exc:
            # Se for erro de expiração ou assinatura do pyjwt, propaga
            raise ValueError(f"Token JWT inválido ou expirado: {exc}") from exc

    # Validação nativa HS256
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Estrutura do JWT inválida: esperados 3 segmentos.")

    header_b64, payload_b64, sig_b64 = parts
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    expected_sig = hmac.new(secret_key.encode("utf-8"), signing_input, hashlib.sha256).digest()

    try:
        actual_sig = _b64_url_decode(sig_b64)
    except Exception as exc:
        raise ValueError("Assinatura do token corrompida.") from exc

    if not hmac.compare_digest(actual_sig, expected_sig):
        raise ValueError("Assinatura do JWT inválida.")

    try:
        payload_bytes = _b64_url_decode(payload_b64)
        payload = json.loads(payload_bytes.decode("utf-8"))
    except Exception as exc:
        raise ValueError("Payload do JWT ilegível.") from exc

    # Validação de expiração (exp claim)
    exp = payload.get("exp")
    if exp is not None:
        now_ts = datetime.now(timezone.utc).timestamp()
        if now_ts > float(exp):
            raise ValueError("Token JWT expirado.")

    return payload

