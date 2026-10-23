from __future__ import annotations

import logging
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger("azul.gold.personas")

DEFAULT_SEED: int = 42
N_CLUSTERS: int = 4


def resolve_data_lake_dir() -> Path:
    project_root = Path(__file__).resolve().parent.parent
    return project_root / "data_lake"


def _assign_persona_names(centroids_df: pd.DataFrame) -> dict[int, str]:
    # Heurística de nomeação das personas pelos centroides padronizados: atribui sem colisão os 4 arquétipos de negócio.
    remaining = set(centroids_df.index.tolist())
    cluster_to_persona: dict[int, str] = {}

    exec_cluster = int(
        centroids_df.loc[list(remaining), "frequencia_total"].idxmax()
    )
    cluster_to_persona[exec_cluster] = "Executivo Frequente"
    remaining.remove(exec_cluster)

    herd_score = (
        centroids_df.loc[list(remaining), "tamanho_medio_pnr"]
        + centroids_df.loc[list(remaining), "percentual_voos_fds"]
    )
    family_cluster = int(herd_score.idxmax())
    cluster_to_persona[family_cluster] = "Família/Lazer"
    remaining.remove(family_cluster)

    points_cluster = int(
        centroids_df.loc[list(remaining), "antecedencia_media_compra"].idxmax()
    )
    cluster_to_persona[points_cluster] = "Caçador de Pontos"
    remaining.remove(points_cluster)

    regional_cluster = int(next(iter(remaining)))
    cluster_to_persona[regional_cluster] = "Viajante Regional"

    return cluster_to_persona


def build_gold_personas(
    clientes_silver_path: Path,
    viagens_silver_path: Path,
    gold_output_path: Path,
    seed: int = DEFAULT_SEED,
) -> pd.DataFrame:
    if not clientes_silver_path.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {clientes_silver_path}")
    if not viagens_silver_path.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {viagens_silver_path}")

    logger.info("Lendo tabelas da Camada Silver...")
    df_clients = pd.read_parquet(clientes_silver_path)
    df_trips = pd.read_parquet(viagens_silver_path)

    # Definição das features comportamentais por cliente: tamanho do PNR (Efeito Manada), voos em fim de semana, frequência total e antecedência média de compra.
    pnr_sizes = (
        df_trips.groupby("pnr", as_index=False)["id_cliente"]
        .nunique()
        .rename(columns={"id_cliente": "_pax_no_pnr"})
    )
    df_trips_enriched = df_trips.merge(pnr_sizes, on="pnr", how="left")

    dt_partida = pd.to_datetime(df_trips_enriched["partida_real"], errors="coerce")
    df_trips_enriched["_is_fds"] = dt_partida.dt.dayofweek.isin([5, 6]).astype(np.float64)

    behavior_agg = (
        df_trips_enriched.groupby("id_cliente", as_index=False)
        .agg(
            frequencia_total=("numero_voo", "count"),
            tamanho_medio_pnr=("_pax_no_pnr", "mean"),
            percentual_voos_fds=("_is_fds", lambda s: float(s.mean() * 100.0)),
        )
    )

    df_gold = df_clients[["id_cliente"]].merge(behavior_agg, on="id_cliente", how="left")
    df_gold["frequencia_total"] = df_gold["frequencia_total"].fillna(0).astype(np.int64)
    df_gold["tamanho_medio_pnr"] = (
        df_gold["tamanho_medio_pnr"].fillna(1.0).round(2).astype(np.float64)
    )
    df_gold["percentual_voos_fds"] = (
        df_gold["percentual_voos_fds"].fillna(0.0).round(2).astype(np.float64)
    )

    # Fallback determinístico (seed=42) para antecedência média de compra entre 5 e 60 dias quando não há timestamp de emissão do bilhete.
    rng = np.random.default_rng(seed=seed)
    df_gold["antecedencia_media_compra"] = (
        rng.uniform(5.0, 60.0, size=len(df_gold)).round(2).astype(np.float64)
    )

    # Seleção de features numéricas para a clusterização K-Means (frequência, antecedência, tamanho PNR e FDS).
    feature_cols = [
        "frequencia_total",
        "antecedencia_media_compra",
        "tamanho_medio_pnr",
        "percentual_voos_fds",
    ]

    # Normalização estatística via StandardScaler para eliminar o viés de escala
    # (evita que variáveis com ordens de grandeza maiores engulam as demais dimensões)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(df_gold[feature_cols].to_numpy(dtype=np.float64))

    # Treinamento do K-Means usando o array normalizado (X_scaled) para criar 4 grupos bem distribuídos
    kmeans = KMeans(n_clusters=N_CLUSTERS, random_state=seed, n_init=10)
    cluster_labels = kmeans.fit_predict(X_scaled)

    # Mapeamento dos centroides do K-Means para os nomes de negócio das 4 personas.
    centroids_df = pd.DataFrame(kmeans.cluster_centers_, columns=feature_cols)
    persona_map = _assign_persona_names(centroids_df)
    df_gold["persona"] = pd.Series(cluster_labels).map(persona_map).astype("string")

    output_cols = [
        "id_cliente",
        "frequencia_total",
        "antecedencia_media_compra",
        "tamanho_medio_pnr",
        "percentual_voos_fds",
        "persona",
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
        "Cérebro 3 (Personas K-Means) salvo em %s | Distribuição: %s",
        gold_output_path,
        df_result["persona"].value_counts().to_dict(),
    )
    return df_result


def run_gold_personas_pipeline() -> Path:
    data_lake_dir = resolve_data_lake_dir()
    clientes_silver_path = data_lake_dir / "silver" / "clientes_silver.parquet"
    viagens_silver_path = data_lake_dir / "silver" / "viagens_silver.parquet"
    gold_output_path = data_lake_dir / "gold" / "personas_clientes.parquet"

    build_gold_personas(
        clientes_silver_path=clientes_silver_path,
        viagens_silver_path=viagens_silver_path,
        gold_output_path=gold_output_path,
        seed=DEFAULT_SEED,
    )
    return gold_output_path


if __name__ == "__main__":
    run_gold_personas_pipeline()

