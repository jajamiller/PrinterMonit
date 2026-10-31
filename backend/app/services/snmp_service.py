"""SNMP service for reading printer page counters.

Using pysnmp 4.x with LibreNMS MIB database for manufacturer-specific OIDs.
"""
import asyncio
from typing import Any, Optional
import logging
import os

logger = logging.getLogger(__name__)

# Import SNMP components
from pysnmp.hlapi import (
    getCmd,
    SnmpEngine,
    CommunityData,
    UdpTransportTarget,
    ContextData,
    ObjectType,
    ObjectIdentity,
)

from app.config import settings
from app.services.mib_parser import load_oids_database


# Load OID database on module import
_DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'printer_oids.json')
MANUFACTURER_OIDS = load_oids_database(_DB_PATH)

logger.info(f"✅ Loaded {len(MANUFACTURER_OIDS)} manufacturers from OID database")


async def _run_snmp_query(
    host: str,
    oid: str,
    community: str = "public",
    port: int = 161,
    timeout: float = 3.0,
) -> Optional[int]:
    """Executa uma query SNMP getCmd simples."""
    try:
        def sync_query():
            """Sync SNMP query to run in thread pool."""
            try:
                # Create SNMP engine
                snmp_engine = SnmpEngine()
                
                # Canon devices on this network respond to v1; try v2c quickly,
                # then allow a longer v1 request. Avoid spending all retries on v2c.
                for mp_model, query_timeout, query_retries in ((1, min(timeout, 1.0), 0), (0, timeout, 1)):
                    error_gen = getCmd(
                        snmp_engine,
                        CommunityData(community, mpModel=mp_model),
                        UdpTransportTarget((host, port), timeout=query_timeout, retries=query_retries),
                        ContextData(),
                        ObjectType(ObjectIdentity(oid)),
                    )

                    error_indication, error_status, error_index, var_binds = next(error_gen)

                    if error_indication:
                        logger.debug(
                            "SNMPv%s query failed for %s:%s OID %s: %s",
                            "2c" if mp_model == 1 else "1",
                            host, port, oid, error_indication,
                        )
                        continue

                    if error_status:
                        logger.warning(f"SNMP error status from {host}:{port}: {error_status.prettyPrint()}")
                        return None

                    for var_bind in var_binds:
                        try:
                            value = int(var_bind[1])
                            logger.debug(f"SNMP success from {host}:{port} OID {oid}: {value}")
                            return value
                        except (ValueError, TypeError, AttributeError) as e:
                            logger.debug(f"Could not convert SNMP value from {host} to int: {var_bind[1]} — {e}")
                            return None

                return None
            except Exception as e:
                logger.error(f"SNMP sync query failed for {host}:{port} OID {oid}: {type(e).__name__}: {e}")
                raise

        # Run sync SNMP query in thread pool to avoid blocking event loop
        result = await asyncio.to_thread(sync_query)
        return result

    except asyncio.TimeoutError:
        logger.error(f"SNMP timeout for {host}:{port}")
        return None
    except OSError as e:
        logger.error(f"SNMP network error for {host}:{port} — {e}")
        return None
    except Exception as e:
        logger.error(f"SNMP query error for {host}:{oid} — {type(e).__name__}: {e}")
        return None


async def test_snmp_connectivity(
    host: str,
    community: str = "public",
    port: int = 161,
) -> bool:
    """Testa se a impressora responde a uma consulta SNMP básica."""
    def sync_query() -> bool:
        for mp_model in (1, 0):
            try:
                result = next(getCmd(
                    SnmpEngine(),
                    CommunityData(community, mpModel=mp_model),
                    UdpTransportTarget((host, port), timeout=3.0, retries=settings.SNMP_RETRIES),
                    ContextData(),
                    ObjectType(ObjectIdentity("1.3.6.1.2.1.1.1.0")),  # sysDescr
                ))
                error_indication, error_status, _, _ = result
                if not error_indication and not error_status:
                    return True
            except Exception as e:
                logger.warning("SNMPv%s connectivity check failed for %s:%s: %s", "2c" if mp_model == 1 else "1", host, port, e)
        return False

    return await asyncio.to_thread(sync_query)


async def read_printer_counters(
    ip_address: str,
    community: str = "public",
    port: int = 161,
    timeout: float = 3.0,
    manufacturer: Optional[str] = None,
) -> dict[str, Any]:
    """Lê os contadores de páginas das impressoras via OIDs.
    
    Tenta usar OID específico do fabricante primeiro, depois OIDs genéricos.
    """
    candidates = []
    
    # 1. Try manufacturer-specific OIDs first
    if manufacturer:
        mfr_lower = manufacturer.lower().replace(' ', '').replace('-', '')
        if mfr_lower in MANUFACTURER_OIDS:
            candidates.extend(MANUFACTURER_OIDS[mfr_lower])
            logger.info(f"Using {len(MANUFACTURER_OIDS[mfr_lower])} OID(s) for manufacturer: {manufacturer}")
    
    # 2. Add generic OIDs as fallback
    if 'generic' in MANUFACTURER_OIDS:
        candidates.extend(MANUFACTURER_OIDS['generic'])

    for oid in candidates:
        value = await _run_snmp_query(ip_address, oid, community=community, port=port, timeout=timeout)
        if value is not None:
            logger.info(f"Found page counter for {ip_address}: {value} pages (OID: {oid})")
            return {
                "pages_total": value,
                "pages_printed": value,
                "counter_oid": oid,
                "raw": {"total_pages": value, "counter_oid": oid},
            }

    logger.warning(f"No SNMP counter found for {ip_address} after trying {len(candidates)} OIDs")
    return {"pages_total": None, "pages_printed": None, "counter_oid": None, "raw": {}}


async def test_printer_connection(
    ip_address: str,
    community: str = "public",
    port: int = 161,
    manufacturer: Optional[str] = None,
) -> dict:
    """Testa conectividade SNMP e tenta ler o contador de páginas."""
    logger.info(
        "Testing SNMP connection to %s:%s (manufacturer: %s)",
        ip_address, port, manufacturer,
    )

    basic_connectivity = await test_snmp_connectivity(
        ip_address, community=community, port=port
    )
    if not basic_connectivity:
        logger.warning("No basic SNMP response from %s:%s", ip_address, port)
        return {
            "status": "offline",
            "reachable": False,
            "error": "SNMP não respondeu — verifique o IP, porta, comunidade SNMP e versão SNMP",
            "pages_total": None,
            "pages_printed": None,
            "counter_oid": None,
        }

    info = await read_printer_counters(
        ip_address,
        community=community,
        port=port,
        manufacturer=manufacturer,
    )
    if info.get("pages_total") is None:
        return {
            "status": "online",
            "reachable": True,
            "error": "Impressora respondeu SNMP, mas o contador de páginas não foi encontrado.",
            **info,
        }

    return {
        "status": "online",
        "reachable": True,
        "error": None,
        "pages_total": info["pages_total"],
        "counter_oid": info["counter_oid"],
    }
