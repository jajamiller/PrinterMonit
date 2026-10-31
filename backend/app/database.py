"""Database engine and async session factory."""
from functools import lru_cache

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings


@lru_cache
def get_engine():
    return create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)


@lru_cache
def get_session() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(
        bind=get_engine(),
        expire_on_commit=False,
        autoflush=False,
    )
