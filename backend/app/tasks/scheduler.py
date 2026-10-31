"""Scheduler for periodic monitoring."""
import asyncio
from datetime import datetime

from app.config import settings


async def start_scheduler():
    """Starts the periodic monitoring task."""
    from app.services.monitor_service import scan_all_printers
    from app.database import get_session

    interval = settings.SNMP_POLL_INTERVAL_MINUTES * 60

    async def monitor_loop():
        while True:
            try:
                async with get_session()() as session:
                    await scan_all_printers(session)
                    print(f"[{datetime.utcnow().isoformat()}] Monitoring cycle completed")
            except Exception as e:
                print(f"[{datetime.utcnow().isoformat()}] Monitoring error: {e}")

            await asyncio.sleep(interval)

    asyncio.create_task(monitor_loop())
    print(f"[{datetime.utcnow().isoformat()}] Scheduler started (interval: {interval}s)")


async def stop_scheduler():
    """Stops the scheduler."""
    print(f"[{datetime.utcnow().isoformat()}] Scheduler stopped")
