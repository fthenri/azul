from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger("azul.silver.crm")


def resolve_data_lake_dir() -> Path:
    project_root = Path(__file__).resolve().parent.parent
    return project_root / "data_lake"


def build_silver_crm_satellites(
    viagens_silver_path: Path,
    clientes_silver_path: Path,
    silver_output_dir: Path,
    seed: int = 42,
) -> dict[str, Path]:
    """Gera tabelas satélite de CRM (Bagagem WorldTracer, SSRs e SAC) simulando microsserviços corporativos."""
    if not viagens_silver_path.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {viagens_silver_path}")
    if not clientes_silver_path.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {clientes_silver_path}")

    logger.info("Carregando viagens Silver para mapeamento de passageiros dos voos ativos...")
    df_trips = pd.read_parquet(viagens_silver_path)
    df_clients = pd.read_parquet(clientes_silver_path)

    # Identifica passageiros dos voos ativos de D0 (especialmente 4409 e 6002)
    active_mask = df_trips["situacao_voo"].isin(["A EMBARCAR", "PROGRAMADO"])
    df_active = df_trips[active_mask].copy()

    logger.info("Total de passageiros em voos ativos encontrados: %d", len(df_active))

    # Filtra passageiros dos voos principais
    v4409_pax = df_active[df_active["numero_voo"] == "4409"].to_dict(orient="records")
    v6002_pax = df_active[df_active["numero_voo"] == "6002"].to_dict(orient="records")

    client_tiers = dict(zip(df_clients["id_cliente"], df_clients["tier_fidelidade"]))

    # -------------------------------------------------------------------------
    # 1. TABELA SATÉLITE: silver_bagagem_logs (WorldTracer)
    # Extravios ou avarias de bagagem recentes para passageiros em risco
    # -------------------------------------------------------------------------
    bagagem_records: list[dict[str, Any]] = []

    # Pax 1 (Voo 4409): Extravio anterior
    if len(v4409_pax) > 0:
        p1 = v4409_pax[0]
        bagagem_records.append({
            "id_cliente": str(p1["id_cliente"]),
            "pnr": str(p1.get("pnr") or "SOLO"),
            "numero_voo": "4409",
            "codigo_rastreio": "WT-VCP-88412",
            "tipo_ocorrencia": "Extravio Temporário",
            "status_bagagem": "Mala localizada pela equipe de solo e em trânsito prioritário para entrega",
            "descricao_ocorrencia": "Extravio no voo de conexão anterior há 36h; cliente acionou WorldTracer",
            "data_registro": "2026-08-10 18:30:00",
        })

    # Pax 2 (Voo 4409): Bagagem danificada
    if len(v4409_pax) > 2:
        p2 = v4409_pax[2]
        bagagem_records.append({
            "id_cliente": str(p2["id_cliente"]),
            "pnr": str(p2.get("pnr") or "SOLO"),
            "numero_voo": "4409",
            "codigo_rastreio": "WT-SDU-34190",
            "tipo_ocorrencia": "Dano de Bagagem",
            "status_bagagem": "Avaria na alça e carcaça no último desembarque; voucher de compensação pendente",
            "descricao_ocorrencia": "Avaria registrada no desembarque de SDU; compensação sob análise da Ouvidoria",
            "data_registro": "2026-08-09 21:15:00",
        })

    # Pax 3 (Voo 6002): Atraso de bagagem
    if len(v6002_pax) > 0:
        p3 = v6002_pax[0]
        bagagem_records.append({
            "id_cliente": str(p3["id_cliente"]),
            "pnr": str(p3.get("pnr") or "SOLO"),
            "numero_voo": "6002",
            "codigo_rastreio": "WT-CGH-10944",
            "tipo_ocorrencia": "Atraso de Bagagem",
            "status_bagagem": "Bagagem entregue com atraso de 18h no último trecho corporativo",
            "descricao_ocorrencia": "Retardo de conexão em CGH com entrega tardia em hotel",
            "data_registro": "2026-08-08 14:00:00",
        })

    df_bagagem = pd.DataFrame(bagagem_records)
    path_bagagem = silver_output_dir / "bagagem_logs_silver.parquet"
    df_bagagem.to_parquet(path_bagagem, engine="pyarrow", compression="snappy", index=False)
    logger.info("Tabela satélite salva: %s (%d registros)", path_bagagem, len(df_bagagem))

    # -------------------------------------------------------------------------
    # 2. TABELA SATÉLITE: silver_ssr_logs (Special Service Requests)
    # Serviços especiais como Pet na Cabine, Cadeira de Rodas ou Menor Desacompanhado
    # -------------------------------------------------------------------------
    ssr_records: list[dict[str, Any]] = []

    # Pax 4 (Voo 4409): PETC (Pet in Cabin)
    if len(v4409_pax) > 1:
        p4 = v4409_pax[1]
        ssr_records.append({
            "id_cliente": str(p4["id_cliente"]),
            "pnr": str(p4.get("pnr") or "SOLO"),
            "codigo_ssr": "PETC",
            "categoria_ssr": "Pet na Cabine",
            "descricao_ssr": "Viajando com Pet na Cabine (cão de pequeno porte validado na reserva)",
            "data_registro": "2026-08-11 08:00:00",
        })

    # Pax 5 (Voo 4409): WCHR (Wheelchair)
    if len(v4409_pax) > 3:
        p5 = v4409_pax[3]
        ssr_records.append({
            "id_cliente": str(p5["id_cliente"]),
            "pnr": str(p5.get("pnr") or "SOLO"),
            "codigo_ssr": "WCHR",
            "categoria_ssr": "Assistência Especial",
            "descricao_ssr": "Cadeira de rodas necessária no desembarque e assistência em escada",
            "data_registro": "2026-08-11 09:30:00",
        })

    # Pax 6 (Voo 4409): Grupo familiar com atendimento a criança
    if len(v4409_pax) > 4:
        p6 = v4409_pax[4]
        ssr_records.append({
            "id_cliente": str(p6["id_cliente"]),
            "pnr": str(p6.get("pnr") or "SOLO"),
            "codigo_ssr": "CHML",
            "categoria_ssr": "Refeição Infantil & Família",
            "descricao_ssr": "Atenção prioritária para alimentação infantil e acomodação de família",
            "data_registro": "2026-08-11 10:15:00",
        })

    df_ssr = pd.DataFrame(ssr_records)
    path_ssr = silver_output_dir / "ssr_logs_silver.parquet"
    df_ssr.to_parquet(path_ssr, engine="pyarrow", compression="snappy", index=False)
    logger.info("Tabela satélite salva: %s (%d registros)", path_ssr, len(df_ssr))

    # -------------------------------------------------------------------------
    # 3. TABELA SATÉLITE: silver_sac_logs (Atendimento ao Cliente / Ouvidoria)
    # Chamados e reclamações recentes abertos no SAC ou Consumidor.gov
    # -------------------------------------------------------------------------
    sac_records: list[dict[str, Any]] = []

    if len(v4409_pax) > 0:
        p_sac1 = v4409_pax[0]
        sac_records.append({
            "id_cliente": str(p_sac1["id_cliente"]),
            "protocolo_sac": "AZ-SAC-2026-98124",
            "canal_atendimento": "Ouvidoria Azul",
            "motivo_reclamacao": "Reclamação sobre perda de conexão e demora no encaminhamento de hotel",
            "status_atendimento": "Em mediação prioritária com a supervisão",
            "data_registro": "2026-08-10 19:40:00",
        })

    if len(v4409_pax) > 3:
        p_sac2 = v4409_pax[3]
        sac_records.append({
            "id_cliente": str(p_sac2["id_cliente"]),
            "protocolo_sac": "AZ-SAC-2026-74512",
            "canal_atendimento": "SAC Central 0800",
            "motivo_reclamacao": "Insatisfação com cancelamento sem aviso tempestivo no voo anterior",
            "status_atendimento": "Atendimento aberto aguardando resposta do passageiro",
            "data_registro": "2026-08-09 11:20:00",
        })

    df_sac = pd.DataFrame(sac_records)
    path_sac = silver_output_dir / "sac_logs_silver.parquet"
    df_sac.to_parquet(path_sac, engine="pyarrow", compression="snappy", index=False)
    logger.info("Tabela satélite salva: %s (%d registros)", path_sac, len(df_sac))

    return {
        "silver_bagagem": path_bagagem,
        "silver_ssr": path_ssr,
        "silver_sac": path_sac,
    }


def run_silver_crm_pipeline() -> dict[str, Path]:
    data_lake_dir = resolve_data_lake_dir()
    silver_dir = data_lake_dir / "silver"
    viagens_silver_path = silver_dir / "viagens_silver.parquet"
    clientes_silver_path = silver_dir / "clientes_silver.parquet"

    return build_silver_crm_satellites(
        viagens_silver_path=viagens_silver_path,
        clientes_silver_path=clientes_silver_path,
        silver_output_dir=silver_dir,
    )


if __name__ == "__main__":
    run_silver_crm_pipeline()
