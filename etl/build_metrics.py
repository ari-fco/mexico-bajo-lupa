"""Build the dashboard's per-state metrics Parquet.

Reads:
  data/processed/sesnsp_estatal.parquet
  data/processed/conapo_poblacion.parquet
  data/processed/comprasmx_contratos.parquet  (optional, federal-only)

Writes:
  web/public/data/estado_metrics.parquet
  web/public/data/dependencias_riesgo.parquet
  web/public/data/benford_nacional.parquet

Notes:
  - SESNSP usa tipo_delito="Homicidio" y subtipo="Homicidio doloso"; filtramos
    por subtipo para precisión.
  - ComprasMX federal NO tiene desglose estatal — sus métricas (Benford, %AD)
    son nacionales por dependencia, no estatales.

Run:
  python etl/build_metrics.py
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATA_PROCESSED, write_parquet, setup_logging, ESTADOS

log = setup_logging("metrics")

ESTADO_NAMES = dict(ESTADOS)
BENFORD_EXPECTED = {d: math.log10(1 + 1 / d) for d in range(1, 10)}


def benford_mad(series: pd.Series) -> float:
    """First-digit MAD per Nigrini. Returns NaN if too few values."""
    s = series.dropna()
    s = s[s >= 1]
    if len(s) < 100:
        return float("nan")
    digits = s.map(lambda x: int(str(int(abs(x)))[0]))
    counts = digits.value_counts(normalize=True).reindex(range(1, 10), fill_value=0)
    expected = pd.Series(BENFORD_EXPECTED)
    return float((counts - expected).abs().mean())


def main() -> None:
    sesnsp_p = DATA_PROCESSED / "sesnsp_estatal.parquet"
    pob_p = DATA_PROCESSED / "conapo_poblacion.parquet"
    cmx_p = DATA_PROCESSED / "comprasmx_contratos.parquet"
    pib_p = DATA_PROCESSED / "inegi_pib.parquet"
    pobr_p = DATA_PROCESSED / "coneval_pobreza.parquet"
    shcp_p = DATA_PROCESSED / "shcp_gasto.parquet"

    if not sesnsp_p.exists():
        raise SystemExit(f"Falta {sesnsp_p}. Corre primero: python etl/sesnsp.py")

    sesnsp = pd.read_parquet(sesnsp_p)
    pob = pd.read_parquet(pob_p) if pob_p.exists() else None
    cmx = pd.read_parquet(cmx_p) if cmx_p.exists() else None
    pib = pd.read_parquet(pib_p) if pib_p.exists() else None
    pobreza = pd.read_parquet(pobr_p) if pobr_p.exists() else None
    shcp = pd.read_parquet(shcp_p) if shcp_p.exists() else None

    # === Homicidio doloso por estado ===
    # SESNSP: tipo_delito="Homicidio", subtipo="Homicidio doloso"
    if "subtipo" not in sesnsp.columns:
        raise RuntimeError("sesnsp_estatal.parquet sin columna subtipo")
    homicidio = sesnsp[
        sesnsp["subtipo"].str.contains("Homicidio doloso", case=False, na=False)
    ]
    log.info("Filas homicidio doloso: %d", len(homicidio))

    last_year = int(homicidio["ano"].max())

    h = homicidio.assign(ym=lambda d: d["ano"] * 12 + d["mes"]).sort_values("ym")
    cutoff_high = int(h["ym"].max())
    cutoff_low = cutoff_high - 11

    last12 = (
        h[(h["ym"] >= cutoff_low) & (h["ym"] <= cutoff_high)]
        .groupby("cve_ent")["total"]
        .sum()
        .rename("homicidios_total_ult12m")
    )
    prev12 = (
        h[(h["ym"] >= cutoff_low - 12) & (h["ym"] <= cutoff_high - 12)]
        .groupby("cve_ent")["total"]
        .sum()
        .rename("homicidios_total_prev12m")
    )

    df = pd.concat([last12, prev12], axis=1).fillna(0).astype(int).reset_index()

    # === Población (latest year of corte) ===
    if pob is not None:
        pop_year = int(pob["ano"].max())
        # Use year matching corte if available, else latest
        target_year = min(last_year, pop_year)
        latest_pop = (
            pob[pob["ano"] == target_year]
            .set_index("cve_ent")["poblacion"]
            .rename("poblacion")
        )
        log.info("Población: usando año %d", target_year)
    else:
        latest_pop = pd.Series(
            {cve: 1_000_000 for cve, _ in ESTADOS}, name="poblacion"
        )

    df = df.merge(latest_pop, on="cve_ent", how="left")
    df["homicidios_100k_ult12m"] = (
        df["homicidios_total_ult12m"] / df["poblacion"] * 100_000
    ).round(2)
    df["cambio_yoy"] = np.where(
        df["homicidios_total_prev12m"] > 0,
        (df["homicidios_total_ult12m"] - df["homicidios_total_prev12m"])
        / df["homicidios_total_prev12m"]
        * 100,
        0,
    ).round(1)

    # === Riesgo compuesto (sólo seguridad por ahora) ===
    # Score 0..100 basado en percentil nacional de homicidios/100k
    df["riesgo"] = (
        df["homicidios_100k_ult12m"].rank(pct=True) * 100
    ).round(1).fillna(0)

    df["estado"] = df["cve_ent"].map(ESTADO_NAMES)
    df["ano_corte"] = last_year

    # === V2: PIB per cápita (INEGI · pesos a precios 2018) ===
    if pib is not None and pob is not None:
        pib_year = int(pib["ano"].max())
        pib_latest = (
            pib[pib["ano"] == pib_year]
            .set_index("cve_ent")["pib_total"]
            .rename("pib_total")
        )
        # Población del mismo año del PIB (si existe en CONAPO; si no, último año disponible)
        pob_for_pib = pob[pob["ano"] == pib_year]
        if pob_for_pib.empty:
            pob_for_pib = pob[pob["ano"] == int(pob["ano"].max())]
            log.info(
                "PIB año=%d sin matching en CONAPO; uso población %d",
                pib_year,
                int(pob_for_pib["ano"].max()),
            )
        pob_pib = pob_for_pib.set_index("cve_ent")["poblacion"].rename("pob_for_pib")

        df = df.merge(pib_latest, on="cve_ent", how="left")
        df = df.merge(pob_pib, on="cve_ent", how="left")
        df["pib_per_capita"] = (df["pib_total"] / df["pob_for_pib"]).round(0)
        df["ano_pib"] = pib_year
        # Limpiar columnas temporales (no las exportamos al schema final)
        df = df.drop(columns=["pob_for_pib"])
        log.info(
            "PIB · año=%d · per cápita avg=%.0f MXN",
            pib_year,
            df["pib_per_capita"].mean(),
        )
    else:
        df["pib_total"] = pd.NA
        df["pib_per_capita"] = pd.NA
        df["ano_pib"] = pd.NA

    # === V2: Pobreza (CONEVAL · % población en pobreza · última medición) ===
    if pobreza is not None:
        pobr_year = int(pobreza["ano"].max())
        pobr_latest = (
            pobreza[pobreza["ano"] == pobr_year]
            .set_index("cve_ent")[
                ["pobreza_pct", "pobreza_extrema_pct", "vulnerables_carencias_pct"]
            ]
        )
        df = df.merge(pobr_latest, on="cve_ent", how="left")
        df["ano_pobreza"] = pobr_year
        log.info(
            "Pobreza · año=%d · avg=%.1f%% · extrema avg=%.1f%%",
            pobr_year,
            df["pobreza_pct"].mean(),
            df["pobreza_extrema_pct"].mean(),
        )
    else:
        df["pobreza_pct"] = pd.NA
        df["pobreza_extrema_pct"] = pd.NA
        df["vulnerables_carencias_pct"] = pd.NA
        df["ano_pobreza"] = pd.NA

    # === V2: SHCP gasto federalizado (último año completo · ≥12 meses) ===
    if shcp is not None:
        if "meses_reportados" in shcp.columns:
            full = shcp[shcp["meses_reportados"] >= 12]
        else:
            full = shcp
        if len(full) == 0:
            log.warning("SHCP sin años completos; uso último año disponible.")
            full = shcp
        gasto_year = int(full["ano"].max())
        gasto_latest = (
            full[full["ano"] == gasto_year]
            .set_index("cve_ent")["gasto_federalizado_total"]
            .rename("gasto_federalizado_total")
        )
        df = df.merge(gasto_latest, on="cve_ent", how="left")
        # Per cápita: usa población del mismo año (CONAPO) si existe; si no, la del corte.
        if pob is not None:
            pob_for_gasto = pob[pob["ano"] == gasto_year]
            if pob_for_gasto.empty:
                pob_for_gasto = pob[pob["ano"] == int(pob["ano"].max())]
            pob_g = (
                pob_for_gasto.set_index("cve_ent")["poblacion"].rename("pob_for_gasto")
            )
            df = df.merge(pob_g, on="cve_ent", how="left")
            df["gasto_federalizado_per_capita"] = (
                df["gasto_federalizado_total"] / df["pob_for_gasto"]
            ).round(0)
            df = df.drop(columns=["pob_for_gasto"])
        else:
            df["gasto_federalizado_per_capita"] = (
                df["gasto_federalizado_total"] / df["poblacion"]
            ).round(0)
        df["ano_gasto"] = gasto_year
        log.info(
            "SHCP gasto · año=%d · per cápita avg=%.0f MXN · total nacional=%.2f bn MXN",
            gasto_year,
            df["gasto_federalizado_per_capita"].mean(),
            df["gasto_federalizado_total"].sum() / 1e12,
        )
    else:
        df["gasto_federalizado_total"] = pd.NA
        df["gasto_federalizado_per_capita"] = pd.NA
        df["ano_gasto"] = pd.NA

    # Placeholder columns (V3+) — explicit None so frontend types align.
    # Las dos siguientes (`adjudicacion_directa_pct`, `benford_mad`) se
    # SOBREESCRIBEN abajo con los valores reales calculados desde ComprasMX
    # ESTATAL. Las dejamos primero para asegurar que la columna existe
    # incluso si el parquet de ComprasMX no estuviera disponible.
    df["transparencia_pct"] = pd.NA
    df["adjudicacion_directa_pct"] = pd.NA
    df["benford_mad"] = pd.NA
    df["contratos_estatales"] = 0
    df["ano_compras_estatal"] = pd.NA

    # === V3-A: ComprasMX ESTATAL — métricas reales por entidad federativa ===
    # El CSV federal trae ~12k contratos donde ramo == nombre del estado
    # y orden_gobierno == "ESTATAL". El cve_ent ya está resuelto en ETL.
    # Aquí calculamos %AD, MAD Benford y total de contratos por estado.
    if cmx is not None and "orden_gobierno" in cmx.columns:
        cmx_est = cmx[cmx["orden_gobierno"] == "ESTATAL"].copy()
        montos_est = cmx_est[cmx_est["monto"].notna() & (cmx_est["monto"] >= 1)]

        if len(cmx_est) > 0:
            # % adjudicación directa por estado (sobre total de contratos
            # del estado, sin filtrar por monto)
            adj_est = (
                cmx_est.groupby("cve_ent")["modalidad"]
                .apply(lambda s: (s == "AD").mean() * 100)
                .round(1)
                .rename("adjudicacion_directa_pct_real")
            )
            # MAD Benford sobre los montos válidos del estado
            mad_est = (
                montos_est.groupby("cve_ent")["monto"]
                .apply(benford_mad)
                .round(4)
                .rename("benford_mad_real")
            )
            contratos_est = (
                cmx_est.groupby("cve_ent")
                .size()
                .rename("contratos_estatales_real")
            )
            # Último año con contratos firmados por estado (ignorando años 0/NaN)
            ano_valid = cmx_est[(cmx_est["ano"].notna()) & (cmx_est["ano"] > 1900)]
            ano_est = (
                ano_valid.groupby("cve_ent")["ano"].max().astype(int)
                .rename("ano_compras_estatal_real")
            )

            # Eliminar las placeholders pd.NA antes del merge para evitar
            # conflict de columnas con sufijos.
            df = df.drop(
                columns=[
                    "adjudicacion_directa_pct",
                    "benford_mad",
                    "contratos_estatales",
                    "ano_compras_estatal",
                ],
                errors="ignore",
            )
            df = df.merge(adj_est, on="cve_ent", how="left")
            df = df.merge(mad_est, on="cve_ent", how="left")
            df = df.merge(contratos_est, on="cve_ent", how="left")
            df = df.merge(ano_est, on="cve_ent", how="left")
            df = df.rename(
                columns={
                    "adjudicacion_directa_pct_real": "adjudicacion_directa_pct",
                    "benford_mad_real": "benford_mad",
                    "contratos_estatales_real": "contratos_estatales",
                    "ano_compras_estatal_real": "ano_compras_estatal",
                }
            )
            df["contratos_estatales"] = df["contratos_estatales"].fillna(0).astype(int)
            n_estados_30 = int((df["contratos_estatales"] >= 30).sum())
            log.info(
                "ComprasMX ESTATAL: %d contratos · %d estados (≥30 contratos: %d)",
                len(cmx_est),
                df["contratos_estatales"].gt(0).sum(),
                n_estados_30,
            )

    out_cols = [
        "cve_ent",
        "estado",
        "ano_corte",
        "poblacion",
        "homicidios_total_ult12m",
        "homicidios_total_prev12m",
        "homicidios_100k_ult12m",
        "cambio_yoy",
        "riesgo",
        "pib_total",
        "pib_per_capita",
        "ano_pib",
        "pobreza_pct",
        "pobreza_extrema_pct",
        "vulnerables_carencias_pct",
        "ano_pobreza",
        "gasto_federalizado_total",
        "gasto_federalizado_per_capita",
        "ano_gasto",
        "transparencia_pct",
        "adjudicacion_directa_pct",
        "benford_mad",
        "contratos_estatales",
        "ano_compras_estatal",
    ]
    # Asegurar que todas las columnas existan (algunas pueden faltar si una fuente
    # falló o no estaba disponible).
    for c in out_cols:
        if c not in df.columns:
            df[c] = pd.NA
    write_parquet(df[out_cols], "estado_metrics")
    log.info("Métricas estado: %d filas (corte %d).", len(df), last_year)

    # === ComprasMX: Benford nacional + dependencias riesgo ===
    # IMPORTANT: ComprasMX bundles ~12k contratos estatales en el CSV federal
    # (ramo == nombre de estado). Los filtramos aquí — V4 los procesará aparte.
    if cmx is not None and "monto" in cmx.columns:
        if "orden_gobierno" in cmx.columns:
            cmx_fed = cmx[cmx["orden_gobierno"] == "FEDERAL"]
            n_skip = len(cmx) - len(cmx_fed)
            log.info(
                "ComprasMX: %d contratos FEDERAL (omitidos %d ESTATAL para V4)",
                len(cmx_fed),
                n_skip,
            )
        else:
            cmx_fed = cmx
            log.warning(
                "comprasmx_contratos.parquet sin columna orden_gobierno; "
                "usando todos los registros (puede haber estatales mezclados).",
            )

        montos = cmx_fed[cmx_fed["monto"].notna() & (cmx_fed["monto"] >= 1)]
        # Benford nacional
        digits = montos["primer_digito"].dropna().astype(int)
        obs = (
            digits.value_counts(normalize=True)
            .reindex(range(1, 10), fill_value=0)
            .mul(100)
        )
        benford_nac = pd.DataFrame(
            {
                "digito": list(range(1, 10)),
                "esperado": [BENFORD_EXPECTED[d] * 100 for d in range(1, 10)],
                "observado": [float(obs[d]) for d in range(1, 10)],
            }
        )
        write_parquet(benford_nac, "benford_nacional")

        # Por institución: contratos, monto, %AD, MAD, riesgo
        deps_full = (
            montos.groupby("institucion", as_index=False)
            .agg(
                contratos=("contrato_id", "count"),
                monto_total=("monto", "sum"),
                ramo=("ramo", lambda s: s.dropna().mode().iloc[0] if len(s.dropna()) else None),
            )
        )
        adj = (
            cmx_fed.groupby("institucion")["modalidad"]
            .apply(lambda s: (s == "AD").mean() * 100)
            .round(1)
            .rename("adj_directa_pct")
        )
        mad = (
            montos.groupby("institucion")["monto"]
            .apply(benford_mad)
            .round(4)
            .rename("benford_mad")
        )
        deps = (
            deps_full.merge(adj, on="institucion", how="left")
            .merge(mad, on="institucion", how="left")
        )
        # Score: pondera AD% y MAD si existe. El raw combina AD% y MAD * 1500;
        # antes lo clippeábamos a 100 lo que saturaba ~35 dependencias en el
        # mismo valor (visualmente indistinguibles). Ahora re-escalamos lineal
        # contra el máximo observado entre dependencias *válidas* (≥30
        # contratos) para repartir el rango 0..100 sin saturación.
        deps["riesgo_score_raw"] = (
            deps["adj_directa_pct"].fillna(0) * 0.6
            + deps["benford_mad"].fillna(0) * 1500
        ).round(2)

        # Filtrar dependencias chicas para evitar ruido (≥30 contratos)
        deps = deps[deps["contratos"] >= 30].reset_index(drop=True)

        # Re-escalado lineal a 0..100 usando el máximo del universo filtrado.
        # El #1 queda en 100; el resto se distribuye proporcionalmente.
        # Mantiene el contrato 0..100 que la UI espera y diferencia los que
        # antes saturaban.
        max_raw = float(deps["riesgo_score_raw"].max() or 0.0)
        if max_raw > 0:
            deps["riesgo_score"] = (deps["riesgo_score_raw"] / max_raw * 100).round(1)
        else:
            deps["riesgo_score"] = 0.0
        # Sort: riesgo_score desc → benford_mad desc (desempate forense) →
        # adj_directa_pct desc → contratos desc (más volumen primero entre iguales)
        deps = deps.sort_values(
            ["riesgo_score", "benford_mad", "adj_directa_pct", "contratos"],
            ascending=[False, False, False, False],
            na_position="last",
        ).reset_index(drop=True)
        deps = deps.drop(columns=["riesgo_score_raw"])
        write_parquet(deps, "dependencias_riesgo")
        log.info("Dependencias FEDERAL (≥30 contratos): %d", len(deps))


if __name__ == "__main__":
    main()
