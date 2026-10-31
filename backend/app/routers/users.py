"""Users router — admin user management."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_current_admin, get_current_active_user, get_db
from app.models import User
from app.schemas import UserRead, UserUpdate

router = APIRouter()


@router.get("", response_model=list[UserRead])
async def list_users(
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    """Listar todos os usuários (apenas admin)."""
    result = await session.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    user_id: str,
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    """Obter detalhes de um usuário (apenas admin)."""
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user


@router.put("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: str,
    payload: UserUpdate,
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    """Atualizar informações do usuário - role e status (apenas admin)."""
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    # Admin não pode alterar sua própria role ou desativar sua conta
    if user.id == current_user.id:
        if payload.role and payload.role != user.role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Você não pode alterar sua própria role"
            )
        if payload.is_active is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Você não pode desativar sua própria conta"
            )

    if payload.role:
        if payload.role not in ["admin", "supervisor", "usuario"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role inválida. Opções: admin, supervisor, usuario"
            )
        user.role = payload.role

    if payload.is_active is not None:
        user.is_active = payload.is_active

    if payload.full_name:
        user.full_name = payload.full_name

    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    """Deletar um usuário (apenas admin)."""
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Admin não pode deletar a si mesmo
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você não pode deletar sua própria conta"
        )
    
    await session.delete(user)
    await session.commit()
