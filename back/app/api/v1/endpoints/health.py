from __future__ import annotations

from typing import Any, Dict
from fastapi import APIRouter
from back.app.api.dependencies import SettingsDep

router = APIRouter(tags=["Operacional"])


@router.get("/health", summary="Health Check do Backend")
async def health_check(settings: SettingsDep) -> Dict[str, Any]:
    """Retorna o status operacional da API e a integridade dos caminhos de dados."""
    data_lake_ok = settings.data_lake_dir.exists() if settings.data_lake_dir else False
    gold_ok = settings.gold_dir.exists() if settings.gold_dir else False
    silver_ok = settings.silver_dir.exists() if settings.silver_dir else False

    return {
        "status": "healthy" if (data_lake_ok and gold_ok and silver_ok) else "degraded",
        "app_name": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "storage": {
            "data_lake": data_lake_ok,
            "silver": silver_ok,
            "gold": gold_ok,
        },
    }
