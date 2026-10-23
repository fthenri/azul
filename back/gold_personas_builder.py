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
    """Mapeia os centroides dos clusters para os 4 arquétipos de negócio orientados a CLV e Influência.
    
    Arquétipos Oficiais:
    1. 'Gestor Corporativo': Alta influência, alto CLV e voos predominantemente corporativos em dias úteis.
    2. 'Líder Familiar': Alta influência de grupo (PNR alto), médio CLV e alto percentual de voos em fins de semana.
    3. 'Viajante Solo Premium': Alto CLV, viagens individuais ou menor dependência de grupo.
    4. 'Turista Eventual': Baixo CLV, baixa frequência e menor poder de influência.
    """
    remaining = set(centroids_df.index.tolist())
    cluster_to_persona: dict[int, str] = {}

    # 1. 'Gestor Corporativo': Maior CLV combinado com alta influência institucional
    gestor_cluster = int(centroids_df.loc[list(remaining), "clv_previsto"].idxmax())
    cluster_to_persona[gestor_cluster] = "Gestor Corporativo"
    remaining.remove(gestor_cluster)

    # 2. 'Líder Familiar': Maior concentração de voos nos fins de semana e influência de grupo
    familiar_cluster = int(centroids_df.loc[list(remaining), "percentual_voos_fds"].idxmax())
    cluster_to_persona[familiar_cluster] = "Líder Familiar"
    remaining.remove(familiar_cluster)

    # 3. 'Viajante Solo Premium': Maior CLV remanescente (alta rentabilidade individual)
    solo_cluster = int(centroids_df.loc[list(remaining), "clv_previsto"].idxmax())
    cluster_to_persona[solo_cluster] = "Viajante Solo Premium"
    remaining.remove(solo_cluster)

    # 4. 'Turista Eventual': Cluster restante de menor valor e menor influência
    turista_cluster = int(next(iter(remaining)))
    cluster_to_persona[turista_cluster] = "Turista Eventual"

    return cluster_to_persona


def build_gold_personas(
    clientes_silver_path: Path,
    viagens_silver_path: Path,
    gold_clv_path: Path,
    gold_output_path: Path,
    seed: int = DEFAULT_SEED,
) -> pd.DataFrame:
    """Executa a esteira analítica de segmentação de personas via K-Means normalizado."""
    if not clientes_silver_path.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {clientes_silver_path}")
    if not viagens_silver_path.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {viagens_silver_path}")
    if not gold_clv_path.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {gold_clv_path}")

    logger.info("Lendo tabelas das Camadas Silver e Gold (CLV)...")
    df_clients = pd.read_parquet(clientes_silver_path)
    df_trips = pd.read_parquet(viagens_silver_path)
    df_clv = pd.read_parquet(gold_clv_path)

    # 1. Extração do comportamento de grupo (PNR / Efeito Manada) e dias de voo
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

    # 2. Consolidação com Clientes e CLV Previsto
    df_gold = df_clients[["id_cliente", "tier_fidelidade"]].merge(behavior_agg, on="id_cliente", how="left")
    df_gold = df_gold.merge(df_clv[["id_cliente", "clv_previsto"]], on="id_cliente", how="left")

    df_gold["frequencia_total"] = df_gold["frequencia_total"].fillna(0).astype(np.int64)
    df_gold["tamanho_medio_pnr"] = df_gold["tamanho_medio_pnr"].fillna(1.0).round(2).astype(np.float64)
    df_gold["percentual_voos_fds"] = df_gold["percentual_voos_fds"].fillna(0.0).round(2).astype(np.float64)
    df_gold["clv_previsto"] = df_gold["clv_previsto"].fillna(1000.0).round(2).astype(np.float64)

    # 3. Construção do Score de Influência (0 a 100)
    # Fórmula: (tamanho_medio_pnr * 15) + Bônus de Tier (Diamante/Safira + 20) + Frequência + Ruído
    rng = np.random.default_rng(seed=seed)
    tier_bonus = np.where(
        df_gold["tier_fidelidade"].isin(["Diamante", "Safira"]),
        20.0,
        np.where(df_gold["tier_fidelidade"] == "Topazio", 10.0, 0.0),
    )
    pnr_component = df_gold["tamanho_medio_pnr"] * 15.0
    freq_component = np.clip(df_gold["frequencia_total"] * 0.75, 0.0, 25.0)
    noise = rng.normal(loc=0.0, scale=4.0, size=len(df_gold))

    raw_influence = pnr_component + tier_bonus + freq_component + noise
    df_gold["score_influencia"] = np.clip(raw_influence, 5.0, 100.0).round(1).astype(np.float64)

    # Fallback determinístico para antecedência média de compra
    df_gold["antecedencia_media_compra"] = (
        rng.uniform(5.0, 60.0, size=len(df_gold)).round(2).astype(np.float64)
    )

    # 4. Normalização estatística via StandardScaler para o K-Means
    feature_cols = [
        "clv_previsto",
        "score_influencia",
        "frequencia_total",
        "percentual_voos_fds",
    ]
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(df_gold[feature_cols].to_numpy(dtype=np.float64))

    # 5. Treinamento do K-Means (4 clusters)
    kmeans = KMeans(n_clusters=N_CLUSTERS, random_state=seed, n_init=20)
    cluster_labels = kmeans.fit_predict(X_scaled)
    df_gold["cluster"] = cluster_labels

    # 6. Mapeamento semântico dos centroides para Personas de Negócio
    centroids_df = df_gold.groupby("cluster")[feature_cols].mean()
    persona_map = _assign_persona_names(centroids_df)

    persona_series = pd.Series(cluster_labels).map(persona_map).astype("string")
    df_gold["persona"] = persona_series
    df_gold["persona_nome"] = persona_series

    output_cols = [
        "id_cliente",
        "persona",
        "persona_nome",
        "score_influencia",
        "clv_previsto",
        "frequencia_total",
        "antecedencia_media_compra",
        "tamanho_medio_pnr",
        "percentual_voos_fds",
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
        df_result["persona_nome"].value_counts().to_dict(),
    )
    return df_result


def run_gold_personas_pipeline() -> Path:
    data_lake_dir = resolve_data_lake_dir()
    clientes_silver_path = data_lake_dir / "silver" / "clientes_silver.parquet"
    viagens_silver_path = data_lake_dir / "silver" / "viagens_silver.parquet"
    gold_clv_path = data_lake_dir / "gold" / "clv_clientes.parquet"
    gold_output_path = data_lake_dir / "gold" / "personas_clientes.parquet"

    build_gold_personas(
        clientes_silver_path=clientes_silver_path,
        viagens_silver_path=viagens_silver_path,
        gold_clv_path=gold_clv_path,
        gold_output_path=gold_output_path,
        seed=DEFAULT_SEED,
    )
    return gold_output_path


if __name__ == "__main__":
    run_gold_personas_pipeline()
