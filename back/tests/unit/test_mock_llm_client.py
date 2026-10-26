from __future__ import annotations

import time
import pytest

from back.app.infrastructure.ai.mock_llm_client import (
    EmptyPromptError,
    MockLLMClient,
    get_mock_llm_client,
)


def test_mock_llm_client_generation_success() -> None:
    """Valida o formato e texto estático retornado pelo MockLLMClient."""
    client = MockLLMClient(delay_seconds=0.0)
    prompt = "Passageiro no assento 3A com mala atrasada WorldTracer."
    result = client.generate(prompt)

    assert result == "[GERADO VIA BATCH] Instrução tática para a tripulação baseada no contexto: Acolhimento e prioridade."


def test_mock_llm_client_empty_prompt_raises_exception() -> None:
    """Valida que prompt vazio dispara exceção para teste de Graceful Degradation."""
    client = MockLLMClient(delay_seconds=0.0)

    with pytest.raises((ValueError, EmptyPromptError)):
        client.generate("")

    with pytest.raises((ValueError, EmptyPromptError)):
        client.generate("   \n\t  ")

    with pytest.raises((ValueError, EmptyPromptError)):
        client.generate(None)  # type: ignore


def test_mock_llm_client_delay_simulation() -> None:
    """Valida que o cliente simula a latência de rede configurada."""
    client = MockLLMClient(delay_seconds=0.05)
    start = time.perf_counter()
    client.generate("Prompt de teste com delay")
    duration = time.perf_counter() - start

    assert duration >= 0.04


def test_get_mock_llm_client_factory() -> None:
    """Valida a fábrica de instância get_mock_llm_client."""
    client = get_mock_llm_client(delay_seconds=0.0)
    assert isinstance(client, MockLLMClient)
    assert client.delay_seconds == 0.0
