"""Printers router — CRUD, monitoring, history."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_current_active_user, get_current_supervisor_or_admin, get_db
from app.models import Printer, PrinterReading
from app.models import PrinterStatus
from app.schemas import (
    PrinterCreate,
    PrinterRead,
    PrinterStatusInfo,
    PrinterUpdate,
)
from app.services.snmp_service import test_printer_connection

router = APIRouter()


@router.get("", response_model=list[PrinterRead])
async def list_printers(
    sector: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Listar impressoras (todos os usuários)."""
    stmt = select(Printer).order_by(Printer.created_at.desc())
    if sector:
        stmt = stmt.where(Printer.sector == sector)
    if status_filter:
        stmt = stmt.where(Printer.status == status_filter)

    result = await session.execute(stmt.offset((page - 1) * size).limit(size))
    return result.scalars().all()


@router.post("", response_model=PrinterRead, status_code=201)
async def create_printer(
    payload: PrinterCreate,
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_supervisor_or_admin),
):
    """Criar impressora (apenas Admin e Supervisor)."""
    printer_data = payload.model_dump()
    printer_data["snmp_enabled"] = payload.snmp_enabled and bool(payload.snmp_community)
    printer = Printer(**printer_data)
    session.add(printer)
    await session.commit()
    await session.refresh(printer)
    return printer


@router.get("/{printer_id}", response_model=PrinterRead)
async def get_printer(
    printer_id: str,
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Obter detalhes de uma impressora (todos os usuários)."""
    printer = await session.get(Printer, printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Impressora não encontrada")
    return printer


@router.put("/{printer_id}", response_model=PrinterRead)
async def update_printer(
    printer_id: str,
    payload: PrinterUpdate,
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_supervisor_or_admin),
):
    """Atualizar impressora (apenas Admin e Supervisor)."""
    printer = await session.get(Printer, printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Impressora não encontrada")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(printer, key, value)

    await session.commit()
    await session.refresh(printer)
    return printer


@router.delete("/{printer_id}", status_code=204)
async def delete_printer(
    printer_id: str,
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_supervisor_or_admin),
):
    """Deletar impressora (apenas Admin e Supervisor)."""
    printer = await session.get(Printer, printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Impressora não encontrada")

    readings = await session.execute(select(PrinterReading).where(PrinterReading.printer_id == printer_id))
    for r in readings.scalars().all():
        await session.delete(r)

    await session.delete(printer)
    await session.commit()


@router.post("/{printer_id}/test")
async def test_connection(
    printer_id: str,
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_supervisor_or_admin),
):
    """Testar conexão SNMP (apenas Admin e Supervisor)."""
    from datetime import datetime

    printer = await session.get(Printer, printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Impressora não encontrada")

    result = await test_printer_connection(
        printer.ip_address,
        community=printer.snmp_community or "public",
        port=printer.port,
        manufacturer=printer.manufacturer,
    )

    # Atualiza o estado e registra a leitura no formato do modelo atual.
    now = datetime.utcnow()
    if result.get("reachable"):
        printer.status = PrinterStatus.ONLINE
        printer.last_seen_at = now
        printer.last_error = result.get("error")
    else:
        printer.status = PrinterStatus.OFFLINE
        printer.last_error = (result.get("error") or "SNMP sem resposta")[:500]

    reading = PrinterReading(
        printer_id=printer_id,
        total_pages=result.get("pages_total") or 0,
        status=printer.status.value,
        response_time_ms=0,
        error_message=(result.get("error") or "")[:512] or None,
        snmp_raw=__import__("json").dumps({"counter_oid": result.get("counter_oid")}),
        read_at=now,
    )
    session.add(reading)
    await session.commit()

    return {
        "status": result["status"],
        "reachable": result["reachable"],
        "pages_total": result.get("pages_total"),
        "error": result.get("error"),
        "counter_oid": result.get("counter_oid"),
    }
    
    return {
        "status": result["status"],
        "reachable": result["reachable"],
        "pages_total": result.get("pages_total"),
        "error": result.get("error"),
        "counter_oid": result.get("counter_oid"),
    }


@router.get("/{printer_id}/readings", response_model=list[dict])
async def get_readings(
    printer_id: str,
    days: int = Query(30, ge=1, le=365),
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Histórico de leituras recentes de uma impressora."""
    stmt = (
        select(PrinterReading)
        .where(PrinterReading.printer_id == printer_id)
        .order_by(PrinterReading.read_at.desc())
    )
    since = __import__("datetime").timedelta(days=days)
    stmt = stmt.where(PrinterReading.read_at >= __import__("datetime").datetime.utcnow() - since)

    result = await session.execute(stmt)
    readings = result.scalars().all()

    return [
        {
            "id": r.id,
            "total_pages": r.total_pages,
            "available_pages": r.available_pages,
            "status": r.status,
            "response_time_ms": r.response_time_ms,
            "error_message": r.error_message,
            "read_at": r.read_at.isoformat(),
        }
        for r in readings
    ]


@router.get("/{printer_id}/details")
async def get_printer_details(
    printer_id: str,
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Detalhes completos da impressora com última leitura."""
    printer_result = await session.execute(
        select(Printer).where(Printer.id == printer_id)
    )
    printer = printer_result.scalar_one_or_none()
    if not printer:
        raise HTTPException(status_code=404, detail="Impressora não encontrada")

    # Última leitura
    last_reading_result = await session.execute(
        select(PrinterReading)
        .where(PrinterReading.printer_id == printer_id)
        .order_by(PrinterReading.read_at.desc())
        .limit(1)
    )
    last_reading = last_reading_result.scalar_one_or_none()

    # Leituras anteriores para calcular consumo
    previous_reading_result = await session.execute(
        select(PrinterReading)
        .where(PrinterReading.printer_id == printer_id)
        .where(PrinterReading.status == PrinterStatus.ONLINE.value)
        .order_by(PrinterReading.read_at.desc())
        .limit(2)
    )
    previous_readings = list(previous_reading_result.scalars().all())

    consumption_today = 0
    consumption_last_reading = 0
    if len(previous_readings) >= 2:
        consumption_last_reading = max(0, previous_readings[0].total_pages - previous_readings[1].total_pages)
        if previous_readings[0].read_at.date() == __import__("datetime").datetime.utcnow().date():
            consumption_today = consumption_last_reading

    return {
        "id": printer.id,
        "name": printer.name,
        "manufacturer": printer.manufacturer,
        "model": printer.model,
        "ip_address": printer.ip_address,
        "sector": printer.sector,
        "location": printer.location,
        "status": printer.status,
        "last_reading": {
            "total_pages": last_reading.total_pages if last_reading else None,
            "available_pages": last_reading.available_pages if last_reading else None,
            "status": last_reading.status if last_reading else None,
            "error_message": last_reading.error_message if last_reading else None,
            "read_at": last_reading.read_at.isoformat() if last_reading else None,
        },
        "consumption_since_last": consumption_last_reading,
        "consumption_today": consumption_today,
    }


@router.get("/dashboard/summary")
async def dashboard_summary(
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Dashboard com status e consumo calculado a partir das diferenças dos contadores."""
    from datetime import datetime, timedelta

    total = await session.scalar(select(func.count(Printer.id))) or 0
    online = await session.scalar(
        select(func.count(Printer.id)).where(Printer.status == PrinterStatus.ONLINE.value)
    ) or 0
    offline = await session.scalar(
        select(func.count(Printer.id)).where(Printer.status == PrinterStatus.OFFLINE.value)
    ) or 0
    with_errors = await session.scalar(
        select(func.count(Printer.id)).where(Printer.status == PrinterStatus.ERROR.value)
    ) or 0
    total_readings = await session.scalar(select(func.count(PrinterReading.id))) or 0

    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=6)

    # Contadores são acumulados. Nunca somamos todas as leituras.
    printer_result = await session.execute(select(Printer.id, Printer.sector))
    printers_data = printer_result.all()
    # Mantém somente contadores lidos com sucesso; falhas SNMP podem gravar 0 e
    # distorcer o delta entre leituras válidas.
    reading_result = await session.execute(
        select(PrinterReading.printer_id, PrinterReading.total_pages, PrinterReading.read_at)
        .where(PrinterReading.read_at <= now)
        .where(PrinterReading.status == PrinterStatus.ONLINE.value)
        .order_by(PrinterReading.printer_id, PrinterReading.read_at.asc())
    )

    readings_by_printer: dict[str, list[tuple[int, datetime]]] = {}
    for row in reading_result.all():
        readings_by_printer.setdefault(row[0], []).append((int(row[1]), row[2]))

    def consumption_since(printer_readings, start):
        before = [pages for pages, read_at in printer_readings if read_at < start]
        inside = [pages for pages, read_at in printer_readings if read_at >= start]
        if not inside:
            return 0
        baseline = before[-1] if before else inside[0]
        return max(0, inside[-1] - baseline)

    current_counters = [
        printer_readings[-1][0]
        for printer_readings in readings_by_printer.values()
        if printer_readings
    ]
    total_pages = sum(current_counters)
    today_pages = 0
    week_pages = 0
    sectors: dict[str, int] = {}
    daily: dict[str, int] = {}

    for printer_id, sector in printers_data:
        printer_readings = readings_by_printer.get(printer_id, [])
        printer_week = consumption_since(printer_readings, week_start)
        printer_today = consumption_since(printer_readings, today_start)
        week_pages += printer_week
        today_pages += printer_today
        sector_name = sector or "Sem setor"
        sectors[sector_name] = sectors.get(sector_name, 0) + printer_week

        # Cada delta válido é atribuído ao dia em que a nova leitura foi feita.
        for index in range(1, len(printer_readings)):
            previous_pages, _ = printer_readings[index - 1]
            current_pages, read_at = printer_readings[index]
            if read_at >= week_start:
                delta = max(0, current_pages - previous_pages)
                day = read_at.date().isoformat()
                daily[day] = daily.get(day, 0) + delta

    return {
        "total_printers": total,
        "online": online,
        "offline": offline,
        "with_errors": with_errors,
        "total_readings": total_readings,
        "total_pages_printed": total_pages,
        "today_pages_printed": today_pages,
        "week_pages_printed": week_pages,
        "by_sector": [
            {"name": name, "pages": pages}
            for name, pages in sectors.items()
            if pages > 0
        ],
        "daily_trend": [
            {"date": day, "pages": pages}
            for day, pages in sorted(daily.items())
        ],
    }


@router.get("/dashboard/overview")
async def dashboard_overview(
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Vencedor padrão para impressão JSON."""
    return {"status": "ok"}
