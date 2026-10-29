from __future__ import annotations

import logging
import os
import re
from typing import Optional
from dotenv import load_dotenv
from openai import OpenAI

logger = logging.getLogger("azul.ai.real_client")

FALLBACK_PADRAO_TIER = "Instrução pendente. Siga o protocolo padrão do Tier."
FALLBACK_OFFBOARD = "Mensagem pendente. Favor acionar a régua de relacionamento padrão."
MODELO_DEFAULT = "google/gemini-2.5-flash"
PREFIXO_RAG = "[RAG: Azul Fidelidade Res. 400] "


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

    def gerar_instrucao_comissaria(
        self,
        nome_cliente: str,
        contexto_passageiro: str,
        acao_vencedora: str,
    ) -> str:
        """Gera roteiro exato (fala direta) humanizado para a comissária de bordo.

        Args:
            nome_cliente: Nome real do passageiro (ex: 'Lucas Pereira').
            contexto_passageiro: Contexto operacional (SSR, bagagem, fidelidade, etc.).
            acao_vencedora: Ação recomendada pelo árbitro matemático.

        Returns:
            Fala direta para a comissária iniciada pelo prefixo obrigatório,
            ou fallback em caso de erro.
        """
        nome_limpo = str(nome_cliente or "").strip()
        if not nome_limpo or nome_limpo.lower() in ("none", "null", "n/a"):
            nome_limpo = "Passageiro"

        ctx_limpo = str(contexto_passageiro or "Sem ocorrências recentes").strip()
        acao_limpa = str(acao_vencedora or "Atendimento humanizado prioritário").strip()

        # Validação de triggers de teste / simulação de erro
        if ctx_limpo in ("EMPTY_PROMPT", "SIMULAR_ERRO") or not ctx_limpo:
            return FALLBACK_PADRAO_TIER

        system_prompt = (
            f"Você é o motor de CRM de bordo da Azul. Escreva OBRIGATORIAMENTE o roteiro exato (fala direta) que a comissária dirá ao passageiro. "
            f"Chame-o pelo nome fornecido: {nome_limpo}. NUNCA mencione UUIDs, hashes, IDs de voo ou placeholders. "
            f"Seja elegante, empático e hospitalar (máximo 3 frases). Integre a ação recomendada de forma sutil. "
            f'Comece OBRIGATORIAMENTE com o prefixo: "[RAG: Azul Fidelidade Res. 400] ".'
        )

        user_content = (
            f"Passageiro: {nome_limpo}\n"
            f"Contexto Operacional: {ctx_limpo}\n"
            f"Ação Recomendada: {acao_limpa}\n\n"
            f"Redija a fala direta e humanizada da comissária iniciando pelo prefixo."
        )

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.3,
                max_tokens=180,
            )
            raw_text = response.choices[0].message.content or ""
            texto = raw_text.strip()

            if not texto:
                return FALLBACK_PADRAO_TIER

            # Higienização de eventuais placeholders ou UUIDs que a LLM possa alucinar
            texto = texto.replace("[Nome do Cliente]", nome_limpo)
            texto = texto.replace("[Sobrenome do Cliente]", nome_limpo.split()[-1] if nome_limpo else "")
            texto = texto.replace("[Nome]", nome_limpo)
            texto = re.sub(r"[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}", "", texto)

            if not texto.startswith(PREFIXO_RAG):
                texto = f"{PREFIXO_RAG}{texto}"

            return texto
        except Exception as exc:
            logger.warning(
                "Falha na comunicação com OpenRouter (%s: %s). Aplicando fallback seguro.",
                type(exc).__name__,
                exc,
            )
            return FALLBACK_PADRAO_TIER

    def gerar_mensagem_offboard(
        self,
        nome_cliente: str,
        contexto_passageiro: str,
        acao_vencedora: str,
    ) -> str:
        """Gera mensagem de WhatsApp para o cliente final (módulo Off-Board / CRM).

        Args:
            nome_cliente: Nome do cliente (ex: 'Lucas Pereira').
            contexto_passageiro: Histórico recente de ocorrência ou voo.
            acao_vencedora: Benefício ou ação aprovada pelo árbitro (ex: 'Acolhimento Pessoal + Voucher 1000pts').

        Returns:
            Texto pronto para cópia/disparo via WhatsApp com emojis e prefixo oficial.
        """
        nome_limpo = str(nome_cliente or "").strip()
        if not nome_limpo or nome_limpo.lower() in ("none", "null", "n/a"):
            nome_limpo = "Cliente"

        ctx_limpo = str(contexto_passageiro or "Sem ocorrências recentes").strip()
        acao_limpa = str(acao_vencedora or "Acolhimento e prioridade").strip()

        if ctx_limpo in ("EMPTY_PROMPT", "SIMULAR_ERRO") or not ctx_limpo:
            return FALLBACK_OFFBOARD

        system_prompt = (
            f"Você é o motor de CRM da Azul Linhas Aéreas. Escreva uma mensagem de WhatsApp OBRIGATORIAMENTE direta "
            f"para o cliente final. Chame-o por: {nome_limpo}. NUNCA mencione UUIDs. O tom deve ser corporativo, "
            f"acolhedor e focado em retenção. Ofereça o benefício: {acao_limpa}, justificando com base no seu nível no "
            f"Azul Fidelidade. A mensagem deve ser concisa (máximo 4 linhas), usar emojis adequados e estar pronta "
            f'para ser copiada e colada. Prefixo obrigatório: "[RAG: Azul Fidelidade Res. 400] ".'
        )

        user_content = (
            f"Cliente: {nome_limpo}\n"
            f"Histórico / Contexto Operacional: {ctx_limpo}\n"
            f"Benefício Oferecido: {acao_limpa}\n\n"
            f"Redija a mensagem de WhatsApp pronta para envio iniciando pelo prefixo."
        )

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.3,
                max_tokens=220,
            )
            raw_text = response.choices[0].message.content or ""
            texto = raw_text.strip()

            if not texto:
                return FALLBACK_OFFBOARD

            texto = texto.replace("[Nome do Cliente]", nome_limpo)
            texto = texto.replace("[Nome]", nome_limpo)
            texto = re.sub(r"[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}", "", texto)

            if not texto.startswith(PREFIXO_RAG):
                texto = f"{PREFIXO_RAG}{texto}"

            return texto
        except Exception as exc:
            logger.warning(
                "Falha na geração de mensagem off-board OpenRouter (%s: %s). Aplicando fallback seguro.",
                type(exc).__name__,
                exc,
            )
            return FALLBACK_OFFBOARD

    def generate(self, prompt: str) -> str:
        """Método de compatibilidade para chamadas genéricas de prompt."""
        if not prompt or not str(prompt).strip():
            return FALLBACK_PADRAO_TIER

        prompt_str = str(prompt).strip()
        nome = "Cliente"
        if "Cliente:" in prompt_str:
            parte = prompt_str.split("Cliente:")[1].split(",")[0].strip()
            if not re.match(r"^[a-f0-9-]{30,}$", parte):
                nome = parte

        return self.gerar_instrucao_comissaria(
            nome_cliente=nome,
            contexto_passageiro=prompt_str,
            acao_vencedora="Acolhimento e prioridade",
        )


def get_real_llm_client() -> RealLLMClient:
    """Fábrica para obtenção de instância do cliente LLM real."""
    return RealLLMClient()
