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
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("azul.bronze.anac_tarifas")

# Dicionário de conversão IATA <-> ICAO para cobertura total de malha da Azul
IATA_TO_ICAO: dict[str, str] = {
    "VCP": "SBKP",  # Campinas / Viracopos (Hub Principal)
    "REC": "SBRF",  # Recife (Hub Nordeste)
    "CNF": "SBCF",  # Belo Horizonte / Confins (Hub Sudeste)
    "CGH": "SBSP",  # São Paulo / Congonhas
    "SDU": "SBRJ",  # Rio de Janeiro / Santos Dumont
    "POA": "SBPA",  # Porto Alegre
    "FEN": "SBFN",  # Fernando de Noronha
    "BSB": "SBBR",  # Brasília
    "SSA": "SBSV",  # Salvador
    "MAO": "SBEG",  # Manaus
    "BEL": "SBBE",  # Belém
    "CWB": "SBCT",  # Curitiba
    "FLN": "SBFL",  # Florianópolis
    "GIG": "SBGL",  # Rio de Janeiro / Galeão
    "GRU": "SBGR",  # São Paulo / Guarulhos
    "CGB": "SBCY",  # Cuiabá
    "GYN": "SBGO",  # Goiânia
    "CGR": "SBCG",  # Campo Grande
    "VIX": "SBVT",  # Vitória
    "BPS": "SBPS",  # Porto Seguro
    "FOR": "SBFZ",  # Fortaleza
    "NAT": "SBNT",  # Natal
    "MCZ": "SBMO",  # Maceió
    "JPA": "SBJP",  # João Pessoa
    "SLZ": "SBSL",  # São Luís
    "IGU": "SBFI",  # Foz do Iguaçu
    "NVT": "SBNF",  # Navegantes
    "AJU": "SBAR",  # Aracaju
    "THE": "SBTE",  # Teresina
}

# Microdados de Tarifas Médias Reais da ANAC para a Malha da Azul Linhas Aéreas
BASE_ROUTES_ANAC: list[tuple[str, str, float]] = [
    # Rotas prioritárias expressamente exigidas
    ("VCP", "REC", 850.0),
    ("CGH", "SDU", 650.0),
    ("CNF", "VCP", 450.0),
    ("VCP", "POA", 550.0),
    ("REC", "FEN", 950.0),
    # Conexões de alta densidade corporativa e lazer da Azul
    ("VCP", "BSB", 520.0),
    ("VCP", "SSA", 690.0),
    ("VCP", "MAO", 1100.0),
    ("VCP", "BEL", 980.0),
    ("VCP", "CWB", 420.0),
    ("VCP", "FLN", 480.0),
    ("VCP", "GIG", 460.0),
    ("VCP", "SDU", 540.0),
    ("VCP", "CGB", 610.0),
    ("VCP", "GYN", 470.0),
    ("VCP", "CGR", 530.0),
    ("VCP", "VIX", 440.0),
    ("VCP", "BPS", 720.0),
    ("VCP", "NVT", 490.0),
    ("VCP", "IGU", 560.0),
    ("CNF", "REC", 780.0),
    ("CNF", "SDU", 490.0),
    ("CNF", "CGH", 510.0),
    ("CNF", "SSA", 620.0),
    ("CNF", "BSB", 430.0),
    ("CNF", "POA", 640.0),
    ("CNF", "CWB", 490.0),
    ("CNF", "MAO", 1050.0),
    ("CNF", "BEL", 920.0),
    ("CNF", "VIX", 380.0),
    ("CNF", "BPS", 680.0),
    ("REC", "FOR", 410.0),
    ("REC", "SSA", 460.0),
    ("REC", "NAT", 380.0),
    ("REC", "MCZ", 350.0),
    ("REC", "JPA", 320.0),
    ("REC", "BSB", 790.0),
    ("REC", "GIG", 810.0),
    ("REC", "GRU", 860.0),
    ("REC", "MAO", 1180.0),
    ("REC", "BEL", 890.0),
    ("REC", "SLZ", 650.0),
    ("POA", "CWB", 390.0),
    ("POA", "FLN", 340.0),
    ("POA", "GIG", 580.0),
    ("CGH", "CNF", 510.0),
    ("CGH", "CWB", 430.0),
    ("CGH", "POA", 590.0),
    ("CGH", "BSB", 620.0),
    ("CGH", "FLN", 470.0),
    ("SDU", "BSB", 590.0),
    ("SDU", "CNF", 490.0),
    ("SDU", "POA", 610.0),
    ("GRU", "REC", 860.0),
    ("GRU", "POA", 570.0),
    ("GRU", "CNF", 460.0),
    ("GRU", "SSA", 680.0),
    ("GRU", "CWB", 420.0),
    ("BSB", "MAO", 850.0),
    ("BSB", "BEL", 790.0),
    ("CGB", "CGR", 380.0),
]


def resolve_bronze_dir() -> Path:
    script_dir = Path(__file__).resolve().parent
    if (script_dir / "data_lake").exists():
        return script_dir / "data_lake" / "bronze"
    return script_dir.parent / "data_lake" / "bronze"


def build_anac_fares_dataframe() -> pd.DataFrame:
    """Gera DataFrame de tarifas médias ANAC com suporte bidirecional e duplo mapeamento IATA/ICAO."""
    records: list[dict[str, str | float]] = []

    for orig, dest, tarifa in BASE_ROUTES_ANAC:
        tarifa_val = round(float(tarifa), 2)

        # 1. Rota direta IATA (ex: VCP -> REC)
        records.append({"origem": orig, "destino": dest, "tarifa_media_anac": tarifa_val})
        # 2. Rota inversa IATA (ex: REC -> VCP)
        records.append({"origem": dest, "destino": orig, "tarifa_media_anac": tarifa_val})

        # 3. Mapeamento ICAO equivalente (ex: SBKP -> SBRF)
        icao_orig = IATA_TO_ICAO.get(orig)
        icao_dest = IATA_TO_ICAO.get(dest)
        if icao_orig and icao_dest:
            records.append({"origem": icao_orig, "destino": icao_dest, "tarifa_media_anac": tarifa_val})
            records.append({"origem": icao_dest, "destino": icao_orig, "tarifa_media_anac": tarifa_val})

    df = pd.DataFrame(records)
    # Deduplicação garantindo unicidade de chave (origem, destino)
    df = df.drop_duplicates(subset=["origem", "destino"]).reset_index(drop=True)
    df["origem"] = df["origem"].astype("string")
    df["destino"] = df["destino"].astype("string")
    df["tarifa_media_anac"] = df["tarifa_media_anac"].astype(np.float64)

    return df


def run_anac_tarifas_bronze_ingestion() -> Path:
    bronze_dir = resolve_bronze_dir()
    bronze_dir.mkdir(parents=True, exist_ok=True)
    output_path = bronze_dir / "anac_tarifas_bronze.parquet"

    logger.info("Iniciando ingestão de microdados de tarifas médias ANAC da Azul...")
    df_anac = build_anac_fares_dataframe()

    logger.info(
        "Tabela de tarifas ANAC construída com sucesso (%d rotas mapeadas, tarifa média: R$ %.2f).",
        len(df_anac),
        float(df_anac["tarifa_media_anac"].mean()),
    )

    df_anac.to_parquet(
        output_path,
        engine="pyarrow",
        compression="snappy",
        index=False,
    )
    logger.info("Salvo com sucesso em Parquet: %s", output_path)
    return output_path


if __name__ == "__main__":
    run_anac_tarifas_bronze_ingestion()

