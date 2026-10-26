from __future__ import annotations

import logging
import os
from typing import Optional
from dotenv import load_dotenv
from openai import OpenAI

logger = logging.getLogger("azul.ai.real_client")

# Constantes de configuração e prompts oficiais
SYSTEM_PROMPT_AZUL = (
    "Você é o motor de CRM de bordo da Azul. Redija a instrução de abordagem para a comissária "
    "de forma empática e direta (máximo de 3 linhas), cruzando o contexto do cliente com a ação recomendada. "
    "Sua resposta DEVE começar obrigatoriamente com o prefixo exato: \"[RAG: Azul Fidelidade Res. 400] \"."
)

FALLBACK_PADRAO_TIER = "Instrução pendente. Siga o protocolo padrão do Tier."
MODELO_DEFAULT = "google/gemini-2.5-flash"


class RealLLMClient:
    """Cliente LLM corporativo integrado à API OpenRouter utilizando Google Gemini 2.5 Flash."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://openrouter.ai/api/v1",
        model: str = MODELO_DEFAULT,
        timeout: float = 30.0,
    ) -> None:
        load_dotenv()
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        self.base_url = base_url
        self.model = model
        self.timeout = timeout

        self.client = OpenAI(
            base_url=self.base_url,
            api_key=self.api_key or "sk-dummy",
            timeout=self.timeout,
            default_headers={
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Azul Fidelidade",
            },
        )

    def generate(self, prompt: str) -> str:
        """Gera a instrução tática de bordo via OpenRouter / Gemini 2.5 Flash.

        Args:
            prompt: Texto do contexto do cliente e ação prescrita.

        Returns:
            String contendo a instrução iniciada por '[RAG: Azul Fidelidade Res. 400] ',
            ou fallback corporativo seguro em caso de falha.
        """
        if not prompt or not str(prompt).strip():
            return FALLBACK_PADRAO_TIER

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT_AZUL},
                    {"role": "user", "content": str(prompt).strip()},
                ],
                temperature=0.3,
                max_tokens=200,
            )
            raw_text = response.choices[0].message.content or ""
            texto = raw_text.strip()

            prefixo = "[RAG: Azul Fidelidade Res. 400] "
            if not texto.startswith(prefixo):
                texto = f"{prefixo}{texto}"

            return texto
        except Exception as exc:
            logger.warning(
                "Falha na comunicação com OpenRouter (%s: %s). Aplicando fallback seguro.",
                type(exc).__name__,
                exc,
            )
            return FALLBACK_PADRAO_TIER


def get_real_llm_client() -> RealLLMClient:
    """Fábrica para obtenção de instância do cliente LLM real."""
    return RealLLMClient()

