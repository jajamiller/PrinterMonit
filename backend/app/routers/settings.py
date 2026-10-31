"""Settings router — system configuration."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_current_active_user, get_current_admin, get_db
from app.models import SystemSettings
from app.schemas import SystemSettingsRead, SystemSettingsUpdate

router = APIRouter()


@router.get("/timezone", response_model=SystemSettingsRead)
async def get_settings(
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Obter configurações do sistema (todos os usuários)."""
    result = await session.execute(select(SystemSettings).limit(1))
    settings = result.scalar_one_or_none()

    if not settings:
        # Cria configuração padrão se não existir
        settings = SystemSettings(timezone="America/Sao_Paulo", date_format="DD/MM/YYYY")
        session.add(settings)
        await session.commit()
        await session.refresh(settings)

    return settings


@router.put("/timezone", response_model=SystemSettingsRead)
async def update_settings(
    payload: SystemSettingsUpdate,
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    """Atualizar configurações do sistema (apenas admin)."""
    result = await session.execute(select(SystemSettings).limit(1))
    settings = result.scalar_one_or_none()

    if not settings:
        settings = SystemSettings()
        session.add(settings)

    if payload.timezone:
        settings.timezone = payload.timezone
    if payload.date_format:
        settings.date_format = payload.date_format

    await session.commit()
    await session.refresh(settings)
    return settings
