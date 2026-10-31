"""Reports router — consumption reports and exports."""
from datetime import datetime as dt
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import io
import csv

from app.deps import get_current_active_user, get_current_supervisor_or_admin, get_db
from app.models import Printer, PrinterReading
from app.schemas import ReportRequest

router = APIRouter()


@router.post("/consumption")
async def consumption_report(
    request: ReportRequest,
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Relatório de consumo por período e impressora/setor (todos os usuários).

    Calcula o consumo REAL no período (última leitura - primeira leitura).
    """
    # Parse dates
    start = dt.fromisoformat(request.start_date)
    end = dt.fromisoformat(request.end_date)
    end = end.replace(hour=23, minute=59, second=59)  # End of day

    # Build printer filter
    printer_filter = select(Printer.id).select_from(Printer)
    if request.printer_id:
        printer_filter = printer_filter.where(Printer.id == request.printer_id)
    if request.sector:
        printer_filter = printer_filter.where(func.lower(Printer.sector).contains(request.sector.strip().lower()))

    printer_result = await session.execute(printer_filter)
    printer_ids = [row[0] for row in printer_result.all()]

    if not printer_ids:
        return {
            "period": {"start": request.start_date, "end": request.end_date},
            "results": [],
        }

    results = []
    for printer_id in printer_ids:
        printer_result = await session.execute(
            select(Printer).where(Printer.id == printer_id)
        )
        printer = printer_result.scalar_one()

        # Baseline: última leitura anterior ao início do período.
        baseline_result = await session.execute(
            select(PrinterReading.total_pages)
            .where(PrinterReading.printer_id == printer_id)
            .where(PrinterReading.read_at < start)
            .where(PrinterReading.status == "online")
            .order_by(PrinterReading.read_at.desc())
            .limit(1)
        )
        baseline = baseline_result.scalar_one_or_none()

        # Leituras dentro do período: primeira e última para calcular a diferença.
        period_stmt = (
            select(PrinterReading)
            .where(PrinterReading.printer_id == printer_id)
            .where(PrinterReading.read_at >= start)
            .where(PrinterReading.read_at <= end)
            .where(PrinterReading.status == "online")
            .order_by(PrinterReading.read_at.asc())
        )
        period_result = await session.execute(period_stmt)
        period_readings = period_result.scalars().all()

        if period_readings:
            first_pages = int(period_readings[0].total_pages)
            last_pages = int(period_readings[-1].total_pages)
            start_counter = int(baseline) if baseline is not None else first_pages
            consumption = max(0, last_pages - start_counter)
        else:
            consumption = 0

        results.append({
            "printer_id": printer.id,
            "printer_name": printer.name,
            "sector": printer.sector or "Sem setor",
            "location": printer.location,
            "total_pages": consumption,
            "reading_count": len(period_readings),
        })

    return {
        "period": {"start": request.start_date, "end": request.end_date},
        "results": results,
    }


@router.get("/export/csv")
async def export_consumption_csv(
    printer_id: str | None = None,
    sector: str | None = None,
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Exporta histórico de leituras em CSV para análise."""
    stmt = select(
        Printer.name,
        Printer.sector,
        Printer.location,
        PrinterReading.read_at,
        PrinterReading.total_pages,
        PrinterReading.status,
    ).join(PrinterReading, Printer.id == PrinterReading.printer_id)

    if printer_id:
        stmt = stmt.where(Printer.id == printer_id)
    if sector:
        stmt = stmt.where(Printer.sector == sector)
    if start_date:
        start = dt.fromisoformat(start_date)
        stmt = stmt.where(PrinterReading.read_at >= start)
    if end_date:
        end = dt.fromisoformat(end_date).replace(hour=23, minute=59, second=59)
        stmt = stmt.where(PrinterReading.read_at <= end)

    result = await session.execute(stmt)
    rows = result.all()

    # Build CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Impressora", "Setor", "Localização", "Data/Hora", "Páginas", "Status"])
    for row in rows:
        writer.writerow([
            row[0],  # printer_name
            row[1] or "-",  # sector
            row[2] or "-",  # location
            row[3].strftime("%d/%m/%Y %H:%M:%S") if row[3] else "",  # read_at
            row[4],  # total_pages
            row[5],  # status
        ])

    csv_bytes = output.getvalue().encode("utf-8")

    return StreamingResponse(
        iter([csv_bytes]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=printer_consumption.csv"},
    )


@router.get("/export/pdf")
async def export_consumption_pdf(
    printer_id: str | None = None,
    sector: str | None = None,
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    session: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Exporta relatório de consumo em PDF."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib import colors
        from reportlab.lib.units import cm
        from io import BytesIO
    except ImportError:
        raise HTTPException(status_code=501, detail="ReportLab não disponível")

    # Busca dados
    stmt = select(
        Printer.name,
        Printer.sector,
        Printer.location,
        PrinterReading.read_at,
        PrinterReading.total_pages,
        PrinterReading.status,
    ).join(PrinterReading, Printer.id == PrinterReading.printer_id)

    if printer_id:
        stmt = stmt.where(Printer.id == printer_id)
    if sector:
        stmt = stmt.where(Printer.sector == sector)
    if start_date:
        start = dt.fromisoformat(start_date)
        stmt = stmt.where(PrinterReading.read_at >= start)
    if end_date:
        end = dt.fromisoformat(end_date).replace(hour=23, minute=59, second=59)
        stmt = stmt.where(PrinterReading.read_at <= end)

    result = await session.execute(stmt)
    rows = result.all()

    # Cria PDF
    pdf_buffer = BytesIO()
    doc = SimpleDocTemplate(pdf_buffer, pagesize=A4, topMargin=1*cm, bottomMargin=1*cm)
    elements = []

    # Título
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#3b82f6'),
        spaceAfter=12,
    )
    elements.append(Paragraph("📊 Relatório de Consumo de Impressoras", title_style))
    
    # Período
    period_text = f"Período: {start_date or 'Início'} até {end_date or 'Hoje'}"
    elements.append(Paragraph(period_text, styles['Normal']))
    elements.append(Spacer(1, 0.5*cm))

    # Tabela
    data = [["Impressora", "Setor", "Localização", "Data/Hora", "Páginas", "Status"]]
    for row in rows:
        data.append([
            row[0],
            row[1] or "-",
            row[2] or "-",
            row[3].strftime("%d/%m/%Y %H:%M:%S") if row[3] else "",
            str(row[4]),
            row[5],
        ])

    table = Table(data, colWidths=[2.5*cm, 2*cm, 2.5*cm, 2.5*cm, 1.5*cm, 1.5*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
    ]))
    elements.append(table)

    doc.build(elements)
    pdf_buffer.seek(0)

    return StreamingResponse(
        iter([pdf_buffer.getvalue()]),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=printer_consumption.pdf"},
    )
