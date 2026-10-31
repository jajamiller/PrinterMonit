"""Pydantic schemas for API validation and serialization."""
from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo

from pydantic import BaseModel, EmailStr, Field, field_validator, field_serializer


# ---------- Auth ----------
class LoginRequest(BaseModel):
    email: str = Field(min_length=1)
    password: str


class UserCreate(BaseModel):
    email: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2)
    role: Optional[str] = Field(default="usuario")  # admin, supervisor, usuario


class UserRead(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    @field_serializer('role')
    def serialize_role(self, value) -> str:
        """Converte enum role para string"""
        if hasattr(value, 'value'):
            return value.value
        return str(value)


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2)
    role: Optional[str] = None  # admin, supervisor, usuario
    is_active: Optional[bool] = None


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(min_length=8)
    new_password: str = Field(min_length=8)
    confirm_password: str = Field(min_length=8)

    @field_validator('confirm_password')
    @classmethod
    def passwords_match(cls, v, info):
        if 'new_password' in info.data and v != info.data['new_password']:
            raise ValueError('Senhas não conferem')
        return v


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


# ---------- Printer ----------
class PrinterBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    manufacturer: Optional[str] = Field(default=None, max_length=255)
    model: Optional[str] = Field(default=None, max_length=255)
    serial_number: Optional[str] = Field(default=None, max_length=255)
    asset_tag: Optional[str] = Field(default=None, max_length=100)  # Patrimônio
    ip_address: str = Field(min_length=7, max_length=45)
    port: int = Field(default=161, ge=1, le=65535)
    snmp_community: Optional[str] = Field(default="public", max_length=64)
    snmp_enabled: bool = Field(default=True)
    sector: Optional[str] = Field(default=None, max_length=100)
    location: Optional[str] = Field(default=None, max_length=255)
    printer_type: Optional[str] = Field(default=None, max_length=50)


class PrinterCreate(PrinterBase):
    pass


class PrinterUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    asset_tag: Optional[str] = None
    ip_address: Optional[str] = None
    port: Optional[int] = None
    snmp_community: Optional[str] = None
    snmp_enabled: Optional[bool] = None
    sector: Optional[str] = None
    location: Optional[str] = None
    printer_type: Optional[str] = None


class PrinterStatusInfo(BaseModel):
    printer_id: str
    name: str
    ip_address: str
    status: str = "offline"
    last_seen_at: Optional[datetime] = None
    total_pages: Optional[int] = None
    uptime: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    manufacturer: Optional[str] = None


class PrinterRead(PrinterBase):
    id: str
    status: str = "offline"
    last_seen_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    @field_serializer('last_seen_at', 'created_at', 'updated_at')
    def serialize_datetime(self, value: Optional[datetime]) -> Optional[str]:
        """Serializa datetime como ISO 8601 com Z"""
        if value is None:
            return None
        # Garante que retorna em UTC com 'Z'
        if value.tzinfo is None:
            # Se não tem timezone, assume UTC
            value = value.replace(tzinfo=ZoneInfo('UTC'))
        return value.isoformat()


# ---------- Reading ----------
class PrinterReadingRead(BaseModel):
    id: str
    printer_id: str
    total_pages: int
    available_pages: Optional[int] = None
    status: str = "ok"
    response_time_ms: int = 0
    error_message: Optional[str] = None
    read_at: datetime


# ---------- Settings ----------
class SystemSettingsRead(BaseModel):
    id: str
    timezone: str
    date_format: str
    created_at: datetime
    updated_at: datetime


class SystemSettingsUpdate(BaseModel):
    timezone: Optional[str] = None
    date_format: Optional[str] = None

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str) -> str:
        if value is None:
            return value
        # Lista básica de timezones válidos
        valid_timezones = [
            "UTC",
            "America/Sao_Paulo",
            "America/New_York",
            "America/Los_Angeles",
            "Europe/London",
            "Europe/Paris",
            "Asia/Tokyo",
            "Asia/Shanghai",
            "Australia/Sydney",
        ]
        if value not in valid_timezones:
            raise ValueError(f"Timezone inválido. Aceitos: {', '.join(valid_timezones)}")
        return value
class ReportRequest(BaseModel):
    printer_id: Optional[str] = None
    sector: Optional[str] = None
    start_date: str  # YYYY-MM-DD (required)
    end_date: str  # YYYY-MM-DD (required)
    format: str = "csv"  # csv | pdf | excel

    @field_validator("start_date", "end_date")
    @classmethod
    def validate_date_format(cls, value: str) -> str:
        try:
            datetime.strptime(value, "%Y-%m-%d")
        except ValueError as exc:
            raise ValueError("Data inválida. Utilize o formato YYYY-MM-DD.") from exc
        return value

    @field_validator("end_date")
    @classmethod
    def validate_date_range(cls, value: str, info):
        start_date = info.data.get("start_date")
        if start_date and datetime.strptime(value, "%Y-%m-%d") < datetime.strptime(start_date, "%Y-%m-%d"):
            raise ValueError("A data final deve ser igual ou posterior à data inicial.")
        return value
