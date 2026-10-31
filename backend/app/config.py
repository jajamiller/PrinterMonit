"""Application configuration."""
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "PrinterMonit"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/printer_monitor"

    # Database initialization (new installations only)
    AUTO_CREATE_TABLES: bool = False
    BOOTSTRAP_ADMIN: bool = False
    INITIAL_ADMIN_USERNAME: str = "admin"
    INITIAL_ADMIN_PASSWORD: str = "admin"

    # Security
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    # SNMP
    SNMP_TIMEOUT_SECONDS: float = 3.0
    SNMP_RETRIES: int = 2
    SNMP_POLL_INTERVAL_MINUTES: float = 60.0
    SNMP_COMMUNITY: str = "public"

    # Files / reports
    REPORTS_DIR: str = "/tmp/printer_reports"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
