from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


RoleType = Literal["manager", "commissioner"]


class LoginRequest(BaseModel):
    """Payload de entrada para autenticação."""

    model_config = ConfigDict(extra="forbid")

    email: str = Field(..., description="E-mail corporativo do colaborador Azul", min_length=3)
    password: str = Field(..., description="Senha de acesso", min_length=4)


class UserOut(BaseModel):
    """Contrato público com os dados do usuário autenticado."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Identificador único do usuário")
    name: str = Field(..., description="Nome completo do usuário")
    email: str = Field(..., description="E-mail corporativo")
    role: RoleType = Field(..., description="Papel de acesso: 'manager' ou 'commissioner'")
    is_active: bool = Field(default=True, description="Indica se a conta está ativa")


class TokenResponse(BaseModel):
    """Resposta com o token de acesso gerado após login bem-sucedido."""

    model_config = ConfigDict(from_attributes=True)

    access_token: str = Field(..., description="Token JWT Bearer assinado")
    token_type: str = Field(default="bearer", description="Tipo de autenticação")
    expires_in: int = Field(..., description="Tempo de vida do token em segundos")
    role: RoleType = Field(..., description="Perfil de acesso do usuário")
    user: UserOut = Field(..., description="Dados do usuário logado")


class TokenPayload(BaseModel):
    """Estrutura decodificada do payload contido no JWT."""

    sub: str = Field(..., description="ID do usuário")
    email: str = Field(..., description="E-mail corporativo")
    name: str = Field(..., description="Nome do usuário")
    role: RoleType = Field(..., description="Papel concedido")
    exp: Optional[int] = Field(None, description="Timestamp Unix de expiração")
    iat: Optional[int] = Field(None, description="Timestamp Unix de emissão")

