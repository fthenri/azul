import pytest
from app.modules.simulation.crew_service import (
    alocar_assentos_aeronave,
    calcular_prioridade_cliente,
)


def test_calcular_prioridade_cliente():
    p_diamante = {"tier_fidelidade": "Diamante", "faixa_pareto": "Top 10% Receita", "clv_previsto": 10000}
    p_safira = {"tier_fidelidade": "Safira", "faixa_pareto": "Top 20% Receita", "clv_previsto": 5000}
    p_basico = {"tier_fidelidade": "Basico", "faixa_pareto": "Cauda Longa", "clv_previsto": 500}

    assert calcular_prioridade_cliente(p_diamante) > calcular_prioridade_cliente(p_safira)
    assert calcular_prioridade_cliente(p_safira) > calcular_prioridade_cliente(p_basico)


def test_alocar_assentos_espaco_azul_prioridade_vip():
    # 20 VIPs and 80 Basics on a 20-row 6-seat aircraft (120 seats total, 24 Espaço Azul)
    passengers = []
    for i in range(20):
        passengers.append({
            "id_cliente": f"VIP_{i}",
            "nome_completo": f"VIP {i}",
            "tier_fidelidade": "Diamante",
            "faixa_pareto": "Top 10% Receita",
            "clv_previsto": 20000.0,
            "risco_evasao": 0.1,
            "pnr": f"PNR_VIP_{i}",
            "tamanho_grupo": 1,
            "is_grupo_familiar": False,
        })
    for i in range(80):
        passengers.append({
            "id_cliente": f"STD_{i}",
            "nome_completo": f"Standard {i}",
            "tier_fidelidade": "Basico",
            "faixa_pareto": "Cauda Longa",
            "clv_previsto": 200.0,
            "risco_evasao": 0.05,
            "pnr": f"PNR_STD_{i}",
            "tamanho_grupo": 1,
            "is_grupo_familiar": False,
        })

    layout_6 = ["A", "B", "C", "D", "E", "F"]
    allocated = alocar_assentos_aeronave(passengers, fileiras=20, layout=layout_6)
    assert len(allocated) == 100

    # Check Espaço Azul (rows 1-4)
    espaco_azul_pax = [p for seat, p in allocated if int(seat[:-1]) <= 4]
    # All 20 VIPs should be in rows 1-4
    vip_ids_in_espaco_azul = {p["id_cliente"] for p in espaco_azul_pax if "VIP" in p["id_cliente"]}
    assert len(vip_ids_in_espaco_azul) == 20


def test_alocar_assentos_pnr_familia_contiguo():
    # Family group of 3 with same PNR
    passengers = [
        {
            "id_cliente": f"FAM_{i}",
            "nome_completo": f"Familia Silva {i}",
            "tier_fidelidade": "Safira",
            "faixa_pareto": "Top 20% Receita",
            "clv_previsto": 3000.0,
            "risco_evasao": 0.1,
            "pnr": "PNR_SILVA",
            "tamanho_grupo": 3,
            "is_grupo_familiar": True,
        }
        for i in range(3)
    ]
    # Add other solo passengers
    for i in range(40):
        passengers.append({
            "id_cliente": f"SOLO_{i}",
            "nome_completo": f"Solo {i}",
            "tier_fidelidade": "Basico",
            "faixa_pareto": "Cauda Longa",
            "clv_previsto": 500.0,
            "risco_evasao": 0.05,
            "pnr": f"PNR_SOLO_{i}",
            "tamanho_grupo": 1,
            "is_grupo_familiar": False,
        })

    layout_6 = ["A", "B", "C", "D", "E", "F"]
    allocated = alocar_assentos_aeronave(passengers, fileiras=20, layout=layout_6)
    fam_seats = [seat for seat, p in allocated if p["pnr"] == "PNR_SILVA"]
    assert len(fam_seats) == 3

    # Must be on the exact same row
    rows = {int(s[:-1]) for s in fam_seats}
    assert len(rows) == 1, f"Family split across rows: {fam_seats}"

    # Must be contiguous columns
    cols = sorted([s[-1] for s in fam_seats])
    seat_letters = "ABCDEF"
    indices = [seat_letters.index(c) for c in cols]
    for idx in range(len(indices) - 1):
        assert indices[idx + 1] - indices[idx] == 1, f"Family not contiguous: {fam_seats}"


def test_alocar_assentos_organicos_assentos_vazios():
    # 80 passengers on 120 seats aircraft (40 empty seats)
    passengers = []
    for i in range(80):
        passengers.append({
            "id_cliente": f"PAX_{i}",
            "nome_completo": f"Pax {i}",
            "tier_fidelidade": "Basico",
            "faixa_pareto": "Cauda Longa",
            "clv_previsto": 500.0,
            "risco_evasao": 0.05,
            "pnr": f"PNR_{i}",
            "tamanho_grupo": 1,
            "is_grupo_familiar": False,
        })

    layout_6 = ["A", "B", "C", "D", "E", "F"]
    allocated = alocar_assentos_aeronave(passengers, fileiras=20, layout=layout_6)
    assert len(allocated) == 80

    all_seats = {f"{r}{c}" for r in range(1, 21) for c in layout_6}
    occupied_seats = {seat for seat, p in allocated}
    empty_seats = all_seats - occupied_seats
    assert len(empty_seats) == 40

    # Organic: Empty seats should include middle seats ('B' and 'E') or rear rows
    middle_empty = [s for s in empty_seats if s[-1] in ("B", "E")]
    rear_empty = [s for s in empty_seats if int(s[:-1]) >= 17]

    assert len(middle_empty) > 0, "Middle seats should be naturally avoided/left empty"
    assert len(rear_empty) > 0, "Rear rows should have empty seats instead of sequentially filled"
