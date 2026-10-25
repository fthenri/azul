from __future__ import annotations

import logging
from typing import Any, List

from back.app.config import Settings, get_settings
from back.app.core.exceptions import EntityNotFoundError
from back.app.infrastructure.analytics.duckdb_client import DuckDBClient
from back.app.schemas.simulation import (
    AcaoRecomendadaLote,
    AssentoCliente,
    AssentoVoo,
    ListaVoosResponse,
    LoteAcoes,
    MetadataAeronave,
    ResumoLote,
    SimularBordoResponse,
    VooDetalheResponse,
    VooMalhaResumo,
    VooSimuladoResponse,
)
from back.executor_decisao import (
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
    """Aloca passageiros na aeronave calibrando Espaço Azul (1-4), coesão de PNR e assentos vazios orgânicos."""
    if not passageiros_raw:
        return []

    espaco_azul_max = 2 if codigo_modelo == "ATR 72-600" else 4
    is_6_seats = len(layout) == 6

    # 1. Agrupamento por PNR e contagem de tamanho do grupo
    pnr_groups: dict[str, list[dict[str, Any]]] = {}
    for p in passageiros_raw:
        pnr = str(p.get("pnr") or "SOLO")
        pnr_groups.setdefault(pnr, []).append(p)

    # Ordena passageiros internamente em cada grupo por Tier/CLV
    for pnr, grp in pnr_groups.items():
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
        pnr_groups.values(),
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
            if size == 3:
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
            elif size == 4:
                for cand in [["A", "B", "C", "D"], ["C", "D", "E", "F"], ["B", "C", "D", "E"]]:
                    if all(grid[row][c] is None for c in cand):
                        return cand
            elif size == 1:
                # Preferência solo: Janela -> Corredor -> Meio
                for c in ["A", "F", "C", "D", "B", "E"]:
                    if grid[row][c] is None:
                        return [c]
        else:
            # Layout 2x2 (A, B - C, D)
            left = ["A", "B"]
            right = ["C", "D"]
            if size == 2:
                if all(grid[row][c] is None for c in left):
                    return left
                if all(grid[row][c] is None for c in right):
                    return right
            elif size == 1:
                for c in ["A", "D", "B", "C"]:
                    if grid[row][c] is None:
                        return [c]
            elif size == 4:
                if all(grid[row][c] is None for c in layout):
                    return layout
            elif size == 3:
                if grid[row]["A"] is None and grid[row]["B"] is None and grid[row]["C"] is None:
                    return ["A", "B", "C"]
                if grid[row]["B"] is None and grid[row]["C"] is None and grid[row]["D"] is None:
                    return ["B", "C", "D"]
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
    # Grupos (size >= 2) distribuídos organicamente em assentos contíguos
    # -------------------------------------------------------------------------
    multi_groups = [g for g in remaining_groups if len(g) > 1]
    solo_groups = [g for g in remaining_groups if len(g) == 1]

    # Distribui grupos com espaçamento dinâmico proporcional em toda a extensão da cabine principal
    main_start = espaco_azul_max + 1
    main_end = max(fileiras - 4, main_start)
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
                    if main_start <= candidate_r <= fileiras - 2:
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
            for pax, col in zip(g, block):
                grid[chosen_row][col] = pax

    # -------------------------------------------------------------------------
    # REGRA 2: Alocação Orgânica de Assentos Vazios (Passageiros Solo)
    # Passageiros solo escolhem Janela e Corredor primeiro.
    # Assentos vazios sobram organicamente nos assentos do meio ('B' e 'E') e fundo!
    # -------------------------------------------------------------------------
    def seat_desirability(r: int, c: str) -> float:
        score = 0.0
        # Sobras do Espaço Azul têm altíssima preferência para solo
        if r <= espaco_azul_max:
            score += 500.0

        if is_6_seats:
            if c in ("A", "F"):
                score += 150.0  # Janela
            elif c in ("C", "D"):
                score += 120.0  # Corredor
            else:
                score += 15.0   # Assento do meio (B/E) evitado por solo travelers
        else:
            if c in ("A", "D"):
                score += 150.0  # Janela
            else:
                score += 120.0  # Corredor

        # Preferência por fileiras dianteiras e médias sobre as últimas fileiras
        score += (fileiras - r) * 2.5
        if r >= fileiras - 2:
            score -= 100.0  # Penalidade para as últimas fileiras (banheiro/galley)

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
        sql = f"""
        SELECT 
            v.numero_voo,
            v.origem,
            v.destino,
            MIN(v.partida_prevista) AS partida_prevista,
            MIN(v.partida_real) AS partida_real,
            COUNT(DISTINCT v.id_cliente) AS total_passageiros,
            COUNT(DISTINCT v.pnr) AS total_pnrs,
            SUM(CASE WHEN e.risco_evasao > 0.60 THEN 1 ELSE 0 END) AS passageiros_criticos,
            SUM(CASE WHEN c.faixa_pareto IN ('Top 10% Receita', 'Top 20% Receita') THEN 1 ELSE 0 END) AS passageiros_vip,
            ROUND(AVG(COALESCE(v.atraso_enfrentado_minutos, 0)), 1) AS atraso_medio_minutos,
            MIN(COALESCE(v.situacao_voo, 'REALIZADO')) AS status_operacional
        FROM silver_viagens v
        LEFT JOIN gold_clv c ON v.id_cliente = c.id_cliente
        LEFT JOIN gold_evasao e ON v.id_cliente = e.id_cliente
        GROUP BY v.numero_voo, v.origem, v.destino
        ORDER BY total_passageiros DESC
        LIMIT {limit}
        """
        rows = self.duckdb_client.query(sql)
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
                    partida_prevista=str(r.get("partida_prevista") or "2026-08-01 12:00:00"),
                    partida_real=str(r.get("partida_real")) if r.get("partida_real") else None,
                    status_operacional=str(r.get("status_operacional") or "REALIZADO"),
                    total_passageiros=int(r.get("total_passageiros") or 0),
                    total_pnrs=int(r.get("total_pnrs") or 0),
                    passageiros_criticos=int(r.get("passageiros_criticos") or 0),
                    passageiros_vip=int(r.get("passageiros_vip") or 0),
                    atraso_medio_minutos=float(r.get("atraso_medio_minutos") or 0.0),
                )
            )
        return ListaVoosResponse(total_voos=len(voos), voos=voos)

    def get_flight_details(self, flight_id: str) -> VooDetalheResponse:
        """Recupera os passageiros reais de um voo com alocação inteligente por PNR e ações de bordo em lote."""
        flight_clean = str(flight_id).upper().replace("AD", "").replace(" ", "").strip()
        if not flight_clean:
            flight_clean = "6002"

        sql_passengers = """
        SELECT 
            v.id_cliente,
            COALESCE(v.pnr, 'SOLO') AS pnr,
            v.numero_voo,
            v.origem,
            v.destino,
            v.partida_prevista,
            v.partida_real,
            COALESCE(v.situacao_voo, 'REALIZADO') AS status_operacional,
            s.tier_fidelidade,
            p.persona,
            ROUND(c.clv_previsto, 2) AS clv_previsto,
            c.faixa_pareto,
            ROUND(e.risco_evasao, 4) AS risco_evasao,
            ROUND(e.score_atrito_acumulado, 2) AS score_atrito_acumulado,
            ROUND(COALESCE(c.clv_previsto, 0) * COALESCE(e.risco_evasao, 0), 2) AS valor_em_risco
        FROM silver_viagens v
        JOIN gold_clv c ON v.id_cliente = c.id_cliente
        JOIN gold_evasao e ON v.id_cliente = e.id_cliente
        JOIN gold_personas p ON v.id_cliente = p.id_cliente
        JOIN silver_clientes s ON v.id_cliente = s.id_cliente
        WHERE v.numero_voo = ?
        ORDER BY valor_em_risco DESC
        """
        rows = self.duckdb_client.query(sql_passengers, [flight_clean])
        if not rows:
            # Fallback para o voo 6002 se o voo solicitado não tiver passageiros
            flight_clean = "6002"
            rows = self.duckdb_client.query(sql_passengers, [flight_clean])

        first_row = rows[0] if rows else {}
        origem = str(first_row.get("origem") or "SBSP")
        destino = str(first_row.get("destino") or "SBFI")
        partida = str(first_row.get("partida_prevista") or "2026-08-01 12:05:00")
        status_op = str(first_row.get("status_operacional") or "REALIZADO")

        # Seleciona aeronave (A320neo como padrão para malha de 60 pax)
        aeronave = FROTA_AZUL["A320neo"]
        fileiras = int(aeronave["fileiras"])
        layout = list(aeronave["layout"])
        assentos_codigos: list[str] = [
            f"{row}{col}" for row in range(1, fileiras + 1) for col in layout
        ]
        total_assentos_aeronave = len(assentos_codigos)

        # 1. Contagem de grupos por PNR
        pnr_counts: dict[str, int] = {}
        for r in rows:
            pnr = str(r.get("pnr") or "SOLO")
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
            pnr = str(p.get("pnr") or "SOLO")
            tamanho_grupo = pnr_counts.get(pnr, 1)
            is_grupo_familiar = tamanho_grupo > 1

            risco = float(p.get("risco_evasao") or 0.0)
            pareto = str(p.get("faixa_pareto") or "Cauda Longa")
            if risco > 0.60:
                status = "critico"
            elif pareto in ("Top 10% Receita", "Top 20% Receita"):
                status = "vip"
            else:
                status = "normal"

            cliente_dto = AssentoCliente(
                id_cliente=str(p["id_cliente"]),
                nome=gerar_nome_passageiro(p["id_cliente"]),
                tier_fidelidade=str(p.get("tier_fidelidade") or "Azul"),
                persona=str(p.get("persona") or "Turista Eventual"),
                clv_previsto=float(p.get("clv_previsto") or 0.0),
                faixa_pareto=pareto,
                risco_evasao=risco,
                score_atrito_acumulado=float(p.get("score_atrito_acumulado") or 0.0),
                pnr=pnr,
                tamanho_grupo=tamanho_grupo,
                is_grupo_familiar=is_grupo_familiar,
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
            instrucao = (
                instrucoes_lote[i]
                if i < len(instrucoes_lote)
                else "Atendimento humanizado recomendado."
            )
            acao_tecnica = str(decisao.get("acao_vencedora", "ABORDAGEM_CHEFE_CABINE"))
            rotulo_acao = ROTULOS_ACOES_BORDO.get(acao_tecnica) or acao_tecnica
            custo = float(decisao.get("custo_acao") or 0.0)
            retorno = float(decisao.get("retorno_liquido") or 0.0)
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
        detalhe = self.get_flight_details("6002")

        if modelo_aeronave and modelo_aeronave in FROTA_AZUL:
            aeronave = FROTA_AZUL[modelo_aeronave]
            fileiras = int(aeronave["fileiras"])
            layout = list(aeronave["layout"])
            assentos_codigos = [
                f"{row}{col}" for row in range(1, fileiras + 1) for col in layout
            ]
            total_assentos = len(assentos_codigos)

            assentos_adaptados: List[AssentoVoo] = []
            base_pax = detalhe.assentos
            for idx, seat_code in enumerate(assentos_codigos):
                template = base_pax[idx % len(base_pax)]
                assentos_adaptados.append(
                    AssentoVoo(
                        assento=seat_code,
                        status=template.status,
                        dados_cliente=template.dados_cliente,
                    )
                )

            metadata = MetadataAeronave(
                modelo=str(aeronave["modelo"]),
                codigo=str(aeronave["codigo"]),
                fileiras=fileiras,
                layout=layout,
                total_assentos=total_assentos,
            )
            return VooSimuladoResponse(
                flight_id=detalhe.id,
                metadata_aeronave=metadata,
                assentos=assentos_adaptados,
                lote_acoes=detalhe.lote_acoes,
            )

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
               c.faixa_pareto, e.risco_evasao, e.score_atrito_acumulado
        FROM gold_clv c
        JOIN gold_evasao e ON c.id_cliente = e.id_cliente
        JOIN gold_personas p ON c.id_cliente = p.id_cliente
        JOIN silver_clientes s ON c.id_cliente = s.id_cliente
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
        rotulo_acao: str = ROTULOS_ACOES_BORDO.get(acao_vencedora) or acao_vencedora

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
            custo_acao=float(decisao.get("custo_acao", 0.0)),
            retorno_liquido=float(decisao.get("retorno_liquido", 0.0)),
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
            },
        )

