"""Monitor service for periodic printer monitoring."""
import asyncio
import json
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Printer, PrinterReading, PrinterStatus
from app.services.snmp_service import test_printer_connection


async def monitor_printer(
    printer: Printer,
    session: AsyncSession,
) -> Optional[PrinterReading]:
    """Monitora uma única impressora e grava o reading."""
    start = datetime.utcnow()
    info = await test_printer_connection(
        printer.ip_address,
        community=printer.snmp_community or "public",
        port=printer.port,
        manufacturer=printer.manufacturer,
    )

    now = datetime.utcnow()
    elapsed_ms = int((now - start).total_seconds() * 1000)

    status = PrinterStatus.ONLINE.value if info.get("reachable") else PrinterStatus.OFFLINE.value

    reading = PrinterReading(
        printer_id=printer.id,
        total_pages=info.get("pages_total") or 0,
        status=status,
        response_time_ms=elapsed_ms,
        error_message=info.get("error"),
        snmp_raw=json.dumps({
            **(info.get("raw") or {}),
            "counter_oid": info.get("counter_oid"),
        }),
    )
    session.add(reading)

    if info.get("reachable"):
        printer.status = PrinterStatus.ONLINE.value
        printer.last_seen_at = now
        printer.last_error = None
        printer.snmp_enabled = True
    else:
        printer.status = PrinterStatus.OFFLINE.value
        printer.last_error = (info.get("error") or "")[:500]

    session.add(printer)
    return reading


async def scan_all_printers(session: AsyncSession) -> list[PrinterReading]:
    """Faz scan de todas as impressoras cadastradas."""
    result = await session.execute(select(Printer).where(Printer.snmp_enabled == True))
    printers = result.scalars().all()

    readings = []
    for printer in printers:
        try:
            reading = await monitor_printer(printer, session)
            readings.append(reading)
        except Exception as e:
            print(f"Erro ao monitorar printer {printer.id}: {e}")

    await session.commit()
    return readings
