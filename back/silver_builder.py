from __future__ import annotations

import logging
import sys
import uuid
from pathlib import Path

import numpy as np
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("azul.silver.builder")

DEFAULT_SEED: int = 42
TOTAL_CLIENTS: int = 5000
MAX_CHRONOLOGICAL_FLIGHTS: int = 8000

# Movido da Bronze para a Silver: Código OACI alvo e candidatos de coluna para isolamento da malha da Azul.
TARGET_AIRLINE_CODE: str = "AZU"
AIRLINE_COLUMN_CANDIDATES: tuple[str, ...] = (
    "ICAO Empresa Aérea",
    "Sigla ICAO Empresa Aérea",
    "EMPRESA",
    "Empresa",
    "Empresa Aérea",
    "SG_EMPRESA_ICAO",
    "sg_empresa_icao",
    "Sigla da Empresa",
    "Designador OACI da Empresa",
)

TIER_CHOICES: tuple[str, ...] = ("Basico", "Topazio", "Safira", "Diamante")
TIER_WEIGHTS: tuple[float, ...] = (0.75, 0.15, 0.07, 0.03)

CLUBE_PROB_BY_TIER: dict[str, float] = {
    "Basico": 0.10,
    "Topazio": 0.40,
    "Safira": 0.70,
    "Diamante": 0.95,
}
COBRANDED_PROB_BY_TIER: dict[str, float] = {
    "Basico": 0.05,
    "Topazio": 0.20,
    "Safira": 0.50,
    "Diamante": 0.80,
}
POINTS_RANGE_BY_TIER: dict[str, tuple[int, int]] = {
    "Basico": (0, 5_000),
    "Topazio": (5_000, 20_000),
    "Safira": (20_000, 50_000),
    "Diamante": (50_000, 200_000),
}

TRIP_WEIGHT_BY_TIER: dict[str, float] = {
    "Basico": 1.0,
    "Topazio": 5.0,
    "Safira": 10.0,
    "Diamante": 20.0,
}

HIGH_IMAGE_RISK_PROB: float = 0.02
MARKETING_CONSENT_PROB: float = 0.85
BAGGAGE_LOSS_BASE_PROB: float = 0.01
BAGGAGE_LOSS_DISRUPTION_PROB: float = 0.03
APP_CHECKIN_FAILURE_PROB: float = 0.02

# Adicionado: Valor padrão de tarifa e léxico determinístico em português para cálculo de `score_sentimento` [-1.0, 1.0].
DEFAULT_FALLBACK_FARE: float = 650.0
SENTIMENT_POSITIVE_LEXICON: dict[str, float] = {
    "impecável": 0.45,
    "excelente": 0.45,
    "confortável": 0.35,
    "prestativa": 0.30,
    "adoro": 0.40,
    "atenciosos": 0.35,
    "suave": 0.25,
    "nota 10": 0.50,
    "grátis": 0.20,
    "funcionou": 0.25,
    "simpatia": 0.30,
    "melhor": 0.35,
    "rápido": 0.25,
    "limpa": 0.25,
    "nova": 0.20,
}
SENTIMENT_NEGATIVE_LEXICON: dict[str, float] = {
    "absurdo": -0.40,
    "perdi": -0.35,
    "pessimo": -0.50,
    "péssimo": -0.50,
    "atrasou": -0.30,
    "atrasso": -0.30,
    "atraso": -0.25,
    "prejudicou": -0.30,
    "cancelaram": -0.45,
    "cancelado": -0.45,
    "cancelamento": -0.45,
    "descaso": -0.45,
    "zero assistência": -0.45,
    "nunca mais": -0.40,
    "fraca": -0.30,
    "quebrada": -0.35,
    "demorado": -0.25,
    "extraviaram": -0.45,
    "extraviada": -0.45,
    "rasgada": -0.35,
    "amassada": -0.30,
    "falta de cuidado": -0.35,
    "danificada": -0.35,
    "quebraram": -0.35,
    "transtorno": -0.35,
    "travou": -0.30,
    "erro": -0.25,
    "fechando sozinho": -0.30,
    "infinitamente": -0.25,
    "falha": -0.30,
    "falhou": -0.30,
}

PNR_ALPHABET: np.ndarray = np.array(list("ABCDEFGHJKLMNPQRSTUVWXYZ23456789"))


def resolve_data_lake_dir() -> Path:
    script_dir = Path(__file__).resolve().parent
    if (script_dir / "data_lake").exists():
        return script_dir / "data_lake"
    return script_dir.parent / "data_lake"


def _find_column(df: pd.DataFrame, candidates: tuple[str, ...]) -> str:
    normalized = {col.strip().lower(): col for col in df.columns}
    for candidate in candidates:
        key = candidate.strip().lower()
        if key in normalized:
            return normalized[key]
    raise KeyError(f"Nenhuma das colunas esperadas {candidates} encontrada em {list(df.columns)}")


# Movido da Bronze para a Silver: Detecta dinamicamente a coluna de companhia aérea nos dados brutos.
def _detect_airline_column(df: pd.DataFrame, airline_code: str = TARGET_AIRLINE_CODE) -> str:
    normalized_map = {col.strip().lower(): col for col in df.columns}
    for candidate in AIRLINE_COLUMN_CANDIDATES:
        key = candidate.strip().lower()
        if key in normalized_map:
            col_name = normalized_map[key]
            sample_vals = df[col_name].dropna().astype(str).str.strip().str.upper()
            if (sample_vals == airline_code).any():
                return col_name

    for col in df.columns:
        col_lower = col.strip().lower()
        if any(token in col_lower for token in ("empresa", "icao", "cia", "oaci")):
            sample_vals = df[col].dropna().astype(str).str.strip().str.upper()
            if (sample_vals == airline_code).any():
                return col

    for col in df.select_dtypes(include=["object", "string"]).columns:
        sample_vals = df[col].dropna().astype(str).str.strip().str.upper()
        if (sample_vals == airline_code).any():
            return col

    raise KeyError(
        f"Nenhuma coluna correspondente à sigla da companhia aérea ('{airline_code}') "
        f"foi encontrada. Colunas disponíveis: {list(df.columns)}"
    )


# Adicionado na Silver: Filtra os registros brutos mantendo exclusivamente os voos da Azul (ICAO == 'AZU').
def filter_azul_flights(
    df_raw_flights: pd.DataFrame,
    airline_code: str = TARGET_AIRLINE_CODE,
) -> pd.DataFrame:
    df_checked = df_raw_flights.copy()
    # Normaliza nomes de colunas brutos (remove BOM e espaços) antes da detecção da coluna ICAO.
    df_checked.columns = [str(col).strip().lstrip("\ufeff").strip('"') for col in df_checked.columns]
    airline_col = _detect_airline_column(df_checked, airline_code=airline_code)
    mask_azul = df_checked[airline_col].astype(str).str.strip().str.upper() == airline_code.upper()
    df_azul = df_checked.loc[mask_azul].copy()
    logger.info(
        "Filtro Silver (ICAO == '%s'): %d linhas brutas -> %d linhas da Azul isoladas (coluna: '%s').",
        airline_code,
        len(df_raw_flights),
        len(df_azul),
        airline_col,
    )
    return df_azul


# Adicionado na Silver: Etapa explícita de normalização de dados (tratamento de nulos e padronização de strings).
def normalize_silver_flights(df_azul_flights: pd.DataFrame) -> pd.DataFrame:
    df = df_azul_flights.copy()

    col_voo = _find_column(df, ("Número Voo", "Numero Voo", "numero_voo"))
    col_origem = _find_column(df, ("ICAO Aeródromo Origem", "Sigla ICAO Aeroporto Origem", "origem"))
    col_destino = _find_column(df, ("ICAO Aeródromo Destino", "Sigla ICAO Aeroporto Destino", "destino"))
    col_prevista = _find_column(df, ("Partida Prevista", "partida_prevista"))
    col_real = _find_column(df, ("Partida Real", "Partida Realizada", "partida_real", "partida_realizada"))
    col_situacao = _find_column(df, ("Situação Voo", "Situacao Voo", "situacao_voo"))

    # Padronização de strings: remoção de espaços excedentes, tratamento de nulos e caixa alta em códigos/status.
    df[col_voo] = df[col_voo].fillna("0000").astype(str).str.strip().str.upper()
    df[col_origem] = df[col_origem].fillna("XXXX").astype(str).str.strip().str.upper()
    df[col_destino] = df[col_destino].fillna("XXXX").astype(str).str.strip().str.upper()
    df[col_situacao] = df[col_situacao].fillna("REALIZADO").astype(str).str.strip().str.upper()

    # Tratamento de nulos em strings de data/hora antes do parsing temporal.
    df[col_prevista] = df[col_prevista].replace({"": np.nan, "nan": np.nan, "None": np.nan})
    df[col_real] = df[col_real].replace({"": np.nan, "nan": np.nan, "None": np.nan})

    # Remove apenas registros sem Partida Prevista válida, preservando integralmente voos CANCELADOS.
    dt_prevista = pd.to_datetime(df[col_prevista], errors="coerce")
    df["_dt_prevista_sort"] = dt_prevista
    df = df[df["_dt_prevista_sort"].notna()].copy()

    dt_prevista_valid = pd.to_datetime(df[col_prevista], errors="coerce")
    dt_real_valid = pd.to_datetime(df[col_real], errors="coerce")

    # Padroniza a representação textual ISO ('YYYY-MM-DD HH:MM:SS') para escrita consistente na Silver.
    df[col_prevista] = dt_prevista_valid.dt.strftime("%Y-%m-%d %H:%M:%S")
    df[col_real] = dt_real_valid.dt.strftime("%Y-%m-%d %H:%M:%S").fillna("")

    is_cancelled = (df[col_situacao] == "CANCELADO") | dt_real_valid.isna()
    raw_delay_minutes = (dt_real_valid - dt_prevista_valid).dt.total_seconds() / 60.0
    realized_delay = raw_delay_minutes.clip(lower=0.0).round(1)
    df["atraso_enfrentado_minutos"] = np.where(is_cancelled, -1.0, realized_delay)

    logger.info("Normalização Silver concluída: %d voos padronizados e validados.", len(df))
    return df


def _generate_deterministic_uuids(n: int, np_rng: np.random.Generator) -> list[str]:
    raw_bytes = np_rng.bytes(16 * n)
    return [
        str(uuid.UUID(bytes=raw_bytes[i * 16 : (i + 1) * 16], version=4))
        for i in range(n)
    ]


def generate_silver_clients(
    num_clients: int = TOTAL_CLIENTS,
    seed: int = DEFAULT_SEED,
) -> pd.DataFrame:
    logger.info("Gerando base persistente de %d clientes (seed=%d)...", num_clients, seed)
    np_rng = np.random.default_rng(seed=seed)

    client_ids = _generate_deterministic_uuids(num_clients, np_rng)
    tiers = np_rng.choice(TIER_CHOICES, size=num_clients, p=TIER_WEIGHTS)

    clube_probs = np.array([CLUBE_PROB_BY_TIER[t] for t in tiers], dtype=np.float64)
    cobranded_probs = np.array([COBRANDED_PROB_BY_TIER[t] for t in tiers], dtype=np.float64)

    assinante_clube = np_rng.random(num_clients) < clube_probs
    cartao_cobranded = np_rng.random(num_clients) < cobranded_probs

    pontos_saldo = np.empty(num_clients, dtype=np.int64)
    for tier_name, (low_pts, high_pts) in POINTS_RANGE_BY_TIER.items():
        mask = tiers == tier_name
        count_tier = int(mask.sum())
        if count_tier > 0:
            pontos_saldo[mask] = np_rng.integers(low_pts, high_pts + 1, size=count_tier)

    perfil_alto_risco_imagem = np_rng.random(num_clients) < HIGH_IMAGE_RISK_PROB
    consentimento_marketing = np_rng.random(num_clients) < MARKETING_CONSENT_PROB
    peso_viagem = np.array([TRIP_WEIGHT_BY_TIER[t] for t in tiers], dtype=np.float64)

    df_clients = pd.DataFrame(
        {
            "id_cliente": pd.Series(client_ids, dtype="string"),
            "tier_fidelidade": pd.Series(tiers, dtype="string"),
            "assinante_clube": assinante_clube.astype(bool),
            "cartao_cobranded": cartao_cobranded.astype(bool),
            "pontos_saldo": pontos_saldo.astype(np.int64),
            "perfil_alto_risco_imagem": perfil_alto_risco_imagem.astype(bool),
            "consentimento_marketing": consentimento_marketing.astype(bool),
            "peso_viagem": peso_viagem,
        }
    )

    logger.info(
        "Clientes gerados com sucesso: %d registros | Tiers: %s",
        len(df_clients),
        df_clients["tier_fidelidade"].value_counts().to_dict(),
    )
    return df_clients


def load_and_prepare_bronze_flights(
    bronze_parquet_path: Path,
    max_flights: int = MAX_CHRONOLOGICAL_FLIGHTS,
) -> pd.DataFrame:
    if not bronze_parquet_path.exists():
        raise FileNotFoundError(
            f"Arquivo Bronze não encontrado em: {bronze_parquet_path}. "
            "Execute primeiro o script `ingestion.py`."
        )

    logger.info("Carregando voos brutos da Camada Bronze: %s", bronze_parquet_path)
    df_raw_flights = pd.read_parquet(bronze_parquet_path)
    logger.info("Total de voos brutos na Bronze: %d", len(df_raw_flights))

    # Alterado: Aplica o filtro de isolamento da Azul (ICAO == 'AZU') e a normalização na entrada da Silver.
    df_azul_flights = filter_azul_flights(df_raw_flights, airline_code=TARGET_AIRLINE_CODE)
    df_normalized = normalize_silver_flights(df_azul_flights)

    df_flights = (
        df_normalized.sort_values("_dt_prevista_sort", kind="mergesort")
        .head(max_flights)
        .drop(columns=["_dt_prevista_sort"])
        .reset_index(drop=True)
    )

    cancelled_count = int((df_flights["atraso_enfrentado_minutos"] == -1.0).sum())
    delayed_count = int((df_flights["atraso_enfrentado_minutos"] > 0.0).sum())
    logger.info(
        "Amostra cronológica preparada: %d voos (%d realizados com atraso > 0 min, %d cancelados preservados).",
        len(df_flights),
        delayed_count,
        cancelled_count,
    )
    return df_flights


def generate_silver_trips(
    df_flights: pd.DataFrame,
    df_clients: pd.DataFrame,
    pnrs_per_flight_range: tuple[int, int] = (5, 15),
    seed: int = DEFAULT_SEED,
) -> pd.DataFrame:
    np_rng = np.random.default_rng(seed=seed)

    col_voo = _find_column(df_flights, ("Número Voo", "Numero Voo", "numero_voo"))
    col_origem = _find_column(
        df_flights,
        ("ICAO Aeródromo Origem", "Sigla ICAO Aeroporto Origem", "origem"),
    )
    col_destino = _find_column(
        df_flights,
        ("ICAO Aeródromo Destino", "Sigla ICAO Aeroporto Destino", "destino"),
    )
    col_prevista = _find_column(df_flights, ("Partida Prevista", "partida_prevista"))
    col_real = _find_column(
        df_flights,
        ("Partida Real", "Partida Realizada", "partida_real", "partida_realizada"),
    )
    col_situacao = _find_column(df_flights, ("Situação Voo", "Situacao Voo", "situacao_voo"))

    client_ids_array = df_clients["id_cliente"].to_numpy()
    weights = df_clients["peso_viagem"].to_numpy(dtype=np.float64)
    prob_weights = weights / weights.sum()
    num_total_clients = len(client_ids_array)

    num_flights = len(df_flights)
    logger.info(
        "Iniciando sorteio longitudinal ponderado (RFM) para %d voos...",
        num_flights,
    )

    pnrs_per_flight = np_rng.integers(
        pnrs_per_flight_range[0],
        pnrs_per_flight_range[1] + 1,
        size=num_flights,
    )
    total_pnrs = int(pnrs_per_flight.sum())
    group_sizes_all = np_rng.integers(1, 5, size=total_pnrs)

    pnr_chars = np_rng.choice(PNR_ALPHABET, size=(total_pnrs + 5000, 6))
    unique_pnrs = pd.unique(np.array(["".join(row) for row in pnr_chars]))
    while len(unique_pnrs) < total_pnrs:
        extra_chars = np_rng.choice(PNR_ALPHABET, size=(5000, 6))
        unique_pnrs = pd.unique(
            np.concatenate([unique_pnrs, np.array(["".join(r) for r in extra_chars])])
        )
    pnr_codes_all = unique_pnrs[:total_pnrs]

    flight_records = df_flights.to_dict(orient="records")

    all_client_ids: list[np.ndarray] = []
    all_pnrs: list[np.ndarray] = []
    all_voos: list[str] = []
    all_origens: list[str] = []
    all_destinos: list[str] = []
    all_previstas: list[str] = []
    all_reais: list[str] = []
    all_situacoes: list[str] = []
    all_atrasos: list[float] = []
    flight_pax_counts: list[int] = []

    pnr_cursor = 0
    for flight_idx, f_dict in enumerate(flight_records):
        n_pnrs = int(pnrs_per_flight[flight_idx])
        flight_group_sizes = group_sizes_all[pnr_cursor : pnr_cursor + n_pnrs]
        flight_pnr_codes = pnr_codes_all[pnr_cursor : pnr_cursor + n_pnrs]
        pnr_cursor += n_pnrs

        total_pax_in_flight = int(flight_group_sizes.sum())
        effective_pax = min(total_pax_in_flight, num_total_clients)

        # Sorteio longitudinal sem reposição no mesmo voo ponderado por `peso_viagem` (RFM).
        chosen_indices = np_rng.choice(
            num_total_clients,
            size=effective_pax,
            replace=False,
            p=prob_weights,
        )
        all_client_ids.append(client_ids_array[chosen_indices])
        all_pnrs.append(np.repeat(flight_pnr_codes, flight_group_sizes)[:effective_pax])

        flight_pax_counts.append(effective_pax)
        all_voos.append(str(f_dict[col_voo]))
        all_origens.append(str(f_dict[col_origem]))
        all_destinos.append(str(f_dict[col_destino]))
        all_previstas.append(str(f_dict[col_prevista]))
        all_reais.append(str(f_dict[col_real]))
        all_situacoes.append(str(f_dict[col_situacao]))
        all_atrasos.append(float(f_dict["atraso_enfrentado_minutos"]))

    repeats = np.array(flight_pax_counts, dtype=np.int64)
    total_trips = int(repeats.sum())

    atraso_series = np.repeat(np.array(all_atrasos, dtype=np.float64), repeats)
    situacao_series = np.repeat(np.array(all_situacoes, dtype=object), repeats)

    sofreu_disrupcao = (atraso_series > 0.0) | (atraso_series < 0.0) | (situacao_series == "CANCELADO")
    baggage_probs = np.where(
        sofreu_disrupcao,
        BAGGAGE_LOSS_DISRUPTION_PROB,
        BAGGAGE_LOSS_BASE_PROB,
    )
    teve_bagagem_extraviada = np_rng.random(total_trips) < baggage_probs
    falha_app_checkin = np_rng.random(total_trips) < APP_CHECKIN_FAILURE_PROB

    df_trips = pd.DataFrame(
        {
            "id_cliente": pd.Series(np.concatenate(all_client_ids), dtype="string"),
            "pnr": pd.Series(np.concatenate(all_pnrs), dtype="string"),
            "numero_voo": pd.Series(np.repeat(all_voos, repeats), dtype="string"),
            "origem": pd.Series(np.repeat(all_origens, repeats), dtype="string"),
            "destino": pd.Series(np.repeat(all_destinos, repeats), dtype="string"),
            "partida_prevista": pd.Series(np.repeat(all_previstas, repeats), dtype="string"),
            "partida_real": pd.Series(np.repeat(all_reais, repeats), dtype="string"),
            "situacao_voo": pd.Series(situacao_series, dtype="string"),
            "atraso_enfrentado_minutos": atraso_series,
            "teve_bagagem_extraviada": teve_bagagem_extraviada.astype(bool),
            "falha_app_checkin": falha_app_checkin.astype(bool),
        }
    )

    logger.info(
        "Histórico de viagens gerado: %d passagens em %d PNRs para %d clientes distintos.",
        len(df_trips),
        total_pnrs,
        df_trips["id_cliente"].nunique(),
    )
    return df_trips


# Adicionado: Lê `tarifas_azul.parquet`, calcula a tarifa média por par (origem, destino) e faz merge em `viagens_silver`.
def enrich_trips_with_fares(
    df_trips: pd.DataFrame,
    bronze_tarifas_path: Path,
    airline_code: str = TARGET_AIRLINE_CODE,
) -> pd.DataFrame:
    if not bronze_tarifas_path.exists():
        logger.warning(
            "Arquivo %s não encontrado; preenchendo valor_pago_tarifa com valor padrão %.2f.",
            bronze_tarifas_path,
            DEFAULT_FALLBACK_FARE,
        )
        df_out = df_trips.copy()
        df_out["valor_pago_tarifa"] = DEFAULT_FALLBACK_FARE
        return df_out

    logger.info("Carregando tarifas da Camada Bronze: %s", bronze_tarifas_path)
    df_tarifas_raw = pd.read_parquet(bronze_tarifas_path)
    df_tarifas_raw.columns = [
        str(col).strip().lstrip("\ufeff").strip('"') for col in df_tarifas_raw.columns
    ]

    # Filtra registros tarifários da Azul (caso a Bronze contenha múltiplas companhias) e converte valores monetários.
    airline_col = _detect_airline_column(df_tarifas_raw, airline_code=airline_code)
    df_tarifas = df_tarifas_raw[
        df_tarifas_raw[airline_col].astype(str).str.strip().str.upper() == airline_code.upper()
    ].copy()

    col_orig = _find_column(df_tarifas, ("sg_icao_origem", "ORIGEM", "origem"))
    col_dest = _find_column(df_tarifas, ("sg_icao_destino", "DESTINO", "destino"))
    col_val = _find_column(df_tarifas, ("nr_tarifa", "TARIFA", "tarifa", "valor_tarifa"))

    df_tarifas["_origem_clean"] = df_tarifas[col_orig].astype(str).str.strip().str.upper()
    df_tarifas["_destino_clean"] = df_tarifas[col_dest].astype(str).str.strip().str.upper()
    df_tarifas["_tarifa_num"] = pd.to_numeric(
        df_tarifas[col_val].astype(str).str.replace(",", ".", regex=False).str.strip(),
        errors="coerce",
    )
    df_tarifas = df_tarifas[df_tarifas["_tarifa_num"].notna() & (df_tarifas["_tarifa_num"] > 0.0)]

    # Calcula a tarifa média agregada por rota (par de aeródromos Origem e Destino).
    df_route_fares = (
        df_tarifas.groupby(["_origem_clean", "_destino_clean"], as_index=False)["_tarifa_num"]
        .mean()
        .rename(
            columns={
                "_origem_clean": "origem",
                "_destino_clean": "destino",
                "_tarifa_num": "valor_pago_tarifa",
            }
        )
    )
    df_route_fares["valor_pago_tarifa"] = df_route_fares["valor_pago_tarifa"].round(2)

    global_mean_fare = (
        round(float(df_tarifas["_tarifa_num"].mean()), 2)
        if not df_tarifas.empty
        else DEFAULT_FALLBACK_FARE
    )

    # Faz LEFT MERGE da tarifa média por par (origem, destino) e preenche rotas sem cobertura com a média geral.
    df_enriched = df_trips.merge(df_route_fares, on=["origem", "destino"], how="left")
    df_enriched["valor_pago_tarifa"] = (
        df_enriched["valor_pago_tarifa"].fillna(global_mean_fare).astype(np.float64)
    )

    logger.info(
        "Enriquecimento tarifário concluído: %d rotas mapeadas (tarifa média global de fallback: R$ %.2f).",
        len(df_route_fares),
        global_mean_fare,
    )
    return df_enriched


# Adicionado: Calcula o score de sentimento determinístico [-1.0, 1.0] combinando léxico NLP em PT-BR e polaridade textual.
def _compute_text_sentiment_score(text: str) -> float:
    text_lower = str(text).lower()
    raw_score = 0.0
    matched_terms = 0

    for token, weight in SENTIMENT_POSITIVE_LEXICON.items():
        if token in text_lower:
            raw_score += weight
            matched_terms += 1

    for token, weight in SENTIMENT_NEGATIVE_LEXICON.items():
        if token in text_lower:
            raw_score += weight
            matched_terms += 1

    if "!" in text_lower and raw_score != 0.0:
        raw_score *= 1.10

    if matched_terms == 0:
        return 0.0

    return round(float(np.clip(raw_score, -1.0, 1.0)), 4)


# Adicionado: Lê `avaliacoes_bronze.parquet`, aplica análise de sentimento (`score_sentimento`) e salva `avaliacoes_silver.parquet`.
def process_silver_reviews(
    bronze_reviews_path: Path,
    silver_reviews_output_path: Path,
) -> Path:
    if not bronze_reviews_path.exists():
        raise FileNotFoundError(
            f"Arquivo de avaliações Bronze não encontrado em: {bronze_reviews_path}. "
            "Execute primeiro o script `generate_reviews_bronze.py`."
        )

    logger.info("Carregando avaliações da Camada Bronze: %s", bronze_reviews_path)
    df_reviews = pd.read_parquet(bronze_reviews_path).copy()

    # Aplica análise de sentimento NLP determinística gerando `score_sentimento` no intervalo [-1.0, 1.0].
    df_reviews["score_sentimento"] = (
        df_reviews["texto_avaliacao"].map(_compute_text_sentiment_score).astype(np.float64)
    )

    silver_reviews_output_path.parent.mkdir(parents=True, exist_ok=True)
    df_reviews.to_parquet(
        silver_reviews_output_path,
        engine="pyarrow",
        compression="snappy",
        index=False,
    )
    logger.info(
        "Avaliações Silver processadas (%d linhas, média score_sentimento=%.3f) e salvas em: %s",
        len(df_reviews),
        float(df_reviews["score_sentimento"].mean()),
        silver_reviews_output_path,
    )
    return silver_reviews_output_path


def run_silver_pipeline() -> dict[str, Path]:
    data_lake_dir = resolve_data_lake_dir()
    bronze_parquet_path = data_lake_dir / "bronze" / "voos_historico_azul.parquet"
    # Adicionado: Caminhos de entrada da Bronze para tarifas e avaliações e saída `avaliacoes_silver.parquet`.
    bronze_tarifas_path = data_lake_dir / "bronze" / "tarifas_azul.parquet"
    bronze_reviews_path = data_lake_dir / "bronze" / "avaliacoes_bronze.parquet"
    silver_dir = data_lake_dir / "silver"
    silver_dir.mkdir(parents=True, exist_ok=True)

    clientes_output_path = silver_dir / "clientes_silver.parquet"
    viagens_output_path = silver_dir / "viagens_silver.parquet"
    avaliacoes_output_path = silver_dir / "avaliacoes_silver.parquet"

    df_clients_full = generate_silver_clients(num_clients=TOTAL_CLIENTS, seed=DEFAULT_SEED)
    df_flights = load_and_prepare_bronze_flights(
        bronze_parquet_path=bronze_parquet_path,
        max_flights=MAX_CHRONOLOGICAL_FLIGHTS,
    )
    df_trips = generate_silver_trips(
        df_flights=df_flights,
        df_clients=df_clients_full,
        seed=DEFAULT_SEED,
    )
    # Adicionado: Enriquecimento monetário das viagens com `valor_pago_tarifa` antes do salvamento em Parquet.
    df_trips = enrich_trips_with_fares(
        df_trips=df_trips,
        bronze_tarifas_path=bronze_tarifas_path,
        airline_code=TARGET_AIRLINE_CODE,
    )

    client_cols = [
        "id_cliente",
        "tier_fidelidade",
        "assinante_clube",
        "cartao_cobranded",
        "pontos_saldo",
        "perfil_alto_risco_imagem",
        "consentimento_marketing",
        "peso_viagem",
    ]
    df_clients_to_save = df_clients_full[client_cols]

    trips_per_client = df_trips.groupby("id_cliente").size().rename("qtd_viagens")
    df_stats = df_clients_to_save.merge(trips_per_client, on="id_cliente", how="left")
    df_stats["qtd_viagens"] = df_stats["qtd_viagens"].fillna(0)
    avg_trips_by_tier = (
        df_stats.groupby("tier_fidelidade")["qtd_viagens"].mean().round(2).to_dict()
    )
    logger.info("Média de viagens por cliente em cada Tier (RFM): %s", avg_trips_by_tier)

    df_clients_to_save.to_parquet(
        clientes_output_path,
        engine="pyarrow",
        compression="snappy",
        index=False,
    )
    logger.info("Salvo com sucesso: %s", clientes_output_path)

    df_trips.to_parquet(
        viagens_output_path,
        engine="pyarrow",
        compression="snappy",
        index=False,
    )
    logger.info("Salvo com sucesso: %s", viagens_output_path)

    # Adicionado: Executa o processamento de NLP das avaliações gerando `avaliacoes_silver.parquet`.
    process_silver_reviews(
        bronze_reviews_path=bronze_reviews_path,
        silver_reviews_output_path=avaliacoes_output_path,
    )

    return {
        "clientes_silver": clientes_output_path,
        "viagens_silver": viagens_output_path,
        "avaliacoes_silver": avaliacoes_output_path,
    }


if __name__ == "__main__":
    run_silver_pipeline()
