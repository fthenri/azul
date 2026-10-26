from __future__ import annotations

from datetime import datetime, timezone
import logging
from pathlib import Path
import random
import sqlite3
from typing import Any, List

from back.app.config import Settings, get_settings
from back.app.core.exceptions import EntityNotFoundError
from back.app.infrastructure.analytics.duckdb_client import DuckDBClient
from back.app.schemas.audit import FatorShap
from back.app.schemas.simulation import (
    AcaoConcorrente,
    AcaoRecomendadaLote,
    AssentoCliente,
    AssentoVoo,
    ExplicabilidadeDecisao,
    FundamentacaoRag,
    ListaVoosResponse,
    LoteAcoes,
    MetadataAeronave,
    RacionalArbitro,
    ResumoLote,
    SimularBordoResponse,
    VooDetalheResponse,
    VooMalhaResumo,
    VooSimuladoResponse,
)
from back.executor_decisao import (
    CATALOGO_ACOES_BORDO,
    FALLBACK_ROI_NEGATIVO,
    MENSAGEM_VETO_POLITICA,
    ROTULOS_ACOES_BORDO,
    arbitrar_acao_bordo,
    carregar_contexto_rag,
    carregar_perfil_cliente_gold,
    gerar_instrucao_bordo_llm,
    gerar_instrucoes_bordo_lote_llm,
)

logger = logging.getLogger("azul.simulation.crew")

FIRST_NAMES = [
    "Lucas", "Mariana", "Gabriel", "Beatriz", "Rodrigo", "Juliana", "Felipe", "Camila",
    "Eduardo", "Larissa", "Thiago", "Fernanda", "Bruno", "Amanda", "Rafael", "Letícia",
    "Leonardo", "Carolina", "Guilherme", "Patrícia", "Marcelo", "Renata", "Gustavo", "Vanessa",
    "André", "Daniela", "Diego", "Bárbara", "Matheus", "Tatiane", "Alexandre", "Aline",
    "Vinícius", "Priscila", "Fábio", "Luana", "Caio", "Jéssica", "Danilo", "Sabrina",
    "Igor", "Bruna", "Renan", "Carla", "Vitor", "Flávia", "Leandro", "Mônica"
]
LAST_NAMES = [
    "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira",
    "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes",
    "Soares", "Fernandes", "Vieira", "Barbosa", "Rocha", "Dias", "Nascimento", "Andrade",
    "Moreira", "Nunes", "Marques", "Machado", "Mendes", "Freitas", "Cardoso", "Ramos",
    "Gonçalves", "Santana", "Teixeira", "Araújo", "Castro", "Cavalcanti", "Macedo", "Pinheiro"
]


FROTA_AZUL: dict[str, dict[str, Any]] = {
    "A320neo": {
        "modelo": "Airbus A320neo",
        "codigo": "A320neo",
        "fileiras": 29,
        "layout": ["A", "B", "C", "D", "E", "F"],
    },
    "E195-E2": {
        "modelo": "Embraer E195-E2",
        "codigo": "E195-E2",
        "fileiras": 34,
        "layout": ["A", "B", "C", "D"],
    },
    "ATR 72-600": {
        "modelo": "ATR 72-600",
        "codigo": "ATR 72-600",
        "fileiras": 18,
        "layout": ["A", "B", "C", "D"],
    },
}


def gerar_nome_passageiro(id_cliente: str) -> str:
    """Gera um nome brasileiro plausível e determinístico a partir do hash do identificador."""
    val = sum(ord(c) for c in str(id_cliente))
    first = FIRST_NAMES[val % len(FIRST_NAMES)]
    last = LAST_NAMES[(val // len(FIRST_NAMES)) % len(LAST_NAMES)]
    return f"{first} {last}"


TIER_PRIORITY_WEIGHTS = {
    "Diamante": 100000.0,
    "Safira": 50000.0,
    "Topazio": 20000.0,
    "Basico": 5000.0,
    "Azul": 5000.0,
}

PARETO_PRIORITY_WEIGHTS = {
    "Top 10% Receita": 20000.0,
    "Top 20% Receita": 10000.0,
    "Top 50% Receita": 5000.0,
    "Cauda Longa": 1000.0,
}


def calcular_prioridade_cliente(p: dict[str, Any]) -> float:
    """Calcula score de prioridade comercial baseado em Tier e CLV para ordenação de cabine."""
    tier = str(p.get("tier_fidelidade") or "Basico")
    pareto = str(p.get("faixa_pareto") or "Cauda Longa")
    clv = float(p.get("clv_previsto") or 0.0)
    return (
        TIER_PRIORITY_WEIGHTS.get(tier, 5000.0)
        + PARETO_PRIORITY_WEIGHTS.get(pareto, 1000.0)
        + clv
    )


def alocar_assentos_aeronave(
    passageiros_raw: list[dict[str, Any]],
    fileiras: int,
    layout: list[str],
    codigo_modelo: str = "A320neo",
) -> list[tuple[str, dict[str, Any]]]:
    """Aloca passageiros na aeronave calibrando Espaço Azul (1-4), coesão de PNR,
    distribuição de grupos no terço traseiro e desejabilidade de assento orgânica."""
    if not passageiros_raw:
        return []

    espaco_azul_max = 2 if codigo_modelo == "ATR 72-600" else 4
    is_6_seats = len(layout) == 6

    # 1. Agrupamento por PNR (apenas PNRs reais são agrupados; SOLO é tratado individualmente)
    all_groups: list[list[dict[str, Any]]] = []
    pnr_map: dict[str, list[dict[str, Any]]] = {}

    for p in passageiros_raw:
        pnr = str(p.get("pnr") or "SOLO").strip()
        if pnr and pnr != "SOLO":
            pnr_map.setdefault(pnr, []).append(p)
        else:
            all_groups.append([p])

    for grp in pnr_map.values():
        all_groups.append(grp)

    # Ordena passageiros internamente em cada grupo por Tier/CLV
    for grp in all_groups:
        grp.sort(key=calcular_prioridade_cliente, reverse=True)

    # Função de pontuação do grupo (definida pelo membro de maior prioridade comercial)
    def score_grupo(grp: list[dict[str, Any]]) -> float:
        return max(calcular_prioridade_cliente(x) for x in grp)

    def is_vip_grupo(grp: list[dict[str, Any]]) -> bool:
        return any(
            str(x.get("tier_fidelidade")) == "Diamante"
            or str(x.get("faixa_pareto")) in ("Top 10% Receita", "Top 20% Receita")
            for x in grp
        )

    # Ordena todos os grupos colocando VIPs primeiro e ordenando por Tier/CLV
    sorted_groups = sorted(
        all_groups,
        key=lambda g: (is_vip_grupo(g), score_grupo(g)),
        reverse=True,
    )

    # Grid de assentos: grid[row][col] = passageiro ou None
    grid: dict[int, dict[str, dict[str, Any] | None]] = {
        r: {c: None for c in layout} for r in range(1, fileiras + 1)
    }

    # Helper para encontrar blocos estritamente contíguos na mesma fileira
    def find_contiguous_block(row: int, size: int) -> list[str] | None:
        if is_6_seats:
            left = ["A", "B", "C"]
            right = ["D", "E", "F"]
            if size == 6:
                if all(grid[row][c] is None for c in layout):
                    return layout
            elif size == 5:
                for cand in [["A", "B", "C", "D", "E"], ["B", "C", "D", "E", "F"]]:
                    if all(grid[row][c] is None for c in cand):
                        return cand
            elif size == 4:
                for cand in [["A", "B", "C", "D"], ["C", "D", "E", "F"], ["B", "C", "D", "E"]]:
                    if all(grid[row][c] is None for c in cand):
                        return cand
            elif size == 3:
                if all(grid[row][c] is None for c in left):
                    return left
                if all(grid[row][c] is None for c in right):
                    return right
            elif size == 2:
                # Prioriza pares contíguos de janela ou corredor
                if grid[row]["A"] is None and grid[row]["B"] is None:
                    return ["A", "B"]
                if grid[row]["E"] is None and grid[row]["F"] is None:
                    return ["E", "F"]
                if grid[row]["B"] is None and grid[row]["C"] is None:
                    return ["B", "C"]
                if grid[row]["D"] is None and grid[row]["E"] is None:
                    return ["D", "E"]
            elif size == 1:
                # Preferência solo: Janela -> Corredor -> Meio
                for c in ["A", "F", "C", "D", "B", "E"]:
                    if grid[row][c] is None:
                        return [c]
        else:
            # Layout 2x2 (A, B - C, D)
            left = ["A", "B"]
            right = ["C", "D"]
            if size == 4:
                if all(grid[row][c] is None for c in layout):
                    return layout
            elif size == 3:
                if grid[row]["A"] is None and grid[row]["B"] is None and grid[row]["C"] is None:
                    return ["A", "B", "C"]
                if grid[row]["B"] is None and grid[row]["C"] is None and grid[row]["D"] is None:
                    return ["B", "C", "D"]
            elif size == 2:
                if all(grid[row][c] is None for c in left):
                    return left
                if all(grid[row][c] is None for c in right):
                    return right
            elif size == 1:
                for c in ["A", "D", "B", "C"]:
                    if grid[row][c] is None:
                        return [c]
        return None

    # -------------------------------------------------------------------------
    # REGRA 1: Espaço Azul / Premium (Fileiras 1 a 4)
    # Aloca grupos VIPs (Diamante / Top 10% Receita) e passageiros de alto CLV
    # -------------------------------------------------------------------------
    remaining_groups: list[list[dict[str, Any]]] = []

    for g in sorted_groups:
        sz = len(g)
        allocated = False
        if is_vip_grupo(g):
            for r in range(1, espaco_azul_max + 1):
                block = find_contiguous_block(r, sz)
                if block:
                    for pax, col in zip(g, block):
                        grid[r][col] = pax
                    allocated = True
                    break
        if not allocated:
            remaining_groups.append(g)

    # -------------------------------------------------------------------------
    # REGRA 2 & 3: Cabine Principal & Coesão de Famílias (PNR)
    # Grupos (size >= 2) distribuídos organicamente cobrindo também o último terço
    # -------------------------------------------------------------------------
    multi_groups = [g for g in remaining_groups if len(g) > 1]
    solo_groups = [g for g in remaining_groups if len(g) == 1]

    # Distribui grupos com espaçamento dinâmico até o último terço do avião
    main_start = espaco_azul_max + 1
    main_end = max(fileiras - 1, main_start)
    num_multi = len(multi_groups)
    if num_multi > 1:
        stride_rows = [
            round(main_start + i * (main_end - main_start) / (num_multi - 1))
            for i in range(num_multi)
        ]
    else:
        stride_rows = [main_start]

    for g, target_r in zip(multi_groups, stride_rows):
        sz = len(g)
        chosen_row = target_r
        block = find_contiguous_block(target_r, sz)
        if not block:
            for offset in range(1, fileiras):
                for candidate_r in (target_r - offset, target_r + offset):
                    if main_start <= candidate_r <= fileiras:
                        block = find_contiguous_block(candidate_r, sz)
                        if block:
                            chosen_row = candidate_r
                            break
                if block:
                    break
        if not block:
            for r in range(main_start, fileiras + 1):
                block = find_contiguous_block(r, sz)
                if block:
                    chosen_row = r
                    break
        if block:
            for pax, col in zip(g[:len(block)], block):
                grid[chosen_row][col] = pax
            if len(g) > len(block):
                for pax in g[len(block):]:
                    solo_groups.append([pax])
        else:
            for pax in g:
                solo_groups.append([pax])

    # -------------------------------------------------------------------------
    # REGRA 1 & 2: Alocação Orgânica de Assentos Vazios (Passageiros Solo)
    # Fórmula de Desejabilidade com Weight & Balance suave e alta variância randômica
    # -------------------------------------------------------------------------
    def seat_desirability(r: int, c: str) -> float:
        score = 0.0
        # Sobras do Espaço Azul têm altíssima preferência para solo
        if r <= espaco_azul_max:
            score += 250.0

        if is_6_seats:
            if c in ("A", "F"):
                score += 120.0  # Janela
            elif c in ("C", "D"):
                score += 90.0   # Corredor
            else:
                score += 15.0   # Assento do meio (B/E) evitado por solo travelers
        else:
            if c in ("A", "D"):
                score += 120.0  # Janela
            else:
                score += 90.0   # Corredor

        # Penalidade suave de Weight & Balance (- 0.3 * Fileira)
        score -= 0.3 * r

        # Leve penalidade apenas para a última fileira absoluta (banheiro/galley traseiro)
        if r == fileiras:
            score -= 15.0

        # Variância randômica com ruído Gaussiano N(0, 30.0)
        # Permite que janelas e corredores no fundo tenham chance de serem preenchidos antes de assentos do meio na frente
        score += random.gauss(0.0, 30.0)

        return score

    available_seats: list[tuple[int, str, float]] = []
    for r in range(1, fileiras + 1):
        for c in layout:
            if grid[r][c] is None:
                available_seats.append((r, c, seat_desirability(r, c)))

    available_seats.sort(key=lambda item: item[2], reverse=True)

    # Extrai passageiros solo e ordena por prioridade comercial (Tier/CLV)
    solo_pax_list = [g[0] for g in solo_groups]
    solo_pax_list.sort(key=calcular_prioridade_cliente, reverse=True)

    for i, pax in enumerate(solo_pax_list):
        if i < len(available_seats):
            r, c, _ = available_seats[i]
            grid[r][c] = pax

    # Coleta resultado final dos passageiros alocados com seus respectivos assentos
    allocated_result: list[tuple[str, dict[str, Any]]] = []
    for r in range(1, fileiras + 1):
        for c in layout:
            pax = grid[r][c]
            if pax is not None:
                allocated_result.append((f"{r}{c}", pax))

    return allocated_result


class CrewService:
    def _build_explicabilidade(
        self,
        pax: dict[str, Any],
        decisao: dict[str, Any],
        rotulo_acao: str,
        retorno_liquido: float,
        custo_acao: float,
    ) -> ExplicabilidadeDecisao:
        """Monta o objeto estruturado de explicabilidade (SHAP + Árbitro + RAG) para o passageiro."""
        ctx_narrativo = str(pax.get("contexto_narrativo_llm") or "")
        tier = str(pax.get("tier_fidelidade") or "Azul")

        fatores: List[FatorShap] = []

        # Atrasos críticos
        shap_atraso = abs(float(pax.get("shap_atrasos") or 0.0))
        if shap_atraso > 0.001 or "atraso" in ctx_narrativo.lower():
            val = round(max(0.20, shap_atraso if shap_atraso >= 0.05 else 0.35), 2)
            fatores.append(FatorShap(variavel="Atraso crítico de voo (> 60 min)", impacto=val, direcao="positivo"))

        # Bagagem
        shap_bag = abs(float(pax.get("shap_bagagem") or 0.0))
        if shap_bag > 0.0001 or "bagagem" in ctx_narrativo.lower() or "worldtracer" in ctx_narrativo.lower():
            val = round(max(0.15, shap_bag if shap_bag >= 0.05 else 0.22), 2)
            fatores.append(FatorShap(variavel="Ocorrência com bagagem despachada", impacto=val, direcao="positivo"))

        # Cancelamento
        shap_canc = abs(float(pax.get("shap_cancelamentos") or 0.0))
        if shap_canc > 0.001 or "cancelad" in ctx_narrativo.lower():
            val = round(max(0.25, shap_canc if shap_canc >= 0.05 else 0.30), 2)
            fatores.append(FatorShap(variavel="Cancelamento recente de voo", impacto=val, direcao="positivo"))

        # Falha de app / check-in
        shap_app = abs(float(pax.get("shap_falha_app") or 0.0))
        if shap_app > 0.0001 or "app" in ctx_narrativo.lower() or "check-in" in ctx_narrativo.lower() or "sac" in ctx_narrativo.lower():
            val = round(max(0.10, shap_app if shap_app >= 0.05 else 0.12), 2)
            fatores.append(FatorShap(variavel="Atrito em canal digital / SAC", impacto=val, direcao="positivo"))

        # Fator atenuante (Engajamento / Fidelidade)
        shap_rec = abs(float(pax.get("shap_recencia") or 0.0))
        val_rec = round(max(0.05, shap_rec if shap_rec >= 0.03 else 0.08), 2)
        fatores.append(FatorShap(variavel=f"Engajamento no programa ({tier})", impacto=-val_rec, direcao="negativo"))

        tec_vencedora = decisao.get("acao_vencedora", "ABORDAGEM_CHEFE_CABINE")
        avaliacoes = decisao.get("avaliacoes") or {}
        acoes_avaliadas: List[AcaoConcorrente] = []

        for k, info in CATALOGO_ACOES_BORDO.items():
            rot = ROTULOS_ACOES_BORDO.get(k, k)
            ret = float(avaliacoes.get(k, 0.0))
            if k == tec_vencedora and retorno_liquido > 0:
                st = "VENCEDORA"
                mot = "Maior retorno líquido positivo ponderando risco e eficácia."
            elif ret <= 0.0:
                st = "VETADA_ROI"
                mot = "Custo financeiro superior à projeção de perda evitada."
            else:
                st = "SUPERADA"
                mot = "Retorno líquido positivo, porém superada pela ação de maior eficácia."

            acoes_avaliadas.append(
                AcaoConcorrente(
                    acao=rot,
                    custo=float(info["custo"]),
                    retorno_liquido=ret,
                    status=st,
                    motivo=mot,
                )
            )

        motivo_geral = (
            f"Ação '{rotulo_acao}' selecionada por entregar retorno líquido de R$ {retorno_liquido:.2f} com custo de R$ {custo_acao:.2f}."
            if retorno_liquido > 0
            else "Nenhuma intervenção onerosa autorizada: proteção estrita de caixa (ROI Negativo)."
        )

        racional = RacionalArbitro(
            acao_vencedora=rotulo_acao,
            custo=custo_acao,
            retorno_liquido=retorno_liquido,
            formula="Valor Recuperado = CLV × Risco Evasão × Eficácia - Custo",
            motivo_escolha=motivo_geral,
            acoes_avaliadas=acoes_avaliadas,
        )

        fundamentacao = FundamentacaoRag(
            norma="Resolução 400 ANAC",
            artigo="Art. 20 a 28 (Assistência Material e Compensação)",
            regra_fidelidade=f"Benefício personalizado alinhado à categoria {tier} e mitigações proativas da Azul.",
        )

        return ExplicabilidadeDecisao(
            fatores_shap=fatores,
            racional_arbitro=racional,
            fundamentacao_rag=fundamentacao,
        )

    """Serviço de aplicação para o Guest Service Tool da Tripulação (Voo ao Vivo)."""

    def __init__(
        self,
        duckdb_client: DuckDBClient,
        settings: Settings | None = None,
    ) -> None:
        self.duckdb_client = duckdb_client
        self.settings = settings or get_settings()
        self._contexto_rag: str | None = None

    def get_contexto_rag(self) -> str:
        """Carrega e armazena em cache o contexto RAG."""
        if self._contexto_rag is None:
            rag_path = self.settings.rag_rules_path or (self.settings.project_root / "regras_azul_fidelidade.md")
            self._contexto_rag = carregar_contexto_rag(rag_path)
        return self._contexto_rag

    def list_scheduled_flights(self, limit: int = 50) -> ListaVoosResponse:
        """Lista os voos comerciais da malha aérea real consolidando métricas analíticas."""
        # Prioriza voos da malha ativa programada (Horizonte D0) com status operacional acionável
        sql_active = f"""
        SELECT 
            v.numero_voo,
            v.origem,
            v.destino,
            MIN(v.partida_prevista) AS partida_prevista,
            MIN(v.partida_real) AS partida_real,
            COUNT(DISTINCT v.id_cliente) AS total_passageiros,
            COUNT(DISTINCT v.pnr) AS total_pnrs,
            SUM(CASE WHEN COALESCE(e.risco_evasao, 0) > 0.60 THEN 1 ELSE 0 END) AS passageiros_criticos,
            SUM(CASE WHEN c.faixa_pareto IN ('Top 10% Receita', 'Top 20% Receita') THEN 1 ELSE 0 END) AS passageiros_vip,
            CAST(ROUND(AVG(COALESCE(v.atraso_enfrentado_minutos, 0))) AS INTEGER) AS atraso_medio_minutos,
            MAX(COALESCE(v.situacao_voo, 'PROGRAMADO')) AS status_operacional
        FROM silver_viagens v
        LEFT JOIN gold_clv c ON v.id_cliente = c.id_cliente
        LEFT JOIN gold_evasao e ON v.id_cliente = e.id_cliente
        WHERE v.situacao_voo IN ('A EMBARCAR', 'PROGRAMADO', 'EM EMBARQUE')
        GROUP BY v.numero_voo, v.origem, v.destino
        ORDER BY 
            MIN(v.partida_prevista) ASC,
            total_passageiros DESC
        LIMIT {limit}
        """
        rows = self.duckdb_client.query(sql_active)
        if not rows:
            sql_fallback = f"""
            SELECT 
                v.numero_voo,
                v.origem,
                v.destino,
                MIN(v.partida_prevista) AS partida_prevista,
                MIN(v.partida_real) AS partida_real,
                COUNT(DISTINCT v.id_cliente) AS total_passageiros,
                COUNT(DISTINCT v.pnr) AS total_pnrs,
                SUM(CASE WHEN COALESCE(e.risco_evasao, 0) > 0.60 THEN 1 ELSE 0 END) AS passageiros_criticos,
                SUM(CASE WHEN c.faixa_pareto IN ('Top 10% Receita', 'Top 20% Receita') THEN 1 ELSE 0 END) AS passageiros_vip,
                CAST(ROUND(AVG(COALESCE(v.atraso_enfrentado_minutos, 0))) AS INTEGER) AS atraso_medio_minutos,
                MAX(COALESCE(v.situacao_voo, 'PROGRAMADO')) AS status_operacional
            FROM silver_viagens v
            LEFT JOIN gold_clv c ON v.id_cliente = c.id_cliente
            LEFT JOIN gold_evasao e ON v.id_cliente = e.id_cliente
            GROUP BY v.numero_voo, v.origem, v.destino
            ORDER BY total_passageiros DESC
            LIMIT {limit}
            """
            rows = self.duckdb_client.query(sql_fallback)

        voos: List[VooMalhaResumo] = []
        for r in rows:
            num = str(r["numero_voo"])
            origem = str(r["origem"])
            destino = str(r["destino"])
            voos.append(
                VooMalhaResumo(
                    id=num,
                    numero_voo=f"AD {num}",
                    rota=f"{origem} ➔ {destino}",
                    origem=origem,
                    destino=destino,
                    partida_prevista=str(r.get("partida_prevista") or "2026-08-11 12:00:00"),
                    partida_real=str(r.get("partida_real")) if r.get("partida_real") else None,
                    status_operacional=str(r.get("status_operacional") or "PROGRAMADO"),
                    total_passageiros=int(r.get("total_passageiros") or 0),
                    total_pnrs=int(r.get("total_pnrs") or 0),
                    passageiros_criticos=int(r.get("passageiros_criticos") or 0),
                    passageiros_vip=int(r.get("passageiros_vip") or 0),
                    atraso_medio_minutos=float(r.get("atraso_medio_minutos") or 0.0),
                )
            )
        return ListaVoosResponse(total_voos=len(voos), voos=voos)

    def get_flight_details(
        self,
        flight_id: str,
        modelo_aeronave: str | None = None,
    ) -> VooDetalheResponse:
        """Recupera os passageiros reais de um voo com alocação inteligente por PNR e ações de bordo em lote."""
        flight_clean = str(flight_id).upper().replace("AD", "").replace(" ", "").strip()
        if not flight_clean:
            flight_clean = "4409"

        sql_passengers = """
        SELECT 
            v.id_cliente,
            COALESCE(v.pnr, 'SOLO') AS pnr,
            v.numero_voo,
            v.origem,
            v.destino,
            v.partida_prevista,
            v.partida_real,
            COALESCE(v.situacao_voo, 'PROGRAMADO') AS status_operacional,
            s.tier_fidelidade,
            p.persona,
            ROUND(c.clv_previsto, 2) AS clv_previsto,
            c.faixa_pareto,
            ROUND(e.risco_evasao, 4) AS risco_evasao,
            ROUND(e.score_atrito_acumulado, 2) AS score_atrito_acumulado,
            ROUND(COALESCE(c.clv_previsto, 0) * COALESCE(e.risco_evasao, 0), 2) AS valor_em_risco,
            COALESCE(ctx.contexto_narrativo_llm, 'Sem ocorrências recentes') AS contexto_narrativo_llm,
            ctx.acao_vencedora,
            ctx.custo_acao,
            ctx.llm_mensagem_comissaria,
            ctx.mensagem_llm_offboard,
            COALESCE(sh.shap_qtd_atrasos_criticos, 0.0) AS shap_atrasos,
            COALESCE(sh.shap_qtd_bagagem_extraviada, 0.0) AS shap_bagagem,
            COALESCE(sh.shap_qtd_cancelamentos, 0.0) AS shap_cancelamentos,
            COALESCE(sh.shap_qtd_falha_app, 0.0) AS shap_falha_app,
            COALESCE(sh.shap_recencia_dias, 0.0) AS shap_recencia
        FROM silver_viagens v
        JOIN gold_clv c ON v.id_cliente = c.id_cliente
        JOIN gold_evasao e ON v.id_cliente = e.id_cliente
        JOIN gold_personas p ON v.id_cliente = p.id_cliente
        JOIN silver_clientes s ON v.id_cliente = s.id_cliente
        LEFT JOIN gold_contexto_passageiro ctx ON v.id_cliente = ctx.id_cliente
        LEFT JOIN gold_shap sh ON v.id_cliente = sh.id_cliente
        WHERE v.numero_voo = ?
          AND v.situacao_voo IN ('A EMBARCAR', 'PROGRAMADO', 'EM EMBARQUE')
        ORDER BY valor_em_risco DESC
        """
        rows = self.duckdb_client.query(sql_passengers, [flight_clean])
        if not rows:
            # Fallback sem o filtro de situação se consultado voo sem status ativo
            sql_fallback = sql_passengers.replace(
                "  AND v.situacao_voo IN ('A EMBARCAR', 'PROGRAMADO', 'EM EMBARQUE')",
                "",
            )
            rows = self.duckdb_client.query(sql_fallback, [flight_clean])
            if not rows:
                flight_clean = "4409"
                rows = self.duckdb_client.query(sql_passengers, [flight_clean])

        first_row = rows[0] if rows else {}
        origem = str(first_row.get("origem") or "SBPJ")
        destino = str(first_row.get("destino") or "SBCF")
        partida = str(first_row.get("partida_prevista") or "2026-08-11 14:30:00")
        status_op = str(first_row.get("status_operacional") or "A EMBARCAR")

        # Seleciona aeronave adequada ao voo
        if modelo_aeronave and modelo_aeronave in FROTA_AZUL:
            aeronave = FROTA_AZUL[modelo_aeronave]
        else:
            if flight_clean in ("4991", "2666", "4147"):
                aeronave = FROTA_AZUL["E195-E2"]
            else:
                aeronave = FROTA_AZUL["A320neo"]

        fileiras = int(aeronave["fileiras"])
        layout = list(aeronave["layout"])
        assentos_codigos: list[str] = [
            f"{row}{col}" for row in range(1, fileiras + 1) for col in layout
        ]
        total_assentos_aeronave = len(assentos_codigos)

        # Se houver mais passageiros que a capacidade máxima física do avião, ajusta ao limite
        if len(rows) > total_assentos_aeronave:
            rows = rows[:total_assentos_aeronave]

        # 1. Contagem de grupos por PNR (desconsiderando 'SOLO')
        pnr_counts: dict[str, int] = {}
        for r in rows:
            pnr = str(r.get("pnr") or "SOLO").strip()
            if pnr and pnr != "SOLO":
                pnr_counts[pnr] = pnr_counts.get(pnr, 0) + 1

        # 2. Alocação Inteligente com Espaço Azul (1-4), Coesão de PNR e Assentos Vazios Orgânicos
        allocated_passengers = alocar_assentos_aeronave(
            passageiros_raw=rows,
            fileiras=fileiras,
            layout=layout,
            codigo_modelo=str(aeronave["codigo"]),
        )

        assentos_voo: List[AssentoVoo] = []
        for seat_code, p in allocated_passengers:
            pnr = str(p.get("pnr") or "SOLO").strip()
            if pnr and pnr != "SOLO":
                tamanho_grupo = pnr_counts.get(pnr, 1)
                is_grupo_familiar = tamanho_grupo > 1
            else:
                tamanho_grupo = 1
                is_grupo_familiar = False

            risco = float(p.get("risco_evasao") or 0.0)
            pareto = str(p.get("faixa_pareto") or "Cauda Longa")
            clv_val = float(p.get("clv_previsto") or 0.0)
            ctx_narrativo = str(p.get("contexto_narrativo_llm") or "Sem ocorrências recentes")
            msg_lake = p.get("llm_mensagem_comissaria")

            if risco > 0.60:
                status = "critico"
            elif pareto in ("Top 10% Receita", "Top 20% Receita"):
                status = "vip"
            else:
                status = "normal"

            # Avalia se a ação para o assento tem ROI positivo ou é cancelada pelo algoritmo
            perfil_assento = {
                "id_cliente": str(p["id_cliente"]),
                "clv_previsto": clv_val,
                "risco_evasao": risco,
                "score_atrito_acumulado": float(p.get("score_atrito_acumulado") or 0.0),
                "contexto_narrativo_llm": ctx_narrativo,
                "tier_fidelidade": str(p.get("tier_fidelidade") or "Azul"),
                "persona": str(p.get("persona") or "Turista Eventual"),
            }
            dec_assento = arbitrar_acao_bordo(perfil_assento)
            tec_assento = dec_assento.get("acao_vencedora", "ABORDAGEM_CHEFE_CABINE")
            rot_assento = ROTULOS_ACOES_BORDO.get(tec_assento, tec_assento)
            custo_assento = float(dec_assento.get("custo_acao", 0.0))
            ret_assento = float(dec_assento.get("retorno_liquido", 0.0))

            msg_lake = p.get("llm_mensagem_comissaria")
            msg_offboard = p.get("mensagem_llm_offboard")
            p_acao = p.get("acao_vencedora")

            is_veto = (
                ret_assento <= 0.0
                or tec_assento in ("NENHUMA_ACAO", "Nenhuma Ação")
                or rot_assento == "Nenhuma Ação"
                or p_acao == "Nenhuma Ação"
                or (msg_lake and ("Decisão Analítica" in str(msg_lake) or "Intervenção cancelada" in str(msg_lake) or "Veto" in str(msg_lake)))
                or dec_assento.get("tipo_veto") in ("POLITICA", "ROI_NEGATIVO")
            )

            if is_veto:
                rot_assento = "Nenhuma Ação"
                custo_assento = 0.0
                ret_assento = 0.0
                if (msg_lake and "Veto de Política" in str(msg_lake)) or dec_assento.get("tipo_veto") == "POLITICA" or dec_assento.get("motivo_bloqueio") == MENSAGEM_VETO_POLITICA:
                    msg_lake = MENSAGEM_VETO_POLITICA
                    msg_offboard = MENSAGEM_VETO_POLITICA
                elif msg_lake and str(msg_lake).startswith("Decisão Analítica:"):
                    msg_lake = str(msg_lake)
                    msg_offboard = str(msg_offboard) if msg_offboard and str(msg_offboard).startswith("Decisão Analítica:") else msg_lake
                else:
                    msg_lake = FALLBACK_ROI_NEGATIVO
                    msg_offboard = FALLBACK_ROI_NEGATIVO

            explicabilidade_obj = self._build_explicabilidade(
                pax=p,
                decisao=dec_assento,
                rotulo_acao=rot_assento,
                retorno_liquido=ret_assento,
                custo_acao=custo_assento,
            )

            cliente_dto = AssentoCliente(
                id_cliente=str(p["id_cliente"]),
                nome=gerar_nome_passageiro(p["id_cliente"]),
                tier_fidelidade=str(p.get("tier_fidelidade") or "Azul"),
                persona=str(p.get("persona") or "Turista Eventual"),
                clv_previsto=clv_val,
                faixa_pareto=pareto,
                risco_evasao=risco,
                score_atrito_acumulado=float(p.get("score_atrito_acumulado") or 0.0),
                pnr=pnr,
                tamanho_grupo=tamanho_grupo,
                is_grupo_familiar=is_grupo_familiar,
                contexto_narrativo_llm=ctx_narrativo,
                mensagem_llm_batch=msg_lake,
                llm_mensagem_comissaria=msg_lake,
                mensagem_llm_offboard=msg_offboard,
                acao_vencedora=rot_assento,
                custo_acao=custo_assento,
                retorno_liquido=ret_assento,
                explicabilidade=explicabilidade_obj,
            )

            assentos_voo.append(
                AssentoVoo(
                    assento=seat_code,
                    status=status,
                    dados_cliente=cliente_dto,
                )
            )

        # 3. Processamento em Lote (Batch LLM): Seleção dos Top 5 por Valor em Risco
        pax_por_risco = sorted(
            allocated_passengers,
            key=lambda item: float(item[1].get("valor_em_risco") or 0.0),
            reverse=True,
        )
        top5_candidatos = pax_por_risco[:5]

        # Executa Árbitro Matemático para os 5
        itens_para_batch: list[dict[str, Any]] = []
        decisoes_arbitro: list[dict[str, Any]] = []

        for seat_code, p in top5_candidatos:
            perfil = {
                "id_cliente": str(p["id_cliente"]),
                "nome": gerar_nome_passageiro(p["id_cliente"]),
                "tier_fidelidade": str(p.get("tier_fidelidade") or "Azul"),
                "persona": str(p.get("persona") or "Turista Eventual"),
                "clv_previsto": float(p.get("clv_previsto") or 0.0),
                "faixa_pareto": str(p.get("faixa_pareto") or "Cauda Longa"),
                "risco_evasao": float(p.get("risco_evasao") or 0.0),
                "score_atrito_acumulado": float(p.get("score_atrito_acumulado") or 0.0),
                "contexto_narrativo_llm": str(p.get("contexto_narrativo_llm") or "Sem ocorrências recentes"),
            }
            decisao = arbitrar_acao_bordo(perfil)
            decisoes_arbitro.append(decisao)
            itens_para_batch.append({
                "assento": seat_code,
                "pnr": str(p.get("pnr") or "SOLO"),
                "perfil": perfil,
                "acao_vencedora": decisao.get("acao_vencedora", "ABORDAGEM_CHEFE_CABINE"),
            })

        # Executa UMA ÚNICA chamada Batch para a LLM
        contexto_rag = self.get_contexto_rag()
        instrucoes_lote = gerar_instrucoes_bordo_lote_llm(
            itens_lote=itens_para_batch,
            numero_voo=f"AD {flight_clean}",
            contexto_rag=contexto_rag,
        )

        # Monta array de ações recomendadas
        acoes_lote: List[AcaoRecomendadaLote] = []
        custo_total = 0.0
        retorno_total = 0.0

        for i, (seat_code, p) in enumerate(top5_candidatos):
            decisao = decisoes_arbitro[i]
            acao_tecnica = str(decisao.get("acao_vencedora", "ABORDAGEM_CHEFE_CABINE"))
            rotulo_acao = ROTULOS_ACOES_BORDO.get(acao_tecnica) or acao_tecnica
            custo = float(decisao.get("custo_acao") or 0.0)
            retorno = float(decisao.get("retorno_liquido") or 0.0)

            msg_pax = p.get("llm_mensagem_comissaria")
            msg_off = p.get("mensagem_llm_offboard")
            p_acao = p.get("acao_vencedora")

            # Trava estrita de ROI ou Política: Se Retorno_Liquido <= 0, Veto de Política ou Nenhuma Ação
            is_top_veto = (
                retorno <= 0.0
                or acao_tecnica in ("NENHUMA_ACAO", "Nenhuma Ação")
                or rotulo_acao == "Nenhuma Ação"
                or p_acao == "Nenhuma Ação"
                or (msg_pax and ("Decisão Analítica" in str(msg_pax) or "Intervenção cancelada" in str(msg_pax) or "Veto" in str(msg_pax)))
                or decisao.get("tipo_veto") in ("POLITICA", "ROI_NEGATIVO")
            )

            if is_top_veto:
                rotulo_acao = "Nenhuma Ação"
                custo = 0.0
                retorno = 0.0
                if (msg_pax and "Veto de Política" in str(msg_pax)) or decisao.get("tipo_veto") == "POLITICA" or decisao.get("motivo_bloqueio") == MENSAGEM_VETO_POLITICA:
                    instrucao = MENSAGEM_VETO_POLITICA
                    instrucao_offboard = MENSAGEM_VETO_POLITICA
                elif msg_pax and str(msg_pax).startswith("Decisão Analítica:"):
                    instrucao = str(msg_pax)
                    instrucao_offboard = str(msg_off) if msg_off and str(msg_off).startswith("Decisão Analítica:") else instrucao
                else:
                    instrucao = FALLBACK_ROI_NEGATIVO
                    instrucao_offboard = FALLBACK_ROI_NEGATIVO
            else:
                instrucao = (
                    p.get("llm_mensagem_comissaria")
                    or (instrucoes_lote[i] if i < len(instrucoes_lote) else "Atendimento humanizado recomendado.")
                )
                instrucao_offboard = p.get("mensagem_llm_offboard")

            custo_total += custo
            retorno_total += retorno

            risco = float(p.get("risco_evasao") or 0.0)
            pareto = str(p.get("faixa_pareto") or "Cauda Longa")
            tipo = "atrito" if risco > 0.60 else "vip"
            status_badge = "Alerta de Atrito" if tipo == "atrito" else "Fidelização VIP"
            gatilho = (
                f"Score de atrito elevado ({p.get('score_atrito_acumulado')}) • Risco {round(risco * 100)}%"
                if tipo == "atrito"
                else f"Cliente de Alto Valor • Faixa {pareto}"
            )

            acoes_lote.append(
                AcaoRecomendadaLote(
                    id_missao=f"mis_{seat_code}_AD{flight_clean}",
                    assento=seat_code,
                    id_cliente=str(p["id_cliente"]),
                    pnr=str(p.get("pnr") or "SOLO"),
                    passageiro=gerar_nome_passageiro(p["id_cliente"]),
                    tier=str(p.get("tier_fidelidade") or "Azul"),
                    persona=str(p.get("persona") or "Turista Eventual"),
                    tipo=tipo,
                    status_badge=status_badge,
                    gatilho=gatilho,
                    acao_sugerida=rotulo_acao,
                    custo_acao=custo,
                    retorno_liquido=retorno,
                    instrucao_comissario=instrucao,
                    valor_em_risco=float(p.get("valor_em_risco") or 0.0),
                    contexto_narrativo_llm=str(p.get("contexto_narrativo_llm") or "Sem ocorrências recentes"),
                    mensagem_llm_batch=instrucao,
                    llm_mensagem_comissaria=instrucao,
                    mensagem_llm_offboard=instrucao_offboard,
                    acao_vencedora=rotulo_acao,
                )
            )

        roi_projetado = round(retorno_total / max(custo_total, 1.0), 2)
        resumo_lote = ResumoLote(
            total_acoes=len(acoes_lote),
            custo_total=round(custo_total, 2),
            retorno_liquido_total=round(retorno_total, 2),
            roi_projetado=roi_projetado,
        )

        metadata = MetadataAeronave(
            modelo=str(aeronave["modelo"]),
            codigo=str(aeronave["codigo"]),
            fileiras=fileiras,
            layout=layout,
            total_assentos=total_assentos_aeronave,
        )

        return VooDetalheResponse(
            id=flight_clean,
            numero_voo=f"AD {flight_clean}",
            rota=f"{origem} ➔ {destino}",
            origem=origem,
            destino=destino,
            partida_prevista=partida,
            status_operacional=status_op,
            metadata_aeronave=metadata,
            assentos=assentos_voo,
            lote_acoes=LoteAcoes(
                resumo=resumo_lote,
                acoes=acoes_lote,
            ),
        )

    def get_simulated_flight(self, modelo_aeronave: str | None = None) -> VooSimuladoResponse:
        """Gera o mapa de assentos para o voo de demonstração baseado na malha real."""
        detalhe = self.get_flight_details("6002", modelo_aeronave=modelo_aeronave)

        total_aeronave = detalhe.metadata_aeronave.total_assentos
        if len(detalhe.assentos) < total_aeronave:
            fileiras = detalhe.metadata_aeronave.fileiras
            layout = detalhe.metadata_aeronave.layout
            todos_codigos = [
                f"{row}{col}" for row in range(1, fileiras + 1) for col in layout
            ]
            assentos_completos: List[AssentoVoo] = list(detalhe.assentos)
            existentes = {s.assento for s in assentos_completos}
            for idx, code in enumerate(todos_codigos):
                if code not in existentes:
                    template = detalhe.assentos[idx % len(detalhe.assentos)]
                    assentos_completos.append(
                        AssentoVoo(
                            assento=code,
                            status="normal",
                            dados_cliente=template.dados_cliente,
                        )
                    )
            return VooSimuladoResponse(
                flight_id=detalhe.id,
                metadata_aeronave=detalhe.metadata_aeronave,
                assentos=assentos_completos,
                lote_acoes=detalhe.lote_acoes,
            )

        return VooSimuladoResponse(
            flight_id=detalhe.id,
            metadata_aeronave=detalhe.metadata_aeronave,
            assentos=detalhe.assentos,
            lote_acoes=detalhe.lote_acoes,
        )

    def simulate_in_flight_action(
        self,
        id_cliente: str,
        assento: str,
    ) -> SimularBordoResponse:
        """Arbitra ação de bordo e gera instrução do comissário via LLM."""
        # 1. Recupera o perfil analítico completo na Camada Gold via DuckDB (com faixa_pareto)
        sql = """
        SELECT c.id_cliente, s.tier_fidelidade, p.persona, c.clv_previsto,
               c.faixa_pareto, e.risco_evasao, e.score_atrito_acumulado,
               COALESCE(ctx.contexto_narrativo_llm, 'Sem ocorrências recentes') AS contexto_narrativo_llm,
               ctx.llm_mensagem_comissaria
        FROM gold_clv c
        JOIN gold_evasao e ON c.id_cliente = e.id_cliente
        JOIN gold_personas p ON c.id_cliente = p.id_cliente
        JOIN silver_clientes s ON c.id_cliente = s.id_cliente
        LEFT JOIN gold_contexto_passageiro ctx ON c.id_cliente = ctx.id_cliente
        WHERE c.id_cliente = ?
        LIMIT 1
        """
        row = self.duckdb_client.query_row(sql, [id_cliente])
        if row:
            perfil = {
                "id_cliente": str(row["id_cliente"]),
                "tier_fidelidade": str(row["tier_fidelidade"]),
                "persona": str(row["persona"]),
                "clv_previsto": float(row["clv_previsto"]),
                "faixa_pareto": str(row["faixa_pareto"]),
                "risco_evasao": float(row["risco_evasao"]),
                "score_atrito_acumulado": float(row["score_atrito_acumulado"]),
                "contexto_narrativo_llm": str(row.get("contexto_narrativo_llm") or "Sem ocorrências recentes"),
                "mensagem_llm_batch": row.get("llm_mensagem_comissaria"),
                "llm_mensagem_comissaria": row.get("llm_mensagem_comissaria"),
            }
        else:
            # Fallback resiliente para busca direta via Parquet se necessário
            try:
                perfil = carregar_perfil_cliente_gold(
                    id_cliente=id_cliente,
                    data_lake_dir=self.settings.data_lake_dir,
                )
            except Exception:
                raise EntityNotFoundError(f"Passageiro '{id_cliente}' não encontrado na Camada Gold.")

        # 2. Árbitro de Bordo
        decisao = arbitrar_acao_bordo(perfil)
        acao_vencedora: str = str(decisao.get("acao_vencedora", "ABORDAGEM_CHEFE_CABINE"))
        rotulo_acao: str = ROTULOS_ACOES_BORDO.get(acao_vencedora) or acao_tecnica if 'acao_tecnica' in locals() else acao_vencedora
        rotulo_acao = ROTULOS_ACOES_BORDO.get(acao_vencedora, acao_vencedora)
        custo_acao: float = float(decisao.get("custo_acao", 0.0))
        retorno_liquido: float = float(decisao.get("retorno_liquido", 0.0))

        # Trava estrita de ROI ou Política: Se Retorno_Liquido <= 0, Veto de Política ou Nenhuma Ação
        is_veto = (
            retorno_liquido <= 0.0
            or acao_vencedora in ("NENHUMA_ACAO", "Nenhuma Ação")
            or rotulo_acao == "Nenhuma Ação"
            or decisao.get("tipo_veto") in ("POLITICA", "ROI_NEGATIVO")
        )

        if is_veto:
            rotulo_acao = "Nenhuma Ação"
            custo_acao = 0.0
            retorno_liquido = 0.0
            if decisao.get("tipo_veto") == "POLITICA" or decisao.get("motivo_bloqueio") == MENSAGEM_VETO_POLITICA:
                msg_veto = MENSAGEM_VETO_POLITICA
            elif perfil.get("llm_mensagem_comissaria") and str(perfil.get("llm_mensagem_comissaria")).startswith("Decisão Analítica:"):
                msg_veto = str(perfil.get("llm_mensagem_comissaria"))
            else:
                msg_veto = FALLBACK_ROI_NEGATIVO
            resultado_llm = {"instrucao_comissario": msg_veto}
        else:
            # 3. Agente LLM para comissário (passa o código técnico da ação vencedora para o prompt e mock)
            contexto_rag = self.get_contexto_rag()
            resultado_llm = gerar_instrucao_bordo_llm(
                perfil_cliente=perfil,
                assento=assento,
                acao_vencedora=acao_vencedora,
                contexto_rag=contexto_rag,
            )

        return SimularBordoResponse(
            assento=assento,
            id_cliente=id_cliente,
            acao_sugerida=rotulo_acao,
            custo_acao=custo_acao,
            retorno_liquido=retorno_liquido,
            instrucao_comissario=str(resultado_llm.get("instrucao_comissario", "")),
            dados_cliente={
                "id_cliente": perfil.get("id_cliente"),
                "nome": gerar_nome_passageiro(str(perfil.get("id_cliente", ""))),
                "tier_fidelidade": perfil.get("tier_fidelidade"),
                "persona": perfil.get("persona"),
                "clv_previsto": perfil.get("clv_previsto"),
                "faixa_pareto": perfil.get("faixa_pareto", "Cauda Longa"),
                "risco_evasao": perfil.get("risco_evasao"),
                "score_atrito_acumulado": perfil.get("score_atrito_acumulado"),
                "contexto_narrativo_llm": perfil.get("contexto_narrativo_llm", "Sem ocorrências recentes"),
                "mensagem_llm_batch": str(resultado_llm.get("instrucao_comissario", "")) or perfil.get("mensagem_llm_batch"),
                "llm_mensagem_comissaria": str(resultado_llm.get("instrucao_comissario", "")) or perfil.get("llm_mensagem_comissaria"),
                "mensagem_llm_offboard": (MENSAGEM_VETO_POLITICA if decisao.get("tipo_veto") == "POLITICA" else (FALLBACK_ROI_NEGATIVO if is_veto else perfil.get("mensagem_llm_offboard"))),
                "acao_vencedora": rotulo_acao,
                "custo_acao": custo_acao,
                "retorno_liquido": retorno_liquido,
            },
        )

    def _get_mlops_db_path(self) -> Path:
        """Retorna o caminho do banco SQLite transacional de MLOps."""
        if getattr(self.settings, "mlops_db_path", None) is not None:
            p = Path(self.settings.mlops_db_path)
            p.parent.mkdir(parents=True, exist_ok=True)
            return p
        db_dir = self.settings.project_root / "back"
        db_dir.mkdir(parents=True, exist_ok=True)
        return db_dir / "mlops_logs.db"

    def _init_mlops_db(self) -> None:
        """Garante que a tabela mlops_feedback exista no banco SQLite mlops_logs.db."""
        db_path = self._get_mlops_db_path()
        with sqlite3.connect(str(db_path)) as con:
            con.execute("""
                CREATE TABLE IF NOT EXISTS mlops_feedback (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    flight_id TEXT NOT NULL,
                    assento TEXT NOT NULL,
                    id_cliente TEXT,
                    acao_executada TEXT NOT NULL,
                    custo REAL NOT NULL,
                    timestamp TEXT NOT NULL,
                    status TEXT DEFAULT 'INGESTED',
                    grupo_controle TEXT DEFAULT 'HOLDOUT_10PCT',
                    origem TEXT DEFAULT 'ONBOARD_CREW'
                )
            """)
            try:
                con.execute("ALTER TABLE mlops_feedback ADD COLUMN origem TEXT DEFAULT 'ONBOARD_CREW'")
            except Exception:
                pass
            con.commit()

    def register_action_feedback(
        self,
        flight_id: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        """Registra e persiste a conclusão de uma ação de bordo no banco transacional SQLite mlops_logs.db."""
        self._init_mlops_db()
        db_path = self._get_mlops_db_path()

        if hasattr(payload, "model_dump"):
            p_dict = payload.model_dump()
        elif isinstance(payload, dict):
            p_dict = payload
        else:
            p_dict = dict(payload)

        assento = str(p_dict.get("assento") or "").strip()
        id_cliente = str(p_dict.get("id_cliente") or "").strip()
        acao = str(p_dict.get("acao") or "Bebida Premium Cortesia").strip()
        origem = str(p_dict.get("origem") or "ONBOARD_CREW").strip()

        # Mapeia custo real pelo catálogo
        custo = float(p_dict.get("custo") or 0.0)
        if custo <= 0.0:
            if "kids" in acao.lower():
                custo = 12.00
            elif "voucher" in acao.lower() or "acolhimento" in acao.lower():
                custo = 50.00
            elif "snack" in acao.lower():
                custo = 5.00
            else:
                custo = 15.00

        ts = datetime.now(timezone.utc).isoformat()

        with sqlite3.connect(str(db_path)) as con:
            con.row_factory = sqlite3.Row
            cur = con.cursor()

            # Verificação prévia contra confirmações duplicadas (idempotência transacional MLOps)
            cur.execute(
                """
                SELECT id, flight_id, assento, id_cliente, acao_executada, custo, timestamp, status, grupo_controle, origem
                FROM mlops_feedback
                WHERE flight_id = ?
                  AND assento = ?
                  AND (id_cliente = ? OR (id_cliente IS NULL AND ? = ''))
                  AND acao_executada = ?
                  AND origem = ?
                  AND status = 'CONCLUIDA'
                ORDER BY id DESC
                LIMIT 1
                """,
                (flight_id, assento, id_cliente, id_cliente, acao, origem),
            )
            existing = cur.fetchone()
            if existing:
                cur.execute("SELECT count(*) FROM mlops_feedback")
                total_persistidos = cur.fetchone()[0]
                logger.info(
                    "MLOps Feedback Loop duplicado ignorado [ID=%s | Total=%s]: voo=%s, assento=%s, cliente=%s, acao=%s, origem=%s",
                    existing["id"],
                    total_persistidos,
                    flight_id,
                    assento,
                    id_cliente,
                    acao,
                    origem,
                )
                return {
                    "status": "duplicado",
                    "mensagem": "Ação já registrada previamente",
                    "registro_id": existing["id"],
                    "flight_id": flight_id,
                    "assento": assento,
                    "id_cliente": existing["id_cliente"] or id_cliente,
                    "acao_executada": existing["acao_executada"],
                    "custo": float(existing["custo"]),
                    "origem": existing["origem"] or origem,
                    "timestamp": existing["timestamp"],
                    "ciclo_mlops": {
                        "status": "ALREADY_INGESTED",
                        "banco": "mlops_logs.db",
                        "tabela": "mlops_feedback",
                        "registro_id": existing["id"],
                        "grupo_controle": existing["grupo_controle"] if "grupo_controle" in existing.keys() else "HOLDOUT_10PCT",
                        "total_registros_persistidos": total_persistidos,
                    },
                }

            cur.execute(
                """
                INSERT INTO mlops_feedback (flight_id, assento, id_cliente, acao_executada, custo, timestamp, status, origem)
                VALUES (?, ?, ?, ?, ?, ?, 'CONCLUIDA', ?)
                """,
                (flight_id, assento, id_cliente, acao, custo, ts, origem),
            )
            con.commit()
            registro_id = cur.lastrowid
            cur.execute("SELECT count(*) FROM mlops_feedback")
            total_persistidos = cur.fetchone()[0]

        logger.info(
            "MLOps Feedback Loop gravado fisicamente em SQLite [ID=%s | Total=%s]: voo=%s, assento=%s, cliente=%s, acao=%s, custo=R$%.2f, origem=%s",
            registro_id,
            total_persistidos,
            flight_id,
            assento,
            id_cliente,
            acao,
            custo,
            origem,
        )

        return {
            "status": "sucesso",
            "mensagem": "Ação registrada no Data Lake para Feedback Loop (Holdout Group)",
            "registro_id": registro_id,
            "flight_id": flight_id,
            "assento": assento,
            "id_cliente": id_cliente,
            "acao_executada": acao,
            "custo": custo,
            "origem": origem,
            "timestamp": ts,
            "ciclo_mlops": {
                "status": "INGESTED_INTO_SQLITE_LOGS",
                "banco": "mlops_logs.db",
                "tabela": "mlops_feedback",
                "registro_id": registro_id,
                "grupo_controle": "HOLDOUT_10PCT",
                "total_registros_persistidos": total_persistidos,
            },
        }

    def get_action_feedback_logs(self, flight_id: str) -> dict[str, Any]:
        """Consulta os registros salvos no banco SQLite transacional de MLOps para auditoria."""
        self._init_mlops_db()
        db_path = self._get_mlops_db_path()
        with sqlite3.connect(str(db_path)) as con:
            con.row_factory = sqlite3.Row
            rows = con.execute(
                "SELECT * FROM mlops_feedback WHERE flight_id = ? ORDER BY id DESC LIMIT 50",
                (flight_id,),
            ).fetchall()
            return {
                "flight_id": flight_id,
                "total": len(rows),
                "registros": [dict(r) for r in rows],
            }

