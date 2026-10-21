from __future__ import annotations

from typing import Annotated
from fastapi import Depends
from back.app.config import Settings, get_settings

SettingsDep = Annotated[Settings, Depends(get_settings)]
