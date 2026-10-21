from __future__ import annotations

import logging
import sys
from pathlib import Path

import numpy as np
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger("azul.gold.clv")

# Premissa financeira de receita auxiliar: assinatura anual do Clube Azul (12 meses do plano básico).
RECEITA_ANUAL_CLUBE: float = 478.80
# Premissa financeira de receita auxiliar: receita anual estimada de anuidade/intercâmbio do cartão Azul Itaú.
RECEITA_ANUAL_COBRANDED: float = 350.00


def resolve_data_lake_dir() -> Path:
    project_root = Path(__file__).resolve().parent.parent
    return project_root / "data_lake"


def build_gold_clv(
    clientes_silver_path: Path,
    viagens_silver_path: Path,
    gold_output_path: Path,
) -> pd.DataFrame:
    if not clientes_silver_path.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {clientes_silver_path}")
    if not viagens_silver_path.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {viagens_silver_path}")

    logger.info("Lendo tabelas da Camada Silver...")
    df_clients = pd.read_parquet(clientes_silver_path)
    df_trips = pd.read_parquet(viagens_silver_path)

    df_realized = df_trips[
        df_trips["situacao_voo"].astype(str).str.strip().str.upper() != "CANCELADO"
    ].copy()
    df_realized["_dt_partida_real"] = pd.to_datetime(
        df_realized["partida_real"],
        errors="coerce",
    )
    df_realized = df_realized[df_realized["_dt_partida_real"].notna()]

    reference_date = df_realized["_dt_partida_real"].max()

    rfm_agg = (
        df_realized.groupby("id_cliente", as_index=False)
        .agg(
            ultima_partida=("_dt_partida_real", "max"),
            frequencia=("numero_voo", "count"),
            valor_monetario_base=("valor_pago_tarifa", "sum"),
        )
    )
    rfm_agg["recencia_dias"] = (
        (reference_date - rfm_agg["ultima_partida"]).dt.total_seconds() / 86400.0
    ).round(0).astype(np.int64)

    df_gold = df_clients[
        ["id_cliente", "assinante_clube", "cartao_cobranded"]
    ].merge(
        rfm_agg[["id_cliente", "recencia_dias", "frequencia", "valor_monetario_base"]],
        on="id_cliente",
        how="left",
    )

    df_gold["recencia_dias"] = df_gold["recencia_dias"].fillna(365).astype(np.int64)
    df_gold["frequencia"] = df_gold["frequencia"].fillna(0).astype(np.int64)
    df_gold["valor_monetario_base"] = (
        df_gold["valor_monetario_base"].fillna(0.0).round(2).astype(np.float64)
    )

    # Soma as receitas auxiliares anuais projetadas (Clube + Co-branded) ao valor monetário base de passagens.
    receita_auxiliar = (
        np.where(df_gold["assinante_clube"], RECEITA_ANUAL_CLUBE, 0.0)
        + np.where(df_gold["cartao_cobranded"], RECEITA_ANUAL_COBRANDED, 0.0)
    )
    df_gold["valor_monetario_expandido"] = (
        df_gold["valor_monetario_base"] + receita_auxiliar
    ).round(2).astype(np.float64)

    # Lógica matemática do CLV Preditivo (12 meses): combina decaimento exponencial de recência e elasticidade logarítmica de frequência sobre o valor monetário expandido.
    fator_recencia = np.exp(-df_gold["recencia_dias"].to_numpy(dtype=np.float64) / 365.0)
    mediana_freq = max(float(df_gold["frequencia"].median()), 1.0)
    fator_frequencia = 1.0 + 0.15 * (
        np.log1p(df_gold["frequencia"].to_numpy(dtype=np.float64)) / np.log1p(mediana_freq)
    )
    df_gold["clv_previsto"] = (
        df_gold["valor_monetario_expandido"] * fator_recencia * fator_frequencia
    ).round(2).astype(np.float64)

    output_cols = [
        "id_cliente",
        "recencia_dias",
        "frequencia",
        "valor_monetario_base",
        "valor_monetario_expandido",
        "clv_previsto",
    ]
    df_result = df_gold[output_cols]

    gold_output_path.parent.mkdir(parents=True, exist_ok=True)
    df_result.to_parquet(
        gold_output_path,
        engine="pyarrow",
        compression="snappy",
        index=False,
    )
    logger.info(
        "Cérebro 1 (CLV Preditivo) salvo em %s (%d clientes | CLV médio: R$ %.2f)",
        gold_output_path,
        len(df_result),
        float(df_result["clv_previsto"].mean()),
    )
    return df_result


def run_gold_clv_pipeline() -> Path:
    data_lake_dir = resolve_data_lake_dir()
    clientes_silver_path = data_lake_dir / "silver" / "clientes_silver.parquet"
    viagens_silver_path = data_lake_dir / "silver" / "viagens_silver.parquet"
    gold_output_path = data_lake_dir / "gold" / "clv_clientes.parquet"

    build_gold_clv(
        clientes_silver_path=clientes_silver_path,
        viagens_silver_path=viagens_silver_path,
        gold_output_path=gold_output_path,
    )
    return gold_output_path


if __name__ == "__main__":
    run_gold_clv_pipeline()

