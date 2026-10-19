"""Camada Silver - Construtor da Base de Passageiros e Cruzamento Operacional ANAC.

Este módulo simula a extração da base de clientes CRM/Fidelidade (Snowflake da Azul)
e realiza o cruzamento com os voos reais históricos da ANAC ingeridos na Camada
Bronze (`voos_historico_azul.parquet`), aplicando conceitos padrão da indústria
aérea (PNR compartilhado / 'Efeito Manada', Tiers TudoAzul, Clube TudoAzul,
Perfil de Alto Risco de Imagem e cálculo de atraso real enfrentado em minutos).
"""

from __future__ import annotations

import logging
import random
import string
import sys
import uuid
from pathlib import Path

import numpy as np
import pandas as pd

# Configuração de Observabilidade (Logging)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("azul.silver.builder")

# Distribuição estatística oficial dos Tiers de Fidelidade
TIER_CHOICES: tuple[str, ...] = ("Basico", "Topazio", "Safira", "Diamante")
TIER_WEIGHTS: tuple[float, ...] = (0.75, 0.15, 0.07, 0.03)

# Probabilidades de atributos de negócio
CLUBE_SUBSCRIPTION_PROB: float = 0.22
HIGH_IMAGE_RISK_PROB: float = 0.02

# Caracteres padrão da aviação para geração de PNR (6 caracteres alfanuméricos sem ambiguidade)
PNR_ALPHABET: str = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def resolve_data_lake_dir() -> Path:
    """Resolve o diretório raiz do Data Lake (`azul/data_lake`) de forma agnóstica ao cwd."""
    script_dir = Path(__file__).resolve().parent
    if (script_dir / "data_lake").exists():
        return script_dir / "data_lake"
    return script_dir.parent / "data_lake"


def _find_column(df: pd.DataFrame, candidates: tuple[str, ...]) -> str:
    """Localiza uma coluna no DataFrame de maneira case-insensitive."""
    normalized = {col.strip().lower(): col for col in df.columns}
    for candidate in candidates:
        key = candidate.strip().lower()
        if key in normalized:
            return normalized[key]
    raise KeyError(f"Nenhuma das colunas esperadas {candidates} encontrada em {list(df.columns)}")


def _generate_unique_pnr(existing_pnrs: set[str], rng: random.Random) -> str:
    """Gera um código localizador PNR único de 6 caracteres alfanuméricos."""
    while True:
        pnr = "".join(rng.choices(PNR_ALPHABET, k=6))
        if pnr not in existing_pnrs:
            existing_pnrs.add(pnr)
            return pnr


def load_and_prepare_bronze_flights(
    bronze_parquet_path: Path,
    sample_size: int = 800,
    seed: int = 42,
) -> pd.DataFrame:
    """Carrega os voos reais da Azul na Camada Bronze e calcula o atraso em minutos.

    Args:
        bronze_parquet_path: Caminho para `voos_historico_azul.parquet`.
        sample_size: Quantidade de voos a amostrar para geração de passageiros.
        seed: Semente para reprodutibilidade estatística.

    Returns:
        DataFrame de voos amostrados com atraso calculado a partir de Partida Prevista e Real.
    """
    if not bronze_parquet_path.exists():
        raise FileNotFoundError(
            f"Arquivo Bronze não encontrado em: {bronze_parquet_path}. "
            "Execute primeiro o script `ingestion.py`."
        )

    logger.info("Carregando voos reais da Camada Bronze: %s", bronze_parquet_path)
    df_flights = pd.read_parquet(bronze_parquet_path)
    logger.info("Total de voos carregados da Bronze: %d", len(df_flights))

    col_prevista = _find_column(df_flights, ("Partida Prevista", "partida_prevista"))
    col_real = _find_column(
        df_flights,
        ("Partida Real", "Partida Realizada", "partida_real", "partida_realizada"),
    )

    dt_prevista = pd.to_datetime(df_flights[col_prevista], errors="coerce")
    dt_real = pd.to_datetime(df_flights[col_real], errors="coerce")

    valid_mask = dt_prevista.notna() & dt_real.notna()
    df_valid = df_flights.loc[valid_mask].copy()
    dt_prevista_valid = dt_prevista.loc[valid_mask]
    dt_real_valid = dt_real.loc[valid_mask]

    # Cálculo do atraso real em minutos: (Partida Real - Partida Prevista)
    raw_delay_minutes = (dt_real_valid - dt_prevista_valid).dt.total_seconds() / 60.0
    # Voos que partiram adiantados têm 0 minutos de atraso enfrentado pelo passageiro
    df_valid["atraso_enfrentado_minutos"] = raw_delay_minutes.clip(lower=0.0).round(1)

    # Amostragem estratificada/aleatória garantindo presença de voos atrasados e no horário
    effective_sample_size = min(sample_size, len(df_valid))
    df_delayed = df_valid[df_valid["atraso_enfrentado_minutos"] >= 15.0]
    df_ontime = df_valid[df_valid["atraso_enfrentado_minutos"] < 15.0]

    target_delayed = min(len(df_delayed), effective_sample_size // 2)
    target_ontime = min(len(df_ontime), effective_sample_size - target_delayed)

    sampled_flights = pd.concat(
        [
            df_delayed.sample(n=target_delayed, random_state=seed),
            df_ontime.sample(n=target_ontime, random_state=seed),
        ],
        ignore_index=True,
    ).sample(frac=1.0, random_state=seed).reset_index(drop=True)

    logger.info(
        "Amostra selecionada de %d voos reais (%d com atraso >= 15 min, %d pontuais/leves).",
        len(sampled_flights),
        target_delayed,
        target_ontime,
    )
    return sampled_flights


def generate_silver_passengers(
    sampled_flights: pd.DataFrame,
    pnrs_per_flight_range: tuple[int, int] = (8, 16),
    seed: int = 42,
) -> pd.DataFrame:
    """Gera passageiros sintéticos (Snowflake CRM) agrupados por PNR e atrelados aos voos reais.

    Args:
        sampled_flights: DataFrame de voos reais com `atraso_enfrentado_minutos`.
        pnrs_per_flight_range: Intervalo (mín, máx) de reservas (PNRs) amostradas por voo.
        seed: Semente aleatória para reprodutibilidade.

    Returns:
        DataFrame consolidado de passageiros na Camada Silver.
    """
    rng = random.Random(seed)
    np_rng = np.random.default_rng(seed)

    col_voo = _find_column(sampled_flights, ("Número Voo", "Numero Voo", "numero_voo"))
    col_origem = _find_column(
        sampled_flights,
        ("ICAO Aeródromo Origem", "Sigla ICAO Aeroporto Origem", "origem"),
    )
    col_destino = _find_column(
        sampled_flights,
        ("ICAO Aeródromo Destino", "Sigla ICAO Aeroporto Destino", "destino"),
    )
    col_prevista = _find_column(sampled_flights, ("Partida Prevista", "partida_prevista"))
    col_real = _find_column(
        sampled_flights,
        ("Partida Real", "Partida Realizada", "partida_real"),
    )
    col_situacao = _find_column(sampled_flights, ("Situação Voo", "Situacao Voo", "situacao_voo"))

    existing_pnrs: set[str] = set()
    records: list[dict[str, object]] = []

    logger.info("Gerando passageiros sintéticos e agrupamentos familiares (PNR 1 a 4 pessoas)...")

    for flight_dict in sampled_flights.to_dict(orient="records"):
        numero_voo = str(flight_dict[col_voo]).strip()
        origem = str(flight_dict[col_origem]).strip()
        destino = str(flight_dict[col_destino]).strip()
        partida_prevista = str(flight_dict[col_prevista]).strip()
        partida_real = str(flight_dict[col_real]).strip()
        situacao_voo = str(flight_dict[col_situacao]).strip()
        atraso_minutos = float(flight_dict["atraso_enfrentado_minutos"])

        num_pnrs = rng.randint(pnrs_per_flight_range[0], pnrs_per_flight_range[1])
        for _ in range(num_pnrs):
            pnr_code = _generate_unique_pnr(existing_pnrs, rng)
            # Agrupa de 1 a 4 pessoas aleatoriamente no mesmo PNR ('Efeito Manada')
            group_size = rng.randint(1, 4)

            for _ in range(group_size):
                records.append(
                    {
                        "id_cliente": str(uuid.uuid4()),
                        "pnr": pnr_code,
                        "numero_voo": numero_voo,
                        "origem": origem,
                        "destino": destino,
                        "partida_prevista": partida_prevista,
                        "partida_real": partida_real,
                        "situacao_voo": situacao_voo,
                        "atraso_enfrentado_minutos": atraso_minutos,
                    }
                )

    df_passengers = pd.DataFrame(records)
    total_passengers = len(df_passengers)

    # Sorteio vetorizado respeitando estritamente as proporções solicitadas:
    # tier_fidelidade: 75% 'Basico', 15% 'Topazio', 7% 'Safira', 3% 'Diamante'
    df_passengers["tier_fidelidade"] = np_rng.choice(
        TIER_CHOICES,
        size=total_passengers,
        p=TIER_WEIGHTS,
    )

    # assinante_clube: Booleano True/False
    df_passengers["assinante_clube"] = np_rng.random(total_passengers) < CLUBE_SUBSCRIPTION_PROB

    # perfil_alto_risco_imagem: Booleano (2% como True para figuras públicas/profissionais críticos)
    df_passengers["perfil_alto_risco_imagem"] = (
        np_rng.random(total_passengers) < HIGH_IMAGE_RISK_PROB
    )

    # Ordena colunas priorizando os campos de negócio exigidos na especificação Silver
    ordered_cols = [
        "id_cliente",
        "pnr",
        "tier_fidelidade",
        "assinante_clube",
        "perfil_alto_risco_imagem",
        "atraso_enfrentado_minutos",
        "numero_voo",
        "origem",
        "destino",
        "partida_prevista",
        "partida_real",
        "situacao_voo",
    ]
    return df_passengers[ordered_cols]


def run_silver_pipeline() -> Path:
    """Executa o pipeline completo de construção da Camada Silver e salva em Parquet."""
    data_lake_dir = resolve_data_lake_dir()
    bronze_parquet_path = data_lake_dir / "bronze" / "voos_historico_azul.parquet"
    silver_output_path = data_lake_dir / "silver" / "passageiros_silver.parquet"

    sampled_flights = load_and_prepare_bronze_flights(bronze_parquet_path=bronze_parquet_path)
    df_silver = generate_silver_passengers(sampled_flights=sampled_flights)

    # Métricas de Observabilidade (Clientes únicos e agrupamento em PNRs familiares)
    total_unique_clients = df_silver["id_cliente"].nunique()
    pnr_counts = df_silver.groupby("pnr")["id_cliente"].transform("count")
    clients_in_family_pnrs = int((pnr_counts > 1).sum())
    total_unique_pnrs = df_silver["pnr"].nunique()
    family_pnrs_count = int((df_silver.groupby("pnr").size() > 1).sum())

    logger.info(
        "Resumo da Geração Silver: %d clientes únicos gerados em %d PNRs totais.",
        total_unique_clients,
        total_unique_pnrs,
    )
    logger.info(
        "Efeito Manada (Famílias/Grupos): %d clientes agrupados em %d PNRs de famílias (2 a 4 pessoas por PNR).",
        clients_in_family_pnrs,
        family_pnrs_count,
    )

    tier_dist = (
        df_silver["tier_fidelidade"].value_counts(normalize=True).mul(100).round(2).to_dict()
    )
    risk_pct = round(df_silver["perfil_alto_risco_imagem"].mean() * 100, 2)
    logger.info("Distribuição de Tiers (%%): %s | Alto Risco de Imagem: %.2f%%", tier_dist, risk_pct)

    silver_output_path.parent.mkdir(parents=True, exist_ok=True)
    df_silver.to_parquet(
        silver_output_path,
        engine="pyarrow",
        compression="snappy",
        index=False,
    )
    logger.info("Salvo com sucesso em Parquet (Camada Silver): %s", silver_output_path)
    return silver_output_path


if __name__ == "__main__":
    run_silver_pipeline()
