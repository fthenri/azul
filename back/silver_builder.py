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

TRIP_LOGNORMAL_PARAMS_BY_TIER: dict[str, tuple[float, float]] = {
    "Basico": (0.45, 0.55),
    "Topazio": (1.45, 0.45),
    "Safira": (2.30, 0.40),
    "Diamante": (3.05, 0.35),
}

DISRUPTION_SENSITIVITY_BY_TIER: dict[str, float] = {
    "Basico": 0.85,
    "Topazio": 1.05,
    "Safira": 1.25,
    "Diamante": 1.45,
}

HIGH_IMAGE_RISK_PROB: float = 0.02
MARKETING_CONSENT_PROB: float = 0.85
BAGGAGE_LOSS_BASE_PROB: float = 0.01
BAGGAGE_LOSS_DISRUPTION_PROB: float = 0.03
APP_CHECKIN_FAILURE_PROB: float = 0.02

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
    "inadmissível": -0.45,
    "prejuízo": -0.40,
    "violada": -0.40,
    "inoperante": -0.35,
    "desrespeito": -0.40,
    "fantástica": 0.45,
    "acolhedores": 0.35,
    "impecáveis": 0.45,
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


def filter_azul_flights(
    df_raw_flights: pd.DataFrame,
    airline_code: str = TARGET_AIRLINE_CODE,
) -> pd.DataFrame:
    df_checked = df_raw_flights.copy()
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


def normalize_silver_flights(df_azul_flights: pd.DataFrame) -> pd.DataFrame:
    df = df_azul_flights.copy()

    col_voo = _find_column(df, ("Número Voo", "Numero Voo", "numero_voo"))
    col_origem = _find_column(df, ("ICAO Aeródromo Origem", "Sigla ICAO Aeroporto Origem", "origem"))
    col_destino = _find_column(df, ("ICAO Aeródromo Destino", "Sigla ICAO Aeroporto Destino", "destino"))
    col_prevista = _find_column(df, ("Partida Prevista", "partida_prevista"))
    col_real = _find_column(df, ("Partida Real", "Partida Realizada", "partida_real", "partida_realizada"))
    col_situacao = _find_column(df, ("Situação Voo", "Situacao Voo", "situacao_voo"))

    df[col_voo] = df[col_voo].fillna("0000").astype(str).str.strip().str.upper()
    df[col_origem] = df[col_origem].fillna("XXXX").astype(str).str.strip().str.upper()
    df[col_destino] = df[col_destino].fillna("XXXX").astype(str).str.strip().str.upper()
    df[col_situacao] = df[col_situacao].fillna("REALIZADO").astype(str).str.strip().str.upper()

    df[col_prevista] = df[col_prevista].replace({"": np.nan, "nan": np.nan, "None": np.nan})
    df[col_real] = df[col_real].replace({"": np.nan, "nan": np.nan, "None": np.nan})

    dt_prevista = pd.to_datetime(df[col_prevista], errors="coerce")
    df["_dt_prevista_sort"] = dt_prevista
    df = df[df["_dt_prevista_sort"].notna()].copy()

    dt_prevista_valid = pd.to_datetime(df[col_prevista], errors="coerce")
    dt_real_valid = pd.to_datetime(df[col_real], errors="coerce")

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
    peso_viagem = np.empty(num_clients, dtype=np.float64)

    for tier_name, (low_pts, high_pts) in POINTS_RANGE_BY_TIER.items():
        mask = tiers == tier_name
        count_tier = int(mask.sum())
        if count_tier > 0:
            pontos_saldo[mask] = np_rng.integers(low_pts, high_pts + 1, size=count_tier)
            # Injeção de variância log-normal individual no peso de propensão a viagens (maioria 1-3 voos, cauda longa realista sem clones).
            mu_log, sigma_log = TRIP_LOGNORMAL_PARAMS_BY_TIER[tier_name]
            peso_viagem[mask] = np.clip(
                np_rng.lognormal(mean=mu_log, sigma=sigma_log, size=count_tier),
                0.5,
                45.0,
            ).round(4)

    perfil_alto_risco_imagem = np_rng.random(num_clients) < HIGH_IMAGE_RISK_PROB
    consentimento_marketing = np_rng.random(num_clients) < MARKETING_CONSENT_PROB

    # Atribuição interna do perfil_experiencia: 85% Satisfeitos e 15% Atritados para desacoplar frequência de atritos severos
    perfil_experiencia = np_rng.choice(["Satisfeito", "Atritado"], size=num_clients, p=[0.85, 0.15])

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
            "perfil_experiencia": pd.Series(perfil_experiencia, dtype="string"),
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
    pnrs_per_flight_range: tuple[int, int] = (1, 3),
    seed: int = DEFAULT_SEED,
    anac_tarifas_bronze_path: Path | None = None,
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
    tiers_array = df_clients["tier_fidelidade"].to_numpy()
    base_weights = df_clients["peso_viagem"].to_numpy(dtype=np.float64)
    # Mapeamento do perfil_experiencia do cliente proprietário da viagem
    perfil_array = df_clients["perfil_experiencia"].to_numpy()
    tier_disruption_mult = np.array(
        [DISRUPTION_SENSITIVITY_BY_TIER.get(str(t), 1.0) for t in tiers_array],
        dtype=np.float64,
    )

    prob_weights_normal = base_weights / base_weights.sum()
    # Ponderação não-linear de exposição a voos com atraso/cancelamento condicionada ao tier_fidelidade e à frequência log-normal.
    disruption_weights = base_weights * tier_disruption_mult
    prob_weights_disrupted = disruption_weights / disruption_weights.sum()

    num_total_clients = len(client_ids_array)
    num_flights = len(df_flights)
    logger.info(
        "Iniciando sorteio longitudinal log-normal para %d voos...",
        num_flights,
    )

    pnrs_per_flight = np_rng.integers(
        pnrs_per_flight_range[0],
        pnrs_per_flight_range[1] + 1,
        size=num_flights,
    )
    total_pnrs = int(pnrs_per_flight.sum())
    # Amostragem não-uniforme do tamanho do grupo PNR (concentração em 1-2 passageiros para viajantes solo/executivos e cauda 3-4 para famílias).
    group_sizes_all = np_rng.choice([1, 2, 3, 4], size=total_pnrs, p=[0.48, 0.27, 0.15, 0.10])

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
    all_client_tiers: list[np.ndarray] = []
    all_client_perfil: list[np.ndarray] = []
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

        atraso_voo = float(f_dict["atraso_enfrentado_minutos"])
        situacao_voo = str(f_dict[col_situacao])
        is_disrupted_flight = (atraso_voo > 15.0) or (atraso_voo < 0.0) or (situacao_voo == "CANCELADO")
        active_probs = prob_weights_disrupted if is_disrupted_flight else prob_weights_normal

        chosen_indices = np_rng.choice(
            num_total_clients,
            size=effective_pax,
            replace=False,
            p=active_probs,
        )
        all_client_ids.append(client_ids_array[chosen_indices])
        all_client_tiers.append(tiers_array[chosen_indices])
        all_client_perfil.append(perfil_array[chosen_indices])
        all_pnrs.append(np.repeat(flight_pnr_codes, flight_group_sizes)[:effective_pax])

        flight_pax_counts.append(effective_pax)
        all_voos.append(str(f_dict[col_voo]))
        all_origens.append(str(f_dict[col_origem]))
        all_destinos.append(str(f_dict[col_destino]))
        all_previstas.append(str(f_dict[col_prevista]))
        all_reais.append(str(f_dict[col_real]))
        all_situacoes.append(situacao_voo)
        all_atrasos.append(atraso_voo)

    # Garantia de cobertura mínima (1 a 2 voos) para clientes da cauda longa que não foram sorteados na malha inicial.
    assigned_clients = set(np.concatenate(all_client_ids).tolist())
    missing_mask = ~np.isin(client_ids_array, list(assigned_clients))
    missing_indices = np.where(missing_mask)[0]
    if len(missing_indices) > 0:
        extra_flight_Basic = np_rng.integers(0, num_flights, size=len(missing_indices))
        extra_pnr_chars = np_rng.choice(PNR_ALPHABET, size=(len(missing_indices) * 2, 6))
        extra_pnrs = pd.unique(np.array(["".join(row) for row in extra_pnr_chars]))[: len(missing_indices)]
        for idx_pos, client_idx in enumerate(missing_indices):
            f_dict = flight_records[int(extra_flight_Basic[idx_pos])]
            all_client_ids.append(np.array([client_ids_array[client_idx]]))
            all_client_tiers.append(np.array([tiers_array[client_idx]]))
            all_client_perfil.append(np.array([perfil_array[client_idx]]))
            all_pnrs.append(np.array([extra_pnrs[idx_pos]]))
            flight_pax_counts.append(1)
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
    partida_prevista_series = np.repeat(np.array(all_previstas, dtype=object), repeats)
    partida_real_series = np.repeat(np.array(all_reais, dtype=object), repeats)
    trip_tiers = np.concatenate(all_client_tiers)
    trip_perfil = np.concatenate(all_client_perfil)

    # Injeção de ruído gaussiano nos minutos de atraso positivo (conexões/desembarque) para eliminar clones de score de atrito.
    positive_delay_mask = atraso_series > 0.0
    delay_gaussian_noise = np.clip(
        np_rng.normal(loc=1.0, scale=0.18, size=total_trips),
        0.65,
        1.45,
    )
    atraso_series = np.where(
        positive_delay_mask,
        np.round(atraso_series * delay_gaussian_noise, 0).astype(np.float64),
        atraso_series,
    )

    tier_pain_factor = np.array(
        [DISRUPTION_SENSITIVITY_BY_TIER.get(str(t), 1.0) for t in trip_tiers],
        dtype=np.float64,
    )
    sofreu_disrupcao = (atraso_series > 0.0) | (atraso_series < 0.0) | (situacao_series == "CANCELADO")
    baggage_probs = np.where(
        sofreu_disrupcao,
        BAGGAGE_LOSS_DISRUPTION_PROB * tier_pain_factor,
        BAGGAGE_LOSS_BASE_PROB * tier_pain_factor,
    )
    teve_bagagem_extraviada = np_rng.random(total_trips) < np.clip(baggage_probs, 0.005, 0.12)
    falha_app_checkin = np_rng.random(total_trips) < np.clip(
        APP_CHECKIN_FAILURE_PROB * tier_pain_factor,
        0.005,
        0.08,
    )

    # Aplicação de máscara nos atritos condicionada ao perfil_experiencia: blindagem para 'Satisfeito' e concentração em 'Atritado'
    is_satisfeito = trip_perfil == "Satisfeito"
    situacao_series = np.where(is_satisfeito, "REALIZADO", situacao_series)
    partida_real_series = np.where(
        is_satisfeito & (partida_real_series == ""),
        partida_prevista_series,
        partida_real_series,
    )
    teve_bagagem_extraviada = np.where(is_satisfeito, False, teve_bagagem_extraviada)
    falha_app_checkin = np.where(is_satisfeito, False, falha_app_checkin)

    n_trips_sat = int(is_satisfeito.sum())
    mild_delay_prob = np_rng.random(n_trips_sat) < 0.03
    sat_delay_noise = np.where(
        mild_delay_prob,
        np.round(np_rng.uniform(5.0, 15.0, size=n_trips_sat), 0).astype(np.float64),
        0.0,
    )
    atraso_series[is_satisfeito] = sat_delay_noise

    df_trips = pd.DataFrame(
        {
            "id_cliente": pd.Series(np.concatenate(all_client_ids), dtype="string"),
            "pnr": pd.Series(np.concatenate(all_pnrs), dtype="string"),
            "numero_voo": pd.Series(np.repeat(all_voos, repeats), dtype="string"),
            "origem": pd.Series(np.repeat(all_origens, repeats), dtype="string"),
            "destino": pd.Series(np.repeat(all_destinos, repeats), dtype="string"),
            "partida_prevista": pd.Series(partida_prevista_series, dtype="string"),
            "partida_real": pd.Series(partida_real_series, dtype="string"),
            "situacao_voo": pd.Series(situacao_series, dtype="string"),
            "atraso_enfrentado_minutos": np.round(atraso_series, 0).astype(np.float64),
            "teve_bagagem_extraviada": teve_bagagem_extraviada.astype(bool),
            "falha_app_checkin": falha_app_checkin.astype(bool),
        }
    )

    # Cruzamento com microdados de tarifas reais da ANAC (LEFT JOIN em origem e destino)
    bronze_anac_path = anac_tarifas_bronze_path or (resolve_data_lake_dir() / "bronze" / "anac_tarifas_bronze.parquet")
    if bronze_anac_path and bronze_anac_path.exists():
        logger.info("Cruzando viagens com microdados de tarifas ANAC (LEFT JOIN): %s", bronze_anac_path)
        df_anac = pd.read_parquet(bronze_anac_path)
        df_anac["origem"] = df_anac["origem"].astype(str).str.strip().str.upper()
        df_anac["destino"] = df_anac["destino"].astype(str).str.strip().str.upper()
        df_anac = df_anac[["origem", "destino", "tarifa_media_anac"]].drop_duplicates(subset=["origem", "destino"])

        df_trips = df_trips.merge(df_anac, on=["origem", "destino"], how="left")

        # Flutuação diária de preço: np.random.uniform(0.9, 1.2)
        fator_variacao = np_rng.uniform(0.90, 1.20, size=len(df_trips))
        # Se rota constar na ANAC usa tarifa_media_anac; caso nulo/NaN, fallback para R$ 500.00
        tarifa_base = df_trips["tarifa_media_anac"].fillna(500.0).to_numpy(dtype=np.float64)
        df_trips["valor_pago_tarifa"] = np.round(tarifa_base * fator_variacao, 2).astype(np.float64)
        # Remove a coluna temporária para evitar duplicatas e preservar o schema original
        df_trips = df_trips.drop(columns=["tarifa_media_anac"])

    logger.info(
        "Histórico de viagens gerado: %d passagens em %d PNRs para %d clientes distintos.",
        len(df_trips),
        df_trips["pnr"].nunique(),
        df_trips["id_cliente"].nunique(),
    )
    return df_trips


def generate_active_scheduled_flights(
    df_historical_trips: pd.DataFrame,
    df_clients: pd.DataFrame,
    anac_tarifas_bronze_path: Path | None = None,
    seed: int = DEFAULT_SEED,
) -> pd.DataFrame:
    """Gera nativamente no DuckDB a malha programada ativa (Horizonte D0) com manifestos
    completos (100 a 140 pax/voo), PNRs realistas e injeção de causa-e-efeito de atritos passados."""
    logger.info("Iniciando geração nativa da Malha Programada Ativa (Horizonte D0)...")
    np_rng = np.random.default_rng(seed=seed + 1042)

    active_flight_configs = [
        {
            "numero_voo": "4409",
            "origem": "SBPJ",
            "destino": "SBCF",
            "partida_prevista": "2026-08-11 14:30:00",
            "situacao_voo": "A EMBARCAR",
            "total_passageiros": 136,  # A320neo: 174 assentos -> 78.1% ocupação
            "atraso_estimado": 0.0,
        },
        {
            "numero_voo": "6002",
            "origem": "SBSP",
            "destino": "SBFI",
            "partida_prevista": "2026-08-11 15:45:00",
            "situacao_voo": "A EMBARCAR",
            "total_passageiros": 138,
            "atraso_estimado": 0.0,
        },
        {
            "numero_voo": "2624",
            "origem": "SBKP",
            "destino": "SBPA",
            "partida_prevista": "2026-08-11 16:15:00",
            "situacao_voo": "PROGRAMADO",
            "total_passageiros": 132,
            "atraso_estimado": 15.0,
        },
        {
            "numero_voo": "4066",
            "origem": "SBCF",
            "destino": "SBEG",
            "partida_prevista": "2026-08-11 17:00:00",
            "situacao_voo": "PROGRAMADO",
            "total_passageiros": 135,
            "atraso_estimado": 0.0,
        },
        {
            "numero_voo": "4991",
            "origem": "SBCX",
            "destino": "SBKP",
            "partida_prevista": "2026-08-11 17:45:00",
            "situacao_voo": "PROGRAMADO",
            "total_passageiros": 106,  # E195-E2: 136 assentos -> 77.9% ocupação
            "atraso_estimado": 0.0,
        },
        {
            "numero_voo": "2666",
            "origem": "SBRJ",
            "destino": "SBKP",
            "partida_prevista": "2026-08-11 18:30:00",
            "situacao_voo": "PROGRAMADO",
            "total_passageiros": 104,
            "atraso_estimado": 30.0,
        },
        {
            "numero_voo": "5024",
            "origem": "SBRF",
            "destino": "SBGL",
            "partida_prevista": "2026-08-11 19:15:00",
            "situacao_voo": "PROGRAMADO",
            "total_passageiros": 134,
            "atraso_estimado": 0.0,
        },
        {
            "numero_voo": "4147",
            "origem": "SBKP",
            "destino": "SBCT",
            "partida_prevista": "2026-08-11 20:00:00",
            "situacao_voo": "PROGRAMADO",
            "total_passageiros": 105,
            "atraso_estimado": 0.0,
        },
    ]

    # Carrega tarifas médias ANAC para precificação fiel
    tarifas_anac_dict: dict[tuple[str, str], float] = {}
    if anac_tarifas_bronze_path and anac_tarifas_bronze_path.exists():
        try:
            df_anac = pd.read_parquet(anac_tarifas_bronze_path)
            for _, row in df_anac.iterrows():
                orig = str(row["origem"]).strip().upper()
                dest = str(row["destino"]).strip().upper()
                tarifas_anac_dict[(orig, dest)] = float(row.get("tarifa_media_anac", 650.0))
        except Exception as e:
            logger.warning("Falha ao carregar tarifas ANAC para malha ativa: %s", e)

    # Identifica clientes com histórico de atrito severo no horizonte passado (Causa e Efeito)
    atrito_mask = (
        (df_historical_trips["situacao_voo"] == "CANCELADO")
        | (df_historical_trips["atraso_enfrentado_minutos"] >= 45.0)
        | (df_historical_trips["teve_bagagem_extraviada"] == True)
        | (df_historical_trips["falha_app_checkin"] == True)
    )
    clientes_atritados_ranking = (
        df_historical_trips[atrito_mask]
        .groupby("id_cliente")
        .size()
        .sort_values(ascending=False)
        .index.tolist()
    )

    client_tier_map = dict(zip(df_clients["id_cliente"], df_clients["tier_fidelidade"]))

    # Separa VIPs (Diamante / Safira) com atrito severo
    vips_atritados = [
        cid for cid in clientes_atritados_ranking 
        if client_tier_map.get(cid) in ("Diamante", "Safira")
    ]
    # Outros clientes com atrito (Topázio / Básico)
    outros_atritados = [
        cid for cid in clientes_atritados_ranking 
        if cid not in vips_atritados
    ]
    # VIPs satisfeitos (para termos clientes VIP felizes sem risco na cabine)
    vips_satisfeitos = [
        cid for cid, tier in client_tier_map.items() 
        if tier in ("Diamante", "Safira") and cid not in clientes_atritados_ranking
    ]
    # Clientes gerais
    clientes_gerais = [
        cid for cid in df_clients["id_cliente"].tolist()
        if cid not in vips_atritados and cid not in vips_satisfeitos and cid not in outros_atritados
    ]

    allocated_clients_in_active: set[str] = set()
    rows_active: list[dict[str, Any]] = []

    for f_cfg in active_flight_configs:
        num_voo = str(f_cfg["numero_voo"])
        origem = str(f_cfg["origem"])
        destino = str(f_cfg["destino"])
        partida = str(f_cfg["partida_prevista"])
        situacao = str(f_cfg["situacao_voo"])
        atraso = float(f_cfg["atraso_estimado"])
        total_pax = int(f_cfg["total_passageiros"])

        tarifa_base = tarifas_anac_dict.get((origem, destino), 650.0)

        # A. Injeção de Causa e Efeito: 8 a 12 VIPs com atrito severo
        pool_vips_atrito = [c for c in vips_atritados if c not in allocated_clients_in_active]
        qtd_vips_atrito = min(len(pool_vips_atrito), int(np_rng.integers(8, 14)))
        chosen_vips_atrito = pool_vips_atrito[:qtd_vips_atrito]
        allocated_clients_in_active.update(chosen_vips_atrito)

        # B. VIPs Satisfeitos: 18 a 26 VIPs sem atrito
        pool_vips_sat = [c for c in vips_satisfeitos if c not in allocated_clients_in_active]
        qtd_vips_sat = min(len(pool_vips_sat), int(np_rng.integers(18, 26)))
        chosen_vips_sat = pool_vips_sat[:qtd_vips_sat]
        allocated_clients_in_active.update(chosen_vips_sat)

        # C. Clientes gerais com atrito: 8 a 15
        pool_outros_atrito = [c for c in outros_atritados if c not in allocated_clients_in_active]
        qtd_outros_atrito = min(len(pool_outros_atrito), int(np_rng.integers(8, 15)))
        chosen_outros_atrito = pool_outros_atrito[:qtd_outros_atrito]
        allocated_clients_in_active.update(chosen_outros_atrito)

        # D. Clientes Gerais para fechar a lotação exata do avião
        already_chosen = chosen_vips_atrito + chosen_vips_sat + chosen_outros_atrito
        pax_restantes = total_pax - len(already_chosen)

        pool_gerais = [c for c in clientes_gerais if c not in allocated_clients_in_active]
        if len(pool_gerais) < pax_restantes:
            pool_gerais = clientes_gerais

        chosen_gerais = list(np_rng.choice(pool_gerais, size=pax_restantes, replace=False))
        allocated_clients_in_active.update(chosen_gerais)

        all_flight_clients = already_chosen + chosen_gerais
        np_rng.shuffle(all_flight_clients)

        # Agrupamento estruturado por PNR (Tamanhos: 1=50%, 2=26%, 3=14%, 4=10%)
        pnr_groups: list[list[str]] = []
        c_idx = 0
        while c_idx < len(all_flight_clients):
            rem = len(all_flight_clients) - c_idx
            if rem >= 4:
                g_size = int(np_rng.choice([1, 2, 3, 4], p=[0.50, 0.26, 0.14, 0.10]))
            elif rem >= 3:
                g_size = int(np_rng.choice([1, 2, 3], p=[0.55, 0.30, 0.15]))
            elif rem >= 2:
                g_size = int(np_rng.choice([1, 2], p=[0.60, 0.40]))
            else:
                g_size = 1

            pnr_groups.append(all_flight_clients[c_idx : c_idx + g_size])
            c_idx += g_size

        pnr_chars = np_rng.choice(PNR_ALPHABET, size=(len(pnr_groups) * 2, 6))
        pnr_codes = pd.unique(np.array(["".join(r) for r in pnr_chars]))[: len(pnr_groups)]

        for g_i, grp in enumerate(pnr_groups):
            pnr_code = str(pnr_codes[g_i])
            for cid in grp:
                tarifa_paga = round(tarifa_base * float(np_rng.uniform(0.92, 1.18)), 2)
                rows_active.append({
                    "id_cliente": cid,
                    "pnr": pnr_code,
                    "numero_voo": num_voo,
                    "origem": origem,
                    "destino": destino,
                    "partida_prevista": partida,
                    "partida_real": "",  # NULL para voo programado
                    "situacao_voo": situacao,  # 'A EMBARCAR' ou 'PROGRAMADO'
                    "atraso_enfrentado_minutos": float(atraso),  # 0.0, 15.0, 30.0 (inteiro)
                    "teve_bagagem_extraviada": False,
                    "falha_app_checkin": False,
                    "valor_pago_tarifa": tarifa_paga,
                })

    df_active = pd.DataFrame(rows_active)
    # Garante tipagem idêntica
    df_active["id_cliente"] = df_active["id_cliente"].astype("string")
    df_active["pnr"] = df_active["pnr"].astype("string")
    df_active["numero_voo"] = df_active["numero_voo"].astype("string")
    df_active["origem"] = df_active["origem"].astype("string")
    df_active["destino"] = df_active["destino"].astype("string")
    df_active["partida_prevista"] = df_active["partida_prevista"].astype("string")
    df_active["partida_real"] = df_active["partida_real"].astype("string")
    df_active["situacao_voo"] = df_active["situacao_voo"].astype("string")
    df_active["atraso_enfrentado_minutos"] = df_active["atraso_enfrentado_minutos"].astype(np.float64)
    df_active["teve_bagagem_extraviada"] = df_active["teve_bagagem_extraviada"].astype(bool)
    df_active["falha_app_checkin"] = df_active["falha_app_checkin"].astype(bool)
    df_active["valor_pago_tarifa"] = df_active["valor_pago_tarifa"].astype(np.float64)

    logger.info(
        "Malha Programada Ativa gerada nativamente: %d passagens em %d voos (média: ~%d pax/voo).",
        len(df_active),
        df_active["numero_voo"].nunique(),
        round(len(df_active) / max(1, df_active["numero_voo"].nunique())),
    )
    return df_active


def enrich_trips_with_fares(
    df_trips: pd.DataFrame,
    bronze_tarifas_path: Path,
    airline_code: str = TARGET_AIRLINE_CODE,
    seed: int = DEFAULT_SEED,
) -> pd.DataFrame:
    # Se já enriquecido via anac_tarifas_bronze.parquet em generate_silver_trips, preserva e retorna
    if "valor_pago_tarifa" in df_trips.columns:
        logger.info("Tarifas já integradas via tabela ANAC (%d viagens). Mantendo coluna valor_pago_tarifa.", len(df_trips))
        return df_trips

    np_rng = np.random.default_rng(seed=seed)

    if not bronze_tarifas_path.exists():
        logger.warning(
            "Arquivo %s não encontrado; preenchendo valor_pago_tarifa com valor padrão %.2f.",
            bronze_tarifas_path,
            500.0,
        )
        df_out = df_trips.copy()
        noise = np_rng.uniform(0.90, 1.20, size=len(df_out))
        df_out["valor_pago_tarifa"] = np.round(500.0 * noise, 2)
        return df_out

    logger.info("Carregando tarifas da Camada Bronze: %s", bronze_tarifas_path)
    df_tarifas_raw = pd.read_parquet(bronze_tarifas_path)

    # Suporte direto ao formato de microdados anac_tarifas_bronze
    if "tarifa_media_anac" in df_tarifas_raw.columns:
        df_anac = df_tarifas_raw[["origem", "destino", "tarifa_media_anac"]].drop_duplicates(subset=["origem", "destino"])
        df_enriched = df_trips.merge(df_anac, on=["origem", "destino"], how="left")
        noise = np_rng.uniform(0.90, 1.20, size=len(df_enriched))
        tarifa_base = df_enriched["tarifa_media_anac"].fillna(500.0).to_numpy(dtype=np.float64)
        df_enriched["valor_pago_tarifa"] = np.round(tarifa_base * noise, 2).astype(np.float64)
        return df_enriched.drop(columns=["tarifa_media_anac"])
    df_tarifas_raw.columns = [
        str(col).strip().lstrip("\ufeff").strip('"') for col in df_tarifas_raw.columns
    ]

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

    df_route_fares = (
        df_tarifas.groupby(["_origem_clean", "_destino_clean"])["_tarifa_num"]
        .mean()
        .reset_index()
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

    df_enriched = df_trips.merge(df_route_fares, on=["origem", "destino"], how="left")
    base_fares = df_enriched["valor_pago_tarifa"].fillna(global_mean_fare).to_numpy(dtype=np.float64)

    # Aplicação de ruído gaussiano truncado [0.80, 1.20] nas tarifas para simular dispersão real de classes tarifárias e eliminar CLVs clonados.
    fare_gaussian_noise = np.clip(
        np_rng.normal(loc=1.0, scale=0.10, size=len(df_enriched)),
        0.80,
        1.20,
    )
    df_enriched["valor_pago_tarifa"] = np.round(base_fares * fare_gaussian_noise, 2).astype(np.float64)

    logger.info(
        "Enriquecimento tarifário concluído: %d rotas mapeadas (tarifa média global de fallback: R$ %.2f).",
        len(df_route_fares),
        global_mean_fare,
    )
    return df_enriched


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

    df_reviews["score_sentimento"] = (
        df_reviews["texto_avaliacao"].map(_compute_text_sentiment_score).astype(np.float64)
    )
    df_reviews["classificacao_sentimento"] = df_reviews["score_sentimento"].apply(
        lambda s: "POSITIVO" if s > 0.10 else ("NEGATIVO" if s < -0.10 else "NEUTRO")
    ).astype("string")

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
    bronze_anac_path = data_lake_dir / "bronze" / "anac_tarifas_bronze.parquet"
    bronze_tarifas_path = bronze_anac_path if bronze_anac_path.exists() else (data_lake_dir / "bronze" / "tarifas_azul.parquet")
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
    df_trips_historical = generate_silver_trips(
        df_flights=df_flights,
        df_clients=df_clients_full,
        seed=DEFAULT_SEED,
        anac_tarifas_bronze_path=bronze_tarifas_path,
    )
    df_trips_historical = enrich_trips_with_fares(
        df_trips=df_trips_historical,
        bronze_tarifas_path=bronze_tarifas_path,
        airline_code=TARGET_AIRLINE_CODE,
        seed=DEFAULT_SEED,
    )

    # 3. Geração Nativa da Malha Programada Ativa (Horizonte D0) com Injeção de Causa e Efeito
    df_trips_active = generate_active_scheduled_flights(
        df_historical_trips=df_trips_historical,
        df_clients=df_clients_full,
        anac_tarifas_bronze_path=bronze_tarifas_path,
        seed=DEFAULT_SEED,
    )

    # Consolidação unificada de viagens: Histórico (Passado) + Malha Ativa Programada (Hoje)
    df_trips = pd.concat([df_trips_historical, df_trips_active], ignore_index=True)

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
