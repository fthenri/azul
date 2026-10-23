from __future__ import annotations

from datetime import timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status

from back.app.api.dependencies import (
    CurrentUserDep,
    SettingsDep,
    UserStoreDep,
)
from back.app.core.security import create_access_token, verify_password
from back.app.schemas.auth import LoginRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["Autenticação & Controle de Acesso"])


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Realizar Login Corporativo",
    description="Autentica o colaborador da Azul e emite um token JWT com sua respectiva role ('manager' ou 'commissioner').",
)
async def login(
    payload: LoginRequest,
    settings: SettingsDep,
    user_store: UserStoreDep,
) -> TokenResponse:
    user = user_store.get_by_email(payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas: e-mail ou senha incorretos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas: e-mail ou senha incorretos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conta de usuário inativa.",
        )

    expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
    token_claims = {
        "sub": str(user["id"]),
        "email": str(user["email"]),
        "name": str(user["name"]),
        "role": str(user["role"]),
    }

    access_token = create_access_token(
        data=token_claims,
        secret_key=settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
        expires_delta=expires_delta,
    )

    user_out = UserOut(
        id=str(user["id"]),
        name=str(user["name"]),
        email=str(user["email"]),
        role=str(user["role"]),
        is_active=bool(user["is_active"]),
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=int(expires_delta.total_seconds()),
        role=user_out.role,
        user=user_out,
    )


@router.get(
    "/me",
    response_model=UserOut,
    summary="Obter Dados do Usuário Autenticado",
    description="Retorna os dados do colaborador autenticado a partir do token JWT Bearer.",
)
async def get_current_authenticated_user(
    current_user: CurrentUserDep,
) -> UserOut:
    return current_user


@router.get(
    "/users",
    response_model=List[UserOut],
    summary="Listar Contas de Demonstração",
    description="Retorna as contas de baseline criadas para demonstração e avaliação da banca.",
)
async def list_demo_users(user_store: UserStoreDep) -> List[UserOut]:
    users = user_store.list_users()
    return [
        UserOut(
            id=str(u["id"]),
            name=str(u["name"]),
            email=str(u["email"]),
            role=str(u["role"]),
            is_active=bool(u["is_active"]),
        )
        for u in users
    ]

