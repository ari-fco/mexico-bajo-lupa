"""Run the full ETL in dependency order. Each step is its own module so
they can also be run individually.

Usage:
  pip install -r etl/requirements.txt
  python etl/run_all.py
"""

from __future__ import annotations

import importlib
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import setup_logging  # noqa: E402

log = setup_logging("etl")

STEPS = [
    # Source ingestion
    "sesnsp",
    "inegi_poblacion",
    "inegi_pib",
    "coneval_pobreza",
    "shcp_gasto",
    "comprasmx",
    "comprasmx_historico",
    "sat_efos",
    # Derived metrics (depend on the sources above)
    "build_metrics",
    "build_historico_metrics",
    "build_efos_metrics",
    "build_continuidad",
    # Bridge to the frontend
    "export_json",
]


def main() -> None:
    total_start = time.time()
    for step in STEPS:
        log.info("=== Paso: %s ===", step)
        t = time.time()
        try:
            mod = importlib.import_module(step)
            if hasattr(mod, "main"):
                mod.main()
            log.info("Paso %s ✓ %.1fs", step, time.time() - t)
        except SystemExit as e:
            log.error("Paso %s detuvo el pipeline: %s", step, e)
            return
        except Exception as e:  # noqa: BLE001
            log.exception("Paso %s falló: %s", step, e)
            log.error(
                "ETL detenido. Corrige el problema y vuelve a correr "
                "python etl/run_all.py o el módulo individual."
            )
            return
    log.info("ETL completo en %.1fs", time.time() - total_start)


if __name__ == "__main__":
    main()
