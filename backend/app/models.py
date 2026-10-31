"""Database ORM models."""
from datetime import datetime
from enum import Enum as PyEnum
from uuid import uuid4

from sqlalchemy import (
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class SystemSettings(Base):
    __tablename__ = "system_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    timezone: Mapped[str] = mapped_column(String(100), default="America/Sao_Paulo", nullable=False)
    date_format: Mapped[str] = mapped_column(String(20), default="DD/MM/YYYY", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<SystemSettings timezone={self.timezone}>"


class UserRole(str, PyEnum):
    ADMIN = "admin"
    SUPERVISOR = "supervisor"
    USUARIO = "usuario"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(
            UserRole,
            name="user_role",
            values_callable=lambda c: [e.value for e in c],
            create_type=False,
        ),
        default=UserRole.USUARIO.value,
    )
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<User {self.email} ({self.role})>"


class PrinterStatus(str, PyEnum):
    ONLINE = "online"
    OFFLINE = "offline"
    ERROR = "error"


class Printer(Base):
    __tablename__ = "printers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)  # Nome personalizado
    manufacturer: Mapped[str] = mapped_column(String(255), nullable=True)
    model: Mapped[str] = mapped_column(String(255), nullable=True)
    serial_number: Mapped[str] = mapped_column(String(255), nullable=True)
    asset_tag: Mapped[str] = mapped_column(String(100), nullable=True)  # Patrimônio
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False, index=True)
    port: Mapped[int] = mapped_column(default=161)
    snmp_community: Mapped[str | None] = mapped_column(String(64), nullable=True, default="public")
    snmp_enabled: Mapped[bool] = mapped_column(default=True)
    sector: Mapped[str] = mapped_column(String(100), nullable=True)
    location: Mapped[str] = mapped_column(String(255), nullable=True)
    printer_type: Mapped[str] = mapped_column(String(50), nullable=True)  # impressao-colorida, mono, etc.
    status: Mapped[PrinterStatus] = mapped_column(
        SAEnum(
            PrinterStatus,
            name="printer_status",
            values_callable=lambda c: [e.value for e in c],
            create_type=False,
        ),
        default=PrinterStatus.OFFLINE.value,
    )
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    last_error: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    readings: Mapped[list["PrinterReading"]] = relationship(back_populates="printer", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Printer {self.name} ({self.ip_address})>"


class PrinterReading(Base):
    __tablename__ = "printer_readings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    printer_id: Mapped[str] = mapped_column(String(36), ForeignKey("printers.id"), nullable=False, index=True)
    total_pages: Mapped[int] = mapped_column(nullable=False)
    available_pages: Mapped[int | None] = mapped_column(nullable=True)  # para impressoras com limite
    snmp_raw: Mapped[dict | None] = mapped_column(Text, nullable=True)  # JSON com dados brutos
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="ok")
    response_time_ms: Mapped[int] = mapped_column(default=0)
    error_message: Mapped[str] = mapped_column(String(512), nullable=True)
    read_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    printer: Mapped[Printer] = relationship(back_populates="readings")


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    printer_id: Mapped[str] = mapped_column(String(36), ForeignKey("printers.id"), nullable=False, index=True)
    alert_type: Mapped[str] = mapped_column(String(50), nullable=False)  # indisponivel, erro, toner_baixo
    severity: Mapped[str] = mapped_column(String(20), default="warning")
    message: Mapped[str] = mapped_column(Text, nullable=False)
    resolved: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
