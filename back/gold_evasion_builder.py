from __future__ import annotations

import logging
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from xgboost import XGBClassifier

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger("azul.gold.evasion")

DEFAULT_SEED: int = 42
LAMBDA_DECAY: float = 0.015


def resolve_data_lake_dir() -> Path:
    project_root = Path(__file__).resolve().parent.parent
    return project_root / "data_lake"


def calibrate_nlp_pain_weights(avaliacoes_silver_path: Path) -> dict[str, float]:
    if not avaliacoes_silver_path.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {avaliacoes_silver_path}")

    df_reviews = pd.read_parquet(avaliacoes_silver_path)

    # Extração dos pesos de dor (w_tipo) via NLP: inverte a média de sentimento por tópico (w = 1.0 - media_sentimento) para penalizar eventos mais negativos.
    mean_sentiment = df_reviews.groupby("topico")["score_sentimento"].mean().to_dict()
    pain_weights = {
        str(topic): round(float(1.0 - score), 4)
        for topic, score in mean_sentiment.items()
    }
    logger.info("Pesos de dor calibrados via NLP (w_tipo): %s", pain_weights)
    return pain_weights


def build_gold_evasion(
    clientes_silver_path: Path,
    viagens_silver_path: Path,
    avaliacoes_silver_path: Path,
    gold_output_path: Path,
    seed: int = DEFAULT_SEED,
) -> pd.DataFrame:
    if not clientes_silver_path.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {clientes_silver_path}")
    if not viagens_silver_path.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {viagens_silver_path}")

    pain_weights = calibrate_nlp_pain_weights(avaliacoes_silver_path)
    w_atraso = pain_weights.get("Atraso", 1.6)
    w_cancelamento = pain_weights.get("Cancelamento", 1.8)
    w_bagagem = pain_weights.get("Bagagem", 1.7)
    w_app = pain_weights.get("App", 1.3)

    logger.info("Lendo tabelas de clientes e viagens da Camada Silver...")
    df_clients = pd.read_parquet(clientes_silver_path)
    df_trips = pd.read_parquet(viagens_silver_path).copy()

    dt_evento = pd.to_datetime(df_trips["partida_prevista"], errors="coerce")
    dt_real = pd.to_datetime(df_trips["partida_real"], errors="coerce")
    dt_evento = dt_evento.fillna(dt_real)
    reference_date = dt_evento.max()

    dias_decorridos = (
        (reference_date - dt_evento).dt.total_seconds() / 86400.0
    ).clip(lower=0.0).fillna(0.0).to_numpy(dtype=np.float64)

    is_cancelado = (
        (df_trips["situacao_voo"].astype(str).str.strip().str.upper() == "CANCELADO")
        | (df_trips["atraso_enfrentado_minutos"] < 0.0)
    ).to_numpy(dtype=bool)
    atraso_positivo = np.clip(
        df_trips["atraso_enfrentado_minutos"].to_numpy(dtype=np.float64),
        0.0,
        None,
    )
    teve_bagagem = df_trips["teve_bagagem_extraviada"].to_numpy(dtype=bool)
    falha_app = df_trips["falha_app_checkin"].to_numpy(dtype=bool)

    # Equação matemática do atrito com decaimento temporal exponencial: impacto_evento * exp(-lambda * dias_decorridos).
    impacto_bruto = (
        np.where(is_cancelado, w_cancelamento * 3.0, 0.0)
        + w_atraso * np.log1p(atraso_positivo / 15.0)
        + np.where(teve_bagagem, w_bagagem * 2.5, 0.0)
        + np.where(falha_app, w_app * 1.0, 0.0)
    )
    fator_decaimento = np.exp(-LAMBDA_DECAY * dias_decorridos)
    df_trips["_atrito_ponderado"] = impacto_bruto * fator_decaimento
    df_trips["_is_cancelado"] = is_cancelado.astype(np.int64)
    df_trips["_is_atraso"] = (atraso_positivo > 15.0).astype(np.int64)
    df_trips["_is_bagagem"] = teve_bagagem.astype(np.int64)
    df_trips["_is_app"] = falha_app.astype(np.int64)
    df_trips["_dt_evento"] = dt_evento

    agg_trips = (
        df_trips.groupby("id_cliente", as_index=False)
        .agg(
            score_atrito_acumulado=("_atrito_ponderado", "sum"),
            qtd_cancelamentos=("_is_cancelado", "sum"),
            qtd_atrasos_criticos=("_is_atraso", "sum"),
            qtd_bagagem_extraviada=("_is_bagagem", "sum"),
            qtd_falha_app=("_is_app", "sum"),
            ultima_interacao=("_dt_evento", "max"),
        )
    )
    agg_trips["recencia_dias"] = (
        (reference_date - agg_trips["ultima_interacao"]).dt.total_seconds() / 86400.0
    ).clip(lower=0.0).fillna(365.0)

    df_gold = df_clients[["id_cliente"]].merge(agg_trips, on="id_cliente", how="left")
    df_gold["score_atrito_acumulado"] = (
        df_gold["score_atrito_acumulado"].fillna(0.0).round(4).astype(np.float64)
    )
    df_gold["qtd_cancelamentos"] = df_gold["qtd_cancelamentos"].fillna(0).astype(np.int64)
    df_gold["qtd_atrasos_criticos"] = df_gold["qtd_atrasos_criticos"].fillna(0).astype(np.int64)
    df_gold["qtd_bagagem_extraviada"] = df_gold["qtd_bagagem_extraviada"].fillna(0).astype(np.int64)
    df_gold["qtd_falha_app"] = df_gold["qtd_falha_app"].fillna(0).astype(np.int64)
    df_gold["recencia_dias"] = df_gold["recencia_dias"].fillna(365.0).astype(np.float64)

    # Geração do target sintético `evadiu` (0 ou 1) via função logística calibrada sobre o score de atrito acumulado padronizado e a recência.
    rng = np.random.default_rng(seed=seed)
    atrito_vals = df_gold["score_atrito_acumulado"].to_numpy(dtype=np.float64)
    recencia_vals = df_gold["recencia_dias"].to_numpy(dtype=np.float64)
    atrito_z = (atrito_vals - atrito_vals.mean()) / (atrito_vals.std() + 1e-8)
    recencia_z = (recencia_vals - recencia_vals.mean()) / (recencia_vals.std() + 1e-8)
    logit = -0.85 + 1.45 * atrito_z + 0.55 * recencia_z
    prob_churn_latente = 1.0 / (1.0 + np.exp(-logit))
    target_evadiu = (rng.random(len(df_gold)) < prob_churn_latente).astype(np.int64)

    feature_cols = [
        "score_atrito_acumulado",
        "recencia_dias",
        "qtd_cancelamentos",
        "qtd_atrasos_criticos",
        "qtd_bagagem_extraviada",
        "qtd_falha_app",
    ]
    X = df_gold[feature_cols].to_numpy(dtype=np.float64)

    model = XGBClassifier(
        n_estimators=120,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=seed,
        eval_metric="logloss",
    )
    model.fit(X, target_evadiu)
    df_gold["risco_evasao"] = (
        model.predict_proba(X)[:, 1].round(4).astype(np.float64)
    )

    df_result = df_gold[["id_cliente", "score_atrito_acumulado", "risco_evasao"]]

    gold_output_path.parent.mkdir(parents=True, exist_ok=True)
    df_result.to_parquet(
        gold_output_path,
        engine="pyarrow",
        compression="snappy",
        index=False,
    )
    logger.info(
        "Cérebro 2 (Risco de Evasão XGBoost) salvo em %s (%d clientes | Risco médio: %.2f%%)",
        gold_output_path,
        len(df_result),
        float(df_result["risco_evasao"].mean() * 100.0),
    )
    return df_result


def run_gold_evasion_pipeline() -> Path:
    data_lake_dir = resolve_data_lake_dir()
    clientes_silver_path = data_lake_dir / "silver" / "clientes_silver.parquet"
    viagens_silver_path = data_lake_dir / "silver" / "viagens_silver.parquet"
    avaliacoes_silver_path = data_lake_dir / "silver" / "avaliacoes_silver.parquet"
    gold_output_path = data_lake_dir / "gold" / "evasao_clientes.parquet"

    build_gold_evasion(
        clientes_silver_path=clientes_silver_path,
        viagens_silver_path=viagens_silver_path,
        avaliacoes_silver_path=avaliacoes_silver_path,
        gold_output_path=gold_output_path,
        seed=DEFAULT_SEED,
    )
    return gold_output_path


if __name__ == "__main__":
    run_gold_evasion_pipeline()

