from __future__ import annotations

import logging
import os
import time

logger = logging.getLogger("azul.ai.mock_client")


class EmptyPromptError(ValueError):
    """Exceção levantada quando o prompt para geração de LLM está vazio."""
    pass


class MockLLMClient:
    """Simulador corporativo de cliente LLM para inferência em lote (Batch Processing)."""

    def __init__(self, delay_seconds: float | None = None) -> None:
        """Inicializa o cliente LLM com simulação de delay de rede configurável.
        
        Por padrão simula 1 segundo de latência de rede (time.sleep(1)) conforme especificação.
        Permite override via parâmetro ou variável de ambiente MOCK_LLM_DELAY_SECONDS.
        """
        if delay_seconds is not None:
            self.delay_seconds = delay_seconds
        else:
            env_val = os.getenv("MOCK_LLM_DELAY_SECONDS")
            self.delay_seconds = float(env_val) if env_val is not None else 1.0

    def generate(self, prompt: str) -> str:
        """Gera a instrução tática baseada no contexto recebido.
        
        Args:
            prompt: Texto de contexto ou requisição para a IA.
            
        Returns:
            String formatada com a instrução de bordo gerada.
            
        Raises:
            EmptyPromptError: Se o prompt for nulo ou composto apenas por espaços em branco.
        """
        if prompt is None or not str(prompt).strip():
            raise EmptyPromptError("Prompt vazio para geração de LLM")

        if self.delay_seconds > 0:
            time.sleep(self.delay_seconds)

        return "[GERADO VIA BATCH] Instrução tática para a tripulação baseada no contexto: Acolhimento e prioridade."


def get_mock_llm_client(delay_seconds: float | None = None) -> MockLLMClient:
    """Fábrica para obtenção de instância do cliente mock LLM."""
    return MockLLMClient(delay_seconds=delay_seconds)

