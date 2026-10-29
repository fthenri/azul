from __future__ import annotations

import os
import pytest
from unittest.mock import MagicMock, patch

from back.app.infrastructure.ai.real_llm_client import (
    FALLBACK_OFFBOARD,
    FALLBACK_PADRAO_TIER,
    RealLLMClient,
    get_real_llm_client,
)


def test_real_llm_client_empty_prompt_returns_fallback() -> None:
    """Valida que prompt vazio retorna fallback sem quebrar a execução."""
    client = RealLLMClient(api_key="sk-test")
    assert client.generate("") == FALLBACK_PADRAO_TIER
    assert client.generate("   \n\t  ") == FALLBACK_PADRAO_TIER
    assert client.generate(None) == FALLBACK_PADRAO_TIER  # type: ignore


def test_real_llm_client_fallback_on_api_error() -> None:
    """Valida o bloco try/except com fallback padrão quando ocorre erro na API."""
    client = RealLLMClient(api_key="sk-invalid-test-key")
    with patch.object(client.client.chat.completions, "create", side_effect=Exception("API Error")):
        result = client.generate("Prompt de teste")
        assert result == FALLBACK_PADRAO_TIER


def test_real_llm_client_generation_with_prefix() -> None:
    """Valida formatação do prefixo obrigatório na resposta do LLM."""
    client = RealLLMClient(api_key="sk-test")
    mock_response = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = "Sr. João, cliente Diamante, agradeça a preferência e ofereça serviço de bordo prioritário."
    mock_response.choices = [mock_choice]

    with patch.object(client.client.chat.completions, "create", return_value=mock_response):
        result = client.gerar_instrucao_comissaria(
            nome_cliente="João Silva",
            contexto_passageiro="Cliente Diamante",
            acao_vencedora="Bebida Premium Cortesia",
        )
        assert result.startswith("[RAG: Azul Fidelidade Res. 400] ")
        assert "Sr. João" in result


def test_real_llm_client_offboard_generation() -> None:
    """Valida a geração de mensagem de WhatsApp off-board com prefixo obrigatório."""
    client = RealLLMClient(api_key="sk-test")
    mock_response = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = "Olá, Lucas Pereira! Sentimos muito pelo ocorrido com sua bagagem. Segue voucher de 1000 pontos. ✈️💙"
    mock_response.choices = [mock_choice]

    with patch.object(client.client.chat.completions, "create", return_value=mock_response):
        result = client.gerar_mensagem_offboard(
            nome_cliente="Lucas Pereira",
            contexto_passageiro="Atraso de bagagem resolvido",
            acao_vencedora="Acolhimento Pessoal + Voucher 1000pts",
        )
        assert result.startswith("[RAG: Azul Fidelidade Res. 400] ")
        assert "Lucas Pereira" in result


def test_real_llm_client_offboard_fallback() -> None:
    """Valida fallback seguro na geração off-board em caso de erro na API."""
    client = RealLLMClient(api_key="sk-test")
    with patch.object(client.client.chat.completions, "create", side_effect=Exception("API Error")):
        result = client.gerar_mensagem_offboard(
            nome_cliente="Lucas Pereira",
            contexto_passageiro="Atraso de bagagem",
            acao_vencedora="Voucher",
        )
        assert result == FALLBACK_OFFBOARD


def test_get_real_llm_client_factory() -> None:
    """Valida a fábrica de instância get_real_llm_client."""
    client = get_real_llm_client()
    assert isinstance(client, RealLLMClient)

