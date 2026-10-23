from __future__ import annotations

import json
import logging
import os
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
import numpy as np
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger("azul.gold.executor")

DEFAULT_SEED: int = 42

CATALOGO_ACOES: dict[str, dict[str, float]] = {
    "UPGRADE_EXECUTIVA": {"custo": 1500.00, "eficacia": 0.90},
    "ACESSO_LOUNGE_VCP": {"custo": 120.00, "eficacia": 0.70},
    "BONUS_5000_PONTOS": {"custo": 150.00, "eficacia": 0.60},
    "ISENCAO_BAGAGEM_EXTRA": {"custo": 100.00, "eficacia": 0.50},
    "CORTESIA_ESPACO_AZUL": {"custo": 50.00, "eficacia": 0.40},
    "MENSAGEM_EXECUTIVA_VIP": {"custo": 1.00, "eficacia": 0.20},
    "NAO_FAZER_NADA": {"custo": 0.00, "eficacia": 0.00},
}

CATALOGO_ACOES_BORDO: dict[str, dict[str, float]] = {
    "BEBIDA_CORTESIA": {"custo": 15.00, "eficacia": 0.70},
    "SNACK_EXTRA": {"custo": 5.00, "eficacia": 0.50},
    "ABORDAGEM_CHEFE_CABINE": {"custo": 0.00, "eficacia": 0.35},
}

ROTULOS_ACOES_BORDO: dict[str, str] = {
    "BEBIDA_CORTESIA": "Bebida Cortesia (Vinho / Cerveja / Suco Especial)",
    "SNACK_EXTRA": "Snack Premium Extra / Pacote Especial",
    "ABORDAGEM_CHEFE_CABINE": "Abordagem Pessoal do Chefe de Cabine",
}


def resolve_project_root() -> Path:
    return Path(__file__).resolve().parent.parent


def carregar_contexto_rag(rag_path: Path | None = None) -> str:
    if rag_path is None:
        rag_path = resolve_project_root() / "regras_azul_fidelidade.md"
    if not rag_path.exists():
        raise FileNotFoundError(f"Arquivo RAG não encontrado: {rag_path}")
    return rag_path.read_text(encoding="utf-8")


def carregar_perfil_cliente_gold(
    id_cliente: str,
    data_lake_dir: Path | None = None,
) -> dict[str, Any]:
    if data_lake_dir is None:
        data_lake_dir = resolve_project_root() / "data_lake"

    gold_dir = data_lake_dir / "gold"
    silver_dir = data_lake_dir / "silver"

    df_clv = pd.read_parquet(
        gold_dir / "clv_clientes.parquet",
        filters=[("id_cliente", "==", id_cliente)],
    )
    df_personas = pd.read_parquet(
        gold_dir / "personas_clientes.parquet",
        filters=[("id_cliente", "==", id_cliente)],
    )
    df_evasao = pd.read_parquet(
        gold_dir / "evasao_clientes.parquet",
        filters=[("id_cliente", "==", id_cliente)],
    )
    df_silver_cli = pd.read_parquet(
        silver_dir / "clientes_silver.parquet",
        filters=[("id_cliente", "==", id_cliente)],
    )

    if df_clv.empty or df_personas.empty or df_evasao.empty:
        raise ValueError(f"Cliente {id_cliente} não encontrado na Camada Gold.")

    row_clv = df_clv.iloc[0]
    row_personas = df_personas.iloc[0]
    row_evasao = df_evasao.iloc[0]
    tier_fidelidade = (
        str(df_silver_cli.iloc[0]["tier_fidelidade"])
        if not df_silver_cli.empty
        else "Basico"
    )
    consentimento = (
        bool(df_silver_cli.iloc[0]["consentimento_marketing"])
        if not df_silver_cli.empty and "consentimento_marketing" in df_silver_cli.columns
        else True
    )

    return {
        "id_cliente": str(id_cliente),
        "tier_fidelidade": tier_fidelidade,
        "clv_previsto": float(row_clv["clv_previsto"]),
        "recencia_dias": int(row_clv["recencia_dias"]),
        "frequencia": int(row_clv["frequencia"]),
        "persona": str(row_personas["persona"]),
        "tamanho_medio_pnr": float(row_personas["tamanho_medio_pnr"]),
        "score_atrito_acumulado": float(row_evasao["score_atrito_acumulado"]),
        "risco_evasao": float(row_evasao["risco_evasao"]),
        "faixa_pareto": str(row_clv["faixa_pareto"]) if "faixa_pareto" in row_clv else "Cauda Longa",
        "consentimento_marketing": consentimento,
    }


def arbitrar_melhor_acao(perfil_cliente: dict[str, Any]) -> dict[str, Any]:
    clv_previsto = float(perfil_cliente["clv_previsto"])
    risco_evasao = float(perfil_cliente["risco_evasao"])
    tier_fidelidade = str(perfil_cliente["tier_fidelidade"]).strip()
    consentimento_mkt = bool(perfil_cliente.get("consentimento_marketing", True))

    # SALVAGUARDA DE IA RESPONSÁVEL & LGPD (Art. 7º e 18 da Lei 13.709/2018)
    # Se o titular revogou o consentimento para comunicações de marketing, aplica Hard-Block regulatório
    if not consentimento_mkt:
        return {
            "acao_vencedora": "BLOQUEIO_LGPD_OPT_OUT",
            "retorno_liquido": 0.0,
            "custo_acao": 0.0,
            "motivo_bloqueio": (
                "Salvaguarda LGPD Ativada: O titular revogou o consentimento para comunicações "
                "proativas de marketing (Art. 7º e 18 da Lei 13.709/2018). Nenhuma oferta comercial permitida."
            ),
            "avaliacoes_uplift": {},
        }

    melhor_acao = "NAO_FAZER_NADA"
    maior_retorno_liquido = 0.0
    custo_escolhido = 0.0
    avaliacoes: dict[str, float] = {}

    for nome_acao, params in CATALOGO_ACOES.items():
        if nome_acao == "NAO_FAZER_NADA":
            continue

        # Trava de regras do Azul Fidelidade (Hard-Block): clientes Diamante já possuem Espaço Azul ilimitado e franquia máxima de bagagens.
        if tier_fidelidade == "Diamante" and nome_acao in (
            "CORTESIA_ESPACO_AZUL",
            "ISENCAO_BAGAGEM_EXTRA",
        ):
            continue

        custo_acao = float(params["custo"])
        eficacia_acao = float(params["eficacia"])

        # Lógica matemática de Uplift: Retorno Líquido = (CLV_Previsto * Risco_Evasao * Eficacia_Acao) - Custo_Acao.
        retorno_liquido = (clv_previsto * risco_evasao * eficacia_acao) - custo_acao
        avaliacoes[nome_acao] = round(retorno_liquido, 2)

        if retorno_liquido > maior_retorno_liquido:
            maior_retorno_liquido = retorno_liquido
            melhor_acao = nome_acao
            custo_escolhido = custo_acao

    if maior_retorno_liquido <= 0.0:
        melhor_acao = "NAO_FAZER_NADA"
        maior_retorno_liquido = 0.0
        custo_escolhido = 0.0

    return {
        "acao_vencedora": melhor_acao,
        "retorno_liquido": round(maior_retorno_liquido, 2),
        "custo_acao": round(custo_escolhido, 2),
        "avaliacoes_uplift": avaliacoes,
    }


def _obter_mock_padronizado(
    perfil_cliente: dict[str, Any],
    acao_vencedora: str,
) -> dict[str, str]:
    tier = str(perfil_cliente.get("tier_fidelidade", "Básico"))
    persona = str(perfil_cliente.get("persona", "Cliente"))
    id_curto = str(perfil_cliente.get("id_cliente", "CLIENTE"))[:8].upper()
    clv = float(perfil_cliente.get("clv_previsto", 0.0))
    risco = float(perfil_cliente.get("risco_evasao", 0.0))

    if acao_vencedora == "BLOQUEIO_LGPD_OPT_OUT":
        return {
            "notificacao_interna": (
                f"Bloqueio de Salvaguarda LGPD: Titular #{id_curto} ({persona}, {tier}) possui opt-out registrado "
                "(Art. 7º e 18 da LGPD). Ação promocional suspensa pelo motor para conformidade regulatória."
            ),
            "mensagem_crm": "Comunicação proativa suspensa em estrita conformidade com as diretrizes de privacidade e LGPD.",
        }

    if acao_vencedora == "NAO_FAZER_NADA":
        return {
            "notificacao_interna": (
                f"Decisão interna: Sem ação por falta de ROI para cliente #{id_curto} "
                f"({persona}, {tier}). CLV R$ {clv:,.2f}, risco de evasão {risco * 100:.1f}%."
            ),
            "mensagem_crm": "Nenhuma mensagem enviada ao cliente conforme diretriz de eficiência financeira (ROI negativo).",
        }

    aberturas_por_persona = {
        "Gestor Corporativo": (
            f"Prezado(a) Gestor(a) {tier} (#{id_curto}), sabemos que sua agenda executiva e compromissos "
            "corporativos exigem pontualidade e excelência, e lamentamos qualquer atrito em sua jornada recente."
        ),
        "Líder Familiar": (
            f"Olá, Cliente {tier} (#{id_curto})! Reconhecemos o valor de cada momento especial em família "
            "e sentimos muito por quaisquer contratempos que tenham impactado o seu grupo de viagem."
        ),
        "Viajante Solo Premium": (
            f"Prezado(a) Cliente {tier} (#{id_curto}), valorizamos profundamente sua preferência individual "
            "e fidelidade de alto padrão na Azul, e pedimos desculpas pelo imprevisto enfrentado."
        ),
        "Turista Eventual": (
            f"Olá, Cliente {tier} (#{id_curto})! Agradecemos por escolher a Azul para seus momentos de descanso "
            "e lazer, e lamentamos os contratempos operacionais recentes."
        ),
        "Executivo Frequente": (
            f"Prezado(a) Cliente {tier} (#{id_curto}), sabemos que sua agenda corporativa "
            "exige pontualidade absoluta e lamentamos os imprevistos recentes em sua jornada."
        ),
        "Família/Lazer": (
            f"Olá, Cliente {tier} (#{id_curto})! Sabemos o quanto cada viagem ao lado de quem "
            "você ama é especial e sentimos muito pelos contratempos enfrentados pelo seu grupo."
        ),
        "Caçador de Pontos": (
            f"Olá, Cliente {tier} (#{id_curto})! Valorizamos sua dedicação estratégica ao "
            "programa Azul Fidelidade e lamentamos a experiência recente fora do nosso padrão."
        ),
        "Viajante Regional": (
            f"Olá, Cliente {tier} (#{id_curto})! Agradecemos por escolher a malha regional "
            "da Azul em suas conexões pelo Brasil e pedimos desculpas pelo atrito operacional recente."
        ),
    }
    abertura = aberturas_por_persona.get(
        persona,
        f"Olá, Cliente {tier} (#{id_curto})! Lamentamos os imprevistos recentes em seus voos.",
    )

    beneficios_rag = {
        "UPGRADE_EXECUTIVA": (
            "Conforme as diretrizes do Azul Fidelidade, disponibilizamos para sua próxima viagem "
            "internacional um voucher de Upgrade de Cabine para a Classe Executiva da Azul, "
            "garantindo máximo conforto e produtividade a bordo."
        ),
        "ACESSO_LOUNGE_VCP": (
            "Como gesto de reconhecimento, liberamos seu acesso cortesia ao Lounge Azul no "
            "aeroporto de Viracopos (VCP) — válido também em nossas salas de Lisboa, Orlando ou "
            "Fort Lauderdale — para que aguarde seu próximo embarque com total tranquilidade."
        ),
        "ISENCAO_BAGAGEM_EXTRA": (
            "Para tornar sua próxima jornada mais leve, concedemos a isenção de 1 bagagem extra "
            "de 23kg além da franquia da sua categoria no Azul Fidelidade."
        ),
        "CORTESIA_ESPACO_AZUL": (
            "Disponibilizamos uma cortesia de assento no Espaço Azul para seu próximo voo "
            "nacional, proporcionando mais espaço e prioridade no seu desembarque."
        ),
        "BONUS_5000_PONTOS": (
            "Creditamos um bônus especial de 5.000 pontos diretamente no seu saldo Azul Fidelidade "
            "para acelerar suas próximas emissões de passagens."
        ),
        "MENSAGEM_EXECUTIVA_VIP": (
            "Em nome da Diretoria de Operações e Experiência do Cliente da Azul, registramos "
            "nosso pedido formal de desculpas e reforçamos nosso compromisso com sua satisfação."
        ),
    }
    corpo_beneficio = beneficios_rag.get(
        acao_vencedora,
        "Agradecemos por sua fidelidade e preferência em voar Azul.",
    )

    return {
        "notificacao_interna": (
            f"Alerta Retenção: Cliente #{id_curto} ({persona}, {tier}) com risco de evasão {risco * 100:.1f}% "
            f"e CLV R$ {clv:,.2f}. Motor arbitrou ação '{acao_vencedora}' com ROI líquido projetado positivo."
        ),
        "mensagem_crm": f"{abertura} {corpo_beneficio}",
    }


def gerar_mensagem_llm(
    perfil_cliente: dict[str, Any],
    acao_vencedora: str,
    contexto_rag: str,
) -> dict[str, str]:
    if acao_vencedora in ("NAO_FAZER_NADA", "BLOQUEIO_LGPD_OPT_OUT"):
        return _obter_mock_padronizado(perfil_cliente, acao_vencedora)

    # Bloco de chamada à API de LLM (Gemini / OpenAI) com resiliência e fallback
    try:
        load_dotenv(resolve_project_root() / ".env")
        load_dotenv(resolve_project_root() / "back" / ".env")

        gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        openai_key = os.getenv("OPENAI_API_KEY")

        if not gemini_key and not openai_key:
            return _obter_mock_padronizado(perfil_cliente, acao_vencedora)

        prompt = f"""Você é o Agente de Decisão e Retenção do Azul Fidelidade.
Sua missão é analisar o perfil do cliente, a ação de intervenção recomendada pelo Árbitro Matemático de Uplift e as diretrizes oficiais da Azul, gerando uma notificação gerencial interna e a mensagem humanizada de CRM para o cliente.

### DIRETRIZES E REGRAS DE NEGÓCIO (Azul Fidelidade):
{contexto_rag}

### PERFIL DO CLIENTE ANALISADO:
- ID do Cliente: {perfil_cliente.get('id_cliente')}
- Categoria / Tier Fidelidade: {perfil_cliente.get('tier_fidelidade')}
- Persona Identificada: {perfil_cliente.get('persona')}
- CLV Previsto: R$ {float(perfil_cliente.get('clv_previsto', 0.0)):,.2f}
- Risco de Evasão (Churn): {float(perfil_cliente.get('risco_evasao', 0.0)) * 100.0:.1f}%
- Score de Atrito Acumulado: {float(perfil_cliente.get('score_atrito_acumulado', 0.0)):.2f}

### DECISÃO DO MOTOR DE UPLIFT:
- Ação Vencedora Arbitrada: {acao_vencedora}

### INSTRUÇÕES MANDATÓRIAS:
Responda ESTRITAMENTE em formato JSON (sem nenhum texto ou formatação fora do objeto JSON) com as seguintes duas chaves:
1. "notificacao_interna": Resumo gerencial curto alertando a equipe sobre a decisão do motor e o ROI esperado.
2. "mensagem_crm": Draft do texto (e-mail/WhatsApp) humanizado e empático para o cliente focado na retenção, respeitando estritamente o catálogo de ações e a ação concedida (sem alucinar benefícios não concedidos).
"""
        conteudo_raw = ""

        if gemini_key:
            from google.generativeai.client import configure
            from google.generativeai.generative_models import GenerativeModel

            configure(api_key=gemini_key)
            model = GenerativeModel(
                model_name="gemini-1.5-flash",
                generation_config={"response_mime_type": "application/json"},
            )
            response = model.generate_content(prompt)
            conteudo_raw = response.text.strip()
        elif openai_key:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": "Você é um agente da Azul Linhas Aéreas. Responda estritamente em formato JSON."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
            )
            conteudo_raw = completion.choices[0].message.content or ""

        if conteudo_raw.startswith("```"):
            linhas = conteudo_raw.splitlines()
            if linhas[0].startswith("```"):
                linhas = linhas[1:]
            if linhas and linhas[-1].startswith("```"):
                linhas = linhas[:-1]
            conteudo_raw = "\n".join(linhas).strip()

        dados_json = json.loads(conteudo_raw)
        if (
            isinstance(dados_json, dict)
            and "notificacao_interna" in dados_json
            and "mensagem_crm" in dados_json
        ):
            return {
                "notificacao_interna": str(dados_json["notificacao_interna"]).strip(),
                "mensagem_crm": str(dados_json["mensagem_crm"]).strip(),
            }

        return _obter_mock_padronizado(perfil_cliente, acao_vencedora)

    except Exception as exc:
        logger.warning("Falha na chamada ao LLM externo: %s. Utilizando fallback resiliente.", exc)
        return _obter_mock_padronizado(perfil_cliente, acao_vencedora)


def arbitrar_acao_bordo(perfil_cliente: dict[str, Any]) -> dict[str, Any]:
    clv_previsto = float(perfil_cliente.get("clv_previsto", 0.0))
    risco_evasao = float(perfil_cliente.get("risco_evasao", 0.0))
    tier = str(perfil_cliente.get("tier_fidelidade", "Basico")).strip()
    faixa_pareto = str(perfil_cliente.get("faixa_pareto", "Cauda Longa")).strip()

    avaliacoes: dict[str, float] = {}
    for nome_acao, dados in CATALOGO_ACOES_BORDO.items():
        custo = dados["custo"]
        eficacia = dados["eficacia"]
        retorno = (clv_previsto * risco_evasao * eficacia) - custo
        avaliacoes[nome_acao] = round(retorno, 2)

    acoes_ordenadas = sorted(avaliacoes.items(), key=lambda x: x[1], reverse=True)

    if (risco_evasao > 0.60 or "Top 10%" in faixa_pareto or tier == "Diamante") and "BEBIDA_CORTESIA" in avaliacoes:
        melhor_acao = "BEBIDA_CORTESIA"
        retorno_escolhido = avaliacoes["BEBIDA_CORTESIA"]
        custo_escolhido = CATALOGO_ACOES_BORDO["BEBIDA_CORTESIA"]["custo"]
    elif acoes_ordenadas and acoes_ordenadas[0][1] > 0:
        melhor_acao = acoes_ordenadas[0][0]
        retorno_escolhido = acoes_ordenadas[0][1]
        custo_escolhido = CATALOGO_ACOES_BORDO[melhor_acao]["custo"]
    else:
        melhor_acao = "ABORDAGEM_CHEFE_CABINE"
        retorno_escolhido = avaliacoes.get("ABORDAGEM_CHEFE_CABINE", 0.0)
        custo_escolhido = 0.0

    return {
        "acao_vencedora": melhor_acao,
        "retorno_liquido": round(retorno_escolhido, 2),
        "custo_acao": round(custo_escolhido, 2),
        "avaliacoes": avaliacoes,
    }


def _obter_mock_bordo_padronizado(
    perfil_cliente: dict[str, Any],
    assento: str,
    acao_vencedora: str,
) -> dict[str, str]:
    tier = str(perfil_cliente.get("tier_fidelidade", "Basico"))
    risco = float(perfil_cliente.get("risco_evasao", 0.0))
    id_curto = str(perfil_cliente.get("id_cliente", ""))[:8].upper()

    if acao_vencedora == "BEBIDA_CORTESIA":
        msg = (
            f"Passageiro(a) no assento {assento} (#{id_curto}, {tier}) enfrentou atrito operacional em voo recente "
            f"(risco de evasão {risco * 100:.1f}%). Ao iniciar o serviço de bordo, ofereça uma bebida cortesia "
            "(suco premium, cerveja especial ou refrigerante), peça desculpas em nome da Azul pelos imprevistos passados "
            "e agradeça calorosamente por sua fidelidade."
        )
    elif acao_vencedora == "SNACK_EXTRA":
        msg = (
            f"Passageiro(a) no assento {assento} (#{id_curto}, {tier}) demonstrou atrito recente com a malha. "
            "Durante a passagem da tripulação, ofereça um snack premium extra como cortesia personalizada, "
            "demonstrando atenção aos detalhes e reforçando a hospitalidade Azul."
        )
    else:
        msg = (
            f"Passageiro(a) no assento {assento} (#{id_curto}, categoria {tier}) é cliente prioritário no Azul Fidelidade. "
            "O Chefe de Cabine deve realizar uma saudação nominal cordial durante o voo, "
            "agradecer sua fidelidade e colocar toda a equipe à disposição para garantir uma viagem perfeita."
        )

    return {"instrucao_comissario": msg}


def gerar_instrucao_bordo_llm(
    perfil_cliente: dict[str, Any],
    assento: str,
    acao_vencedora: str,
    contexto_rag: str,
) -> dict[str, str]:
    # Bloco de chamada à API de LLM para instruções de bordo da tripulação
    try:
        load_dotenv(resolve_project_root() / ".env")
        load_dotenv(resolve_project_root() / "back" / ".env")

        gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        openai_key = os.getenv("OPENAI_API_KEY")

        if not gemini_key and not openai_key:
            return _obter_mock_bordo_padronizado(perfil_cliente, assento, acao_vencedora)

        tier = perfil_cliente.get("tier_fidelidade", "Basico")
        persona = perfil_cliente.get("persona", "Viajante")
        clv = float(perfil_cliente.get("clv_previsto", 0.0))
        risco = float(perfil_cliente.get("risco_evasao", 0.0))
        atrito = float(perfil_cliente.get("score_atrito_acumulado", 0.0))

        prompt = f"""Você é o Assistente Digital da Tripulação de Cabine da Azul Linhas Aéreas (Guest Service Tool).
Sua missão é instruir diretamente os comissários de voo e o chefe de cabine sobre como agir presencialmente com o passageiro no assento {assento}.

### DIRETRIZES DA COMPANHIA:
{contexto_rag}

### PERFIL DO PASSAGEIRO A BORDO:
- Assento: {assento}
- Categoria TudoAzul / Tier: {tier}
- Persona Identificada: {persona}
- CLV Previsto: R$ {clv:,.2f}
- Risco de Evasão (Churn): {risco * 100:.1f}%
- Histórico de Atrito: {atrito:.2f}

### AÇÃO DE BORDO ARBITRADA:
- Ação: {acao_vencedora}

### INSTRUÇÕES OBRIGATÓRIAS:
Responda EXCLUSIVAMENTE em formato JSON (sem formatações markdown adicionais) com a seguinte chave:
{{
  "instrucao_comissario": "Instrução curta, prática e empática para o comissário abordar o passageiro no assento {assento} (ex: 'Cliente {assento} sofreu atraso no voo anterior. Ofereça a bebida cortesia durante o serviço, peça desculpas em nome da Azul e agradeça a fidelidade {tier}.')."
}}
"""
        conteudo_raw = ""
        if gemini_key:
            from google.generativeai.client import configure
            from google.generativeai.generative_models import GenerativeModel

            configure(api_key=gemini_key)
            model = GenerativeModel(
                model_name="gemini-1.5-flash",
                generation_config={"response_mime_type": "application/json"},
            )
            response = model.generate_content(prompt)
            conteudo_raw = response.text.strip()
        elif openai_key:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": "Você é um assistente de bordo da Azul. Responda estritamente em JSON."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
            )
            conteudo_raw = completion.choices[0].message.content or ""

        if conteudo_raw.startswith("```"):
            linhas = conteudo_raw.splitlines()
            if linhas[0].startswith("```"):
                linhas = linhas[1:]
            if linhas and linhas[-1].startswith("```"):
                linhas = linhas[:-1]
            conteudo_raw = "\n".join(linhas).strip()

        dados_json = json.loads(conteudo_raw)
        if isinstance(dados_json, dict) and "instrucao_comissario" in dados_json:
            return {"instrucao_comissario": str(dados_json["instrucao_comissario"]).strip()}

        return _obter_mock_bordo_padronizado(perfil_cliente, assento, acao_vencedora)

    except Exception as exc:
        logger.warning("Falha na chamada LLM de bordo: %s. Usando mock.", exc)
        return _obter_mock_bordo_padronizado(perfil_cliente, assento, acao_vencedora)


def selecionar_clientes_teste_gold(
    data_lake_dir: Path | None = None,
    seed: int = DEFAULT_SEED,
) -> list[tuple[str, str]]:
    if data_lake_dir is None:
        data_lake_dir = resolve_project_root() / "data_lake"

    df_clv = pd.read_parquet(data_lake_dir / "gold" / "clv_clientes.parquet")
    df_sorted = df_clv.sort_values("clv_previsto", ascending=True).reset_index(drop=True)
    n = len(df_sorted)

    rng = np.random.default_rng(seed=seed)
    idx_baixo = int(rng.integers(0, max(1, int(n * 0.10))))
    idx_medio = int(rng.integers(int(n * 0.45), int(n * 0.55)))
    idx_alto = int(rng.integers(int(n * 0.92), n))

    return [
        ("CLV MUITO ALTO", str(df_sorted.loc[idx_alto, "id_cliente"])),
        ("CLV MÉDIO", str(df_sorted.loc[idx_medio, "id_cliente"])),
        ("CLV BAIXO", str(df_sorted.loc[idx_baixo, "id_cliente"])),
    ]


def executar_simulacao_local() -> None:
    contexto_rag = carregar_contexto_rag()
    clientes_teste = selecionar_clientes_teste_gold(seed=DEFAULT_SEED)

    separador = "=" * 88
    print(separador)
    print("BRAÇO EXECUTOR AZUL — ÁRBITRO MATEMÁTICO DE UPLIFT & AGENTE RAG-LLM (SEED=42)")
    print(separador)

    for rotulo_faixa, id_cliente in clientes_teste:
        perfil = carregar_perfil_cliente_gold(id_cliente)
        decisao = arbitrar_melhor_acao(perfil)
        resultado_llm = gerar_mensagem_llm(
            perfil_cliente=perfil,
            acao_vencedora=decisao["acao_vencedora"],
            contexto_rag=contexto_rag,
        )

        print(f"\n[{rotulo_faixa}] Cliente ID : {perfil['id_cliente']}")
        print(f"  • Tier Fidelidade  : {perfil['tier_fidelidade']} | Persona: {perfil['persona']}")
        print(f"  • CLV Previsto     : R$ {perfil['clv_previsto']:,.2f}")
        print(f"  • Risco de Evasão  : {perfil['risco_evasao'] * 100.0:.2f}% (Atrito: {perfil['score_atrito_acumulado']:.2f})")
        print(f"  • Ação Vencedora   : {decisao['acao_vencedora']} (Custo: R$ {decisao['custo_acao']:,.2f})")
        print(f"  • ROI Líquido Est. : R$ {decisao['retorno_liquido']:,.2f}")
        print(f"  • Notificação Interna: \"{resultado_llm['notificacao_interna']}\"")
        print(f"  • Mensagem CRM       : \"{resultado_llm['mensagem_crm']}\"")
        print("-" * 88)
        print("-" * 88)


if __name__ == "__main__":
    executar_simulacao_local()

