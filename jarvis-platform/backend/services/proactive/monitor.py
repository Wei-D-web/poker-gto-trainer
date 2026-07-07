"""System and external monitoring — CPU, memory, network, prices."""

import logging
import platform
from typing import Optional

logger = logging.getLogger(__name__)


async def check_system_health() -> dict:
    """Check system health: CPU, memory, disk.

    Returns:
        dict with status indicators
    """
    health = {
        "cpu_percent": None,
        "memory_percent": None,
        "disk_percent": None,
        "status": "unknown",
        "alerts": [],
    }

    try:
        import psutil

        # CPU
        cpu = psutil.cpu_percent(interval=1)
        health["cpu_percent"] = cpu
        if cpu > 90:
            health["alerts"].append(f"CPU usage critical: {cpu}%")
        elif cpu > 70:
            health["alerts"].append(f"CPU usage high: {cpu}%")

        # Memory
        mem = psutil.virtual_memory()
        health["memory_percent"] = mem.percent
        if mem.percent > 90:
            health["alerts"].append(f"Memory usage critical: {mem.percent}%")

        # Disk
        disk = psutil.disk_usage("/")
        health["disk_percent"] = disk.percent
        if disk.percent > 90:
            health["alerts"].append(f"Disk usage critical: {disk.percent}%")

    except ImportError:
        # Fallback: platform-specific checks
        if platform.system() == "Darwin":
            import subprocess
            try:
                # Get memory pressure on macOS
                result = subprocess.run(
                    ["memory_pressure"],
                    capture_output=True, text=True, timeout=5,
                )
                health["memory_info"] = result.stdout[:200]
            except Exception:
                pass

    # Determine overall status
    if health["alerts"]:
        health["status"] = "warning"
    else:
        health["status"] = "healthy"

    return health


async def check_network() -> dict:
    """Check network connectivity."""
    import socket

    status = {"connected": False, "latency_ms": None, "hostname": socket.gethostname()}

    try:
        import time
        start = time.time()
        socket.create_connection(("8.8.8.8", 53), timeout=3)
        status["latency_ms"] = round((time.time() - start) * 1000, 1)
        status["connected"] = True
    except Exception:
        pass

    return status


async def check_processes(top_n: int = 5) -> list[dict]:
    """Get top CPU-consuming processes."""
    try:
        import psutil

        procs = []
        for p in psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent"]):
            try:
                info = p.info
                if info["cpu_percent"] and info["cpu_percent"] > 0:
                    procs.append(info)
            except Exception:
                pass

        procs.sort(key=lambda x: x.get("cpu_percent", 0), reverse=True)
        return [
            {
                "pid": p["pid"],
                "name": p["name"],
                "cpu_percent": round(p.get("cpu_percent", 0), 2),
                "memory_percent": round(p.get("memory_percent", 0), 2),
            }
            for p in procs[:top_n]
        ]
    except ImportError:
        return []
