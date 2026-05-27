"""Profundización 4 — Continuidad temporal de proveedores.

Análisis longitudinal del histórico (2010-2024) para detectar patrones políticos:
- Proveedores que aparecen SOLO en años electorales (2012, 2015, 2018, 2021, 2024)
- Proveedores cuya actividad se concentra en UN SOLO sexenio
- "Transitorios": proveedores que aparecen y desaparecen con el cambio de gobierno
- "Persistentes": proveedores que cruzan TODOS los sexenios
- Patrones de "nacimiento" y "muerte" de proveedores por año

Sexenios mexicanos en el rango disponible:
- Calderón: 2006-12 (en nuestros datos: 2010-2012)
- EPN: 2012-18
- AMLO: 2018-24
- Sheinbaum: 2024- (datos parciales en histórico)
"""
from __future__ import annotations

from pathlib import Path
import json
import sys
import warnings

import numpy as np
import pandas as pd

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

warnings.filterwarnings("ignore")

DATA = Path("data/processed")
OUT = Path("ml/outputs")
REPORTS = Path("ml/reports")

ANOS_ELECTORALES = {2012, 2015, 2018, 2021, 2024}


def log(msg): print(msg, flush=True)


def sexenio_de_ano(ano: int) -> str:
    # Tradicionalmente: 1 dic año X → 30 nov año X+6
    # Para simplificar usamos año calendario completo
    if ano <= 2012: return "Calderón"
    if ano <= 2018: return "EPN"
    if ano <= 2024: return "AMLO"
    return "Sheinbaum"


def main():
    log("=== Profundización 4: continuidad temporal de proveedores ===\n")

    log("[1] Cargando histórico...")
    df = pd.read_parquet(DATA / "comprasmx_historico.parquet")
    df = df.dropna(subset=["monto", "ano", "proveedor"]).copy()
    df = df[df["monto"] > 0]
    df = df[(df["ano"] >= 2010) & (df["ano"] <= 2024)]
    df["ano"] = df["ano"].astype(int)
    df["sexenio"] = df["ano"].apply(sexenio_de_ano)
    log(f"  filas válidas: {len(df):,}")
    log(f"  rango años: {df['ano'].min()}-{df['ano'].max()}")
    log(f"  proveedores únicos: {df['proveedor'].nunique():,}")

    # ── Métricas por proveedor ─────────────────────────────────────────────────
    log("\n[2] Computando métricas por proveedor...")
    grp = df.groupby("proveedor").agg(
        n_contratos=("contrato_id", "count"),
        monto_total=("monto", "sum"),
        monto_max=("monto", "max"),
        n_anos=("ano", "nunique"),
        primer_ano=("ano", "min"),
        ultimo_ano=("ano", "max"),
        anos_set=("ano", lambda x: sorted(set(x))),
        sexenios_set=("sexenio", lambda x: sorted(set(x))),
    ).reset_index()

    grp["n_sexenios"] = grp["sexenios_set"].apply(len)
    grp["span_anos"] = grp["ultimo_ano"] - grp["primer_ano"] + 1
    grp["intensidad"] = grp["n_anos"] / grp["span_anos"].clip(lower=1)  # 1.0 = año tras año; 0.x = intermitente
    log(f"  proveedores procesados: {len(grp):,}")

    # ── Patrón 1: Solo en años electorales ─────────────────────────────────────
    log("\n[3] Patrón A: proveedores SOLO activos en años electorales...")

    def solo_electorales(anos_lst):
        anos_set = set(anos_lst)
        return len(anos_set) > 0 and anos_set.issubset(ANOS_ELECTORALES)

    grp["solo_electorales"] = grp["anos_set"].apply(solo_electorales)
    solo_e = grp[grp["solo_electorales"] & (grp["n_contratos"] >= 3)].sort_values("monto_total", ascending=False)
    log(f"  Proveedores SOLO en años electorales (con >=3 contratos): {len(solo_e):,}")
    log(f"  Monto total a estos proveedores: {solo_e['monto_total'].sum():,.0f} MXN")
    log("\n  Top 15:")
    for _, r in solo_e.head(15).iterrows():
        log(f"    {r['proveedor'][:50]:<50} | {r['n_contratos']:>4} contratos | {r['monto_total']:>14,.0f} | años: {r['anos_set']}")

    # ── Patrón 2: Por sexenio dominante ────────────────────────────────────────
    log("\n[4] Patrón B: proveedores por sexenio DOMINANTE (>=90% del monto)...")
    sex_monto = df.groupby(["proveedor", "sexenio"])["monto"].sum().unstack(fill_value=0)
    sex_monto["total"] = sex_monto.sum(axis=1)
    for sex in ["Calderón", "EPN", "AMLO", "Sheinbaum"]:
        if sex not in sex_monto.columns:
            sex_monto[sex] = 0
        sex_monto[f"pct_{sex}"] = sex_monto[sex] / sex_monto["total"].clip(lower=1)
    # Dominante = sexenio con >=90% del monto, mínimo 3 contratos
    grp = grp.merge(
        sex_monto[["pct_Calderón", "pct_EPN", "pct_AMLO", "pct_Sheinbaum"]],
        left_on="proveedor", right_index=True, how="left"
    )
    grp["sexenio_dominante"] = grp[["pct_Calderón", "pct_EPN", "pct_AMLO", "pct_Sheinbaum"]].idxmax(axis=1).str.replace("pct_", "")
    grp["pct_dominante"] = grp[["pct_Calderón", "pct_EPN", "pct_AMLO", "pct_Sheinbaum"]].max(axis=1)
    grp["sexenio_puro"] = (grp["pct_dominante"] >= 0.9) & (grp["n_contratos"] >= 3)

    for sex in ["Calderón", "EPN", "AMLO"]:
        puros = grp[(grp["sexenio_dominante"] == sex) & grp["sexenio_puro"]].sort_values("monto_total", ascending=False)
        log(f"\n  Sexenio puro {sex} (>=90% monto, >=3 contratos): {len(puros):,} proveedores | monto agregado {puros['monto_total'].sum():,.0f} MXN")
        log(f"    Top 5:")
        for _, r in puros.head(5).iterrows():
            log(f"      {r['proveedor'][:55]:<55} | {r['n_contratos']:>5} | {r['monto_total']:>14,.0f}")

    # ── Patrón 3: Transitorios entre sexenios ──────────────────────────────────
    log("\n[5] Patrón C: 'transitorios' — aparecen y mueren con el sexenio...")
    # Definimos transitorio: activo solo en 1 sexenio + actividad consistente dentro de ese sexenio
    transitorios = grp[
        grp["sexenio_puro"]
        & (grp["intensidad"] >= 0.6)  # activo en >=60% de los años del span
        & (grp["n_contratos"] >= 5)
    ].sort_values("monto_total", ascending=False)
    log(f"  Proveedores transitorios: {len(transitorios):,}")
    log(f"  Monto agregado: {transitorios['monto_total'].sum():,.0f} MXN")
    log("  Top 10:")
    for _, r in transitorios.head(10).iterrows():
        log(f"    {r['proveedor'][:50]:<50} | {r['sexenio_dominante']} ({r['primer_ano']}-{r['ultimo_ano']}) | {r['n_contratos']:>4} | {r['monto_total']:>14,.0f}")

    # ── Patrón 4: Persistentes (atraviesan TODOS los sexenios) ─────────────────
    log("\n[6] Patrón D: 'persistentes' — atraviesan 3+ sexenios...")
    persistentes = grp[(grp["n_sexenios"] >= 3) & (grp["n_contratos"] >= 10)].sort_values("monto_total", ascending=False)
    log(f"  Persistentes (3+ sexenios, 10+ contratos): {len(persistentes):,}")
    log("  Top 15:")
    for _, r in persistentes.head(15).iterrows():
        log(f"    {r['proveedor'][:50]:<50} | {r['n_anos']} años | {r['n_contratos']:>5} contratos | {r['monto_total']:>14,.0f}")

    # ── Patrón 5: Nacimientos y muertes por año ────────────────────────────────
    log("\n[7] Patrón E: nacimientos/muertes de proveedores por año...")
    nacimientos = df.groupby("proveedor")["ano"].min().value_counts().sort_index()
    muertes = df.groupby("proveedor")["ano"].max().value_counts().sort_index()
    movimiento = pd.DataFrame({"nacimientos": nacimientos, "muertes": muertes}).fillna(0).astype(int)
    movimiento["neto"] = movimiento["nacimientos"] - movimiento["muertes"]
    movimiento.to_parquet(OUT / "deep_temporal_nacimientos_muertes.parquet")
    log(f"\n  Año   | Nacimientos | Muertes | Neto")
    log(f"  ------|-------------|---------|------")
    for ano, row in movimiento.iterrows():
        flag = " ELECTORAL" if int(ano) in ANOS_ELECTORALES else ""
        flag2 = " ⚠ TRANSICIÓN" if int(ano) in {2012, 2018, 2024} else ""
        log(f"  {ano}  |     {row['nacimientos']:>5}   |  {row['muertes']:>5}  | {row['neto']:>+5}{flag}{flag2}")

    # ── Patrón 6: Concentración monetaria por año electoral ────────────────────
    log("\n[8] Patrón F: monto agregado por año, con flag electoral...")
    por_ano = df.groupby("ano").agg(
        n_contratos=("contrato_id", "count"),
        monto=("monto", "sum"),
        n_proveedores=("proveedor", "nunique"),
        pct_AD=("modalidad", lambda x: (x == "AD").mean()),
    ).reset_index()
    por_ano["es_electoral"] = por_ano["ano"].isin(ANOS_ELECTORALES)
    log(f"\n  Año   | Electoral | n_contr   | n_prov | monto              | %AD")
    log(f"  ------|-----------|-----------|--------|--------------------|------")
    for _, r in por_ano.iterrows():
        log(f"  {int(r['ano'])} | {'SI' if r['es_electoral'] else 'no':<9} | {r['n_contratos']:>7,}   | {r['n_proveedores']:>6,} | {r['monto']:>16,.0f}   | {r['pct_AD']*100:>4.0f}%")

    # Promedio en años electorales vs no
    e_avg = por_ano[por_ano["es_electoral"]]["pct_AD"].mean()
    ne_avg = por_ano[~por_ano["es_electoral"]]["pct_AD"].mean()
    log(f"\n  %AD promedio años electorales: {e_avg*100:.1f}%")
    log(f"  %AD promedio años no electorales: {ne_avg*100:.1f}%")
    log(f"  Diferencia: {(e_avg-ne_avg)*100:+.1f} puntos porcentuales")

    # ── Output ─────────────────────────────────────────────────────────────────
    log("\n[9] Guardando outputs...")
    # Marcar cada proveedor con su patrón
    grp["patron_temporal"] = "estandar"
    grp.loc[grp["solo_electorales"], "patron_temporal"] = "solo_electorales"
    grp.loc[grp["sexenio_puro"] & (grp["intensidad"] >= 0.6) & (grp["n_contratos"] >= 5), "patron_temporal"] = "transitorio"
    grp.loc[(grp["n_sexenios"] >= 3) & (grp["n_contratos"] >= 10), "patron_temporal"] = "persistente"

    cols_save = ["proveedor", "n_contratos", "monto_total", "monto_max", "n_anos", "primer_ano", "ultimo_ano",
                 "n_sexenios", "intensidad", "sexenio_dominante", "pct_dominante",
                 "pct_Calderón", "pct_EPN", "pct_AMLO", "pct_Sheinbaum",
                 "solo_electorales", "sexenio_puro", "patron_temporal"]
    grp[cols_save].to_parquet(OUT / "deep_continuidad_temporal_proveedores.parquet", index=False)

    findings = {
        "n_proveedores_total": int(len(grp)),
        "patron_solo_electorales": {
            "n": int(len(solo_e)),
            "monto_total": float(solo_e["monto_total"].sum()),
            "top_10": solo_e.head(10)[["proveedor", "n_contratos", "monto_total", "anos_set"]].to_dict("records"),
        },
        "patron_transitorios": {
            "n": int(len(transitorios)),
            "monto_total": float(transitorios["monto_total"].sum()),
            "por_sexenio": {
                sex: int(((grp["sexenio_dominante"] == sex) & grp["sexenio_puro"]).sum())
                for sex in ["Calderón", "EPN", "AMLO", "Sheinbaum"]
            },
            "top_10": transitorios.head(10)[["proveedor", "sexenio_dominante", "primer_ano", "ultimo_ano", "n_contratos", "monto_total"]].to_dict("records"),
        },
        "patron_persistentes": {
            "n": int(len(persistentes)),
            "monto_total": float(persistentes["monto_total"].sum()),
            "top_15": persistentes.head(15)[["proveedor", "n_anos", "n_contratos", "monto_total"]].to_dict("records"),
        },
        "anos_electorales_vs_no": {
            "pct_AD_electorales": round(float(e_avg), 4),
            "pct_AD_no_electorales": round(float(ne_avg), 4),
            "diferencia_pp": round(float((e_avg - ne_avg) * 100), 2),
        },
        "movimiento_proveedores": movimiento.reset_index().to_dict("records"),
    }
    with open(REPORTS / "16-continuidad-findings.json", "w", encoding="utf-8") as f:
        json.dump(findings, f, indent=2, default=str, ensure_ascii=False)
    log("Guardado: ml/reports/16-continuidad-findings.json")
    log("Guardado: ml/outputs/deep_continuidad_temporal_proveedores.parquet")
    log("Guardado: ml/outputs/deep_temporal_nacimientos_muertes.parquet")
    log("\n=== PROFUNDIZACIÓN 4 COMPLETA ===")


if __name__ == "__main__":
    main()
