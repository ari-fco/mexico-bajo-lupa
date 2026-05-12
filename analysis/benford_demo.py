"""Quick Benford demo over ComprasMX contracts.

Prerequisites:
  python etl/comprasmx.py    # produces data/processed/comprasmx_contratos.parquet

Usage:
  python analysis/benford_demo.py
  python analysis/benford_demo.py --estado "Jalisco"
  python analysis/benford_demo.py --dependencia "Secretaria de Salud"
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "etl"))
from common import to_cve_ent  # noqa: E402

PARQUET = ROOT / "data" / "processed" / "comprasmx_contratos.parquet"


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--estado", default=None, help="Nombre o CVE_ENT")
    p.add_argument("--dependencia", default=None, help="Match parcial (case-insensitive)")
    p.add_argument("--min-monto", type=float, default=1.0)
    args = p.parse_args()

    if not PARQUET.exists():
        raise SystemExit(
            f"Falta {PARQUET}. Corre: python etl/comprasmx.py"
        )

    df = pd.read_parquet(PARQUET)
    if args.estado:
        cve = to_cve_ent(args.estado) or args.estado
        df = df[df["cve_ent"] == cve]
    if args.dependencia:
        df = df[df["dependencia"].str.contains(args.dependencia, case=False, na=False)]

    df = df[df["monto"].notna() & (df["monto"] >= args.min_monto)]
    if len(df) < 100:
        print(
            f"Sólo {len(df)} contratos en filtro — Benford requiere ≥300 idealmente. "
            f"Continuamos pero los resultados son ruidosos."
        )

    digits = df["monto"].map(lambda x: int(str(int(x))[0]))
    obs = digits.value_counts(normalize=True).reindex(range(1, 10), fill_value=0)
    expected = pd.Series({d: math.log10(1 + 1 / d) for d in range(1, 10)})

    diff = (obs - expected).abs()
    mad = diff.mean()
    chi2 = (((obs * len(df) - expected * len(df)) ** 2) / (expected * len(df))).sum()

    print(f"\nMuestras: {len(df):,}")
    print(f"MAD     : {mad:.4f}")
    print(f"Chi²    : {chi2:.2f}  (df=8, 5% crit ~15.51)")
    print(f"\nDígito | Esperado | Observado | Δ")
    print(f"-------+----------+-----------+--------")
    for d in range(1, 10):
        e = expected[d] * 100
        o = obs[d] * 100
        flag = " ⚠" if abs(o - e) > 2.5 else ""
        print(f"   {d}   | {e:6.2f}%  |  {o:6.2f}%  | {o - e:+5.2f}pp{flag}")

    if mad < 0.006:
        verdict = "✓ Conformidad cercana"
    elif mad < 0.012:
        verdict = "✓ Conformidad aceptable"
    elif mad < 0.015:
        verdict = "△ Conformidad marginal — revisar"
    else:
        verdict = "✗ No conformidad — bandera estadística"

    print(f"\nVeredicto Nigrini: {verdict}")


if __name__ == "__main__":
    main()
