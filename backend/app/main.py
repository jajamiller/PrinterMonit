"""FastAPI application entry point."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, printers, reports, users, settings
from app.tasks.scheduler import start_scheduler, stop_scheduler
from app.config import settings as app_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    from sqlalchemy import select

    from app.database import get_session
    from app.models import Base, SystemSettings, User, UserRole
    from app.security import hash_password

    try:
        async with get_session()() as session:
            if app_settings.AUTO_CREATE_TABLES:
                await session.run_sync(Base.metadata.create_all)
            if app_settings.BOOTSTRAP_ADMIN:
                admin_result = await session.execute(select(User).where(User.email == app_settings.INITIAL_ADMIN_USERNAME))
                if admin_result.scalar_one_or_none() is None:
                    session.add(User(
                        email=app_settings.INITIAL_ADMIN_USERNAME,
                        hashed_password=hash_password(app_settings.INITIAL_ADMIN_PASSWORD),
                        full_name="Administrador",
                        role=UserRole.ADMIN,
                        is_active=True,
                    ))
            settings_result = await session.execute(select(SystemSettings).limit(1))
            if settings_result.scalar_one_or_none() is None:
                session.add(SystemSettings(timezone="America/Sao_Paulo", date_format="DD/MM/YYYY"))
            await session.commit()

        await start_scheduler()
        yield
    finally:
        await stop_scheduler()


app = FastAPI(
    title="PrinterMonit — Gestão de Impressoras em Rede",
    description="Sistema web para gerenciamento, monitoramento e controle de impressoras via SNMP.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(printers.router, prefix="/api/printers", tags=["Printers"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])


@app.get("/health")
async def health():
    return {"status": "ok"}
