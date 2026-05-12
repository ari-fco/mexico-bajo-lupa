"""Cross SAT EFOS list with ComprasMX federal contracts.

Hallazgo editorial:
  Cuántos contratos públicos federales 2024-2025 se firmaron con proveedores
  que el SAT ya había señalado bajo Art. 69-B CFF, y cuántos de esos son
  POSTERIORES a la fecha de presunción (el dato más jugoso: el gobierno
  contrata sabiendo, o pudiendo saber, que el proveedor está siendo
  investigado).

Inputs:
  data/processed/sat_efos.parquet              ← etl/sat_efos.py
  data/processed/comprasmx_contratos.parquet   ← etl/comprasmx.py

Outputs:
  data/processed/efos_cruce.parquet            ← todos los matches contrato↔EFOS
  data/processed/efos_top_proveedores.parquet  ← top 30 RFCs DEFINITIVOS por contratos
  data/processed/efos_top_dependencias.parquet ← top 20 dependencias con más exposición
  data/processed/efos_kpis.parquet             ← una sola fila con KPIs agregados

Y los JSONs equivalentes en web/src/data/:
  efos_kpis.json
  efos_top_proveedores.json
  efos_top_dependencias.json
  efos_estatus_breakdown.json   ← split de matches por estatus

Disclaimer editorial (NO es prueba penal):
  Estar listado en EFOS es una resolución administrativa SAT, no una sentencia
  penal. Algunas empresas se desvirtúan. Lo que el cruce muestra es señales
  para auditoría — la pregunta editorial es: ¿por qué siguieron contratando
  con presuntos EFOS sin documentar el descargo?

Run:
  python etl/build_efos_metrics.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATA_PROCESSED, setup_logging, write_parquet  # noqa: E402

log = setup_logging("efos-metrics")

WEB_DATA_TS = Path(__file__).resolve().parent.parent / "web" / "src" / "data"
WEB_DATA_TS.mkdir(parents=True, exist_ok=True)


def _write_json(name: str, payload: object, *, pretty: bool = False) -> Path:
    out = WEB_DATA_TS / f"{name}.json"
    with out.open("w", encoding="utf-8") as f:
        if pretty:
            json.dump(payload, f, ensure_ascii=False, indent=2, allow_nan=False, default=str)
        else:
            json.dump(
                payload, f, ensure_ascii=False, separators=(",", ":"),
                allow_nan=False, default=str,
            )
    size_kb = out.stat().st_size / 1024
    log.info("Escrito %s · %.1f KB", out.name, size_kb)
    return out


def _safe_int(v) -> int:
    try:
        return int(v)
    except Exception:  # noqa: BLE001
        return 0


def _safe_float(v) -> float:
    try:
        f = float(v)
        if pd.isna(f):
            return 0.0
        return f
    except Exception:  # noqa: BLE001
        return 0.0


def main() -> None:
    p_efos = DATA_PROCESSED / "sat_efos.parquet"
    p_cmx = DATA_PROCESSED / "comprasmx_contratos.parquet"
    if not p_efos.exists():
        raise FileNotFoundError(f"Falta {p_efos}. Corré primero etl/sat_efos.py")
    if not p_cmx.exists():
        raise FileNotFoundError(f"Falta {p_cmx}. Corré primero etl/comprasmx.py")

    efos = pd.read_parquet(p_efos)
    cmx = pd.read_parquet(p_cmx)

    log.info("EFOS: %d filas · ComprasMX: %d contratos", len(efos), len(cmx))

    # Restringimos análisis a contratos FEDERALES (APF) con RFC y fecha válida
    cmx_fed = cmx[cmx["orden_gobierno"] == "FEDERAL"].copy()
    cmx_fed["rfc_proveedor"] = cmx_fed["rfc_proveedor"].astype("string").str.strip().str.upper()

    # Para "posterior a presunción" necesitamos fecha_firma; no le pedimos al
    # ETL contratos sin fecha (35% del total ~ datos abiertos sin parsear).
    log.info(
        "Contratos federales: %d · con RFC válido: %d · con fecha_firma: %d",
        len(cmx_fed),
        cmx_fed["rfc_proveedor"].notna().sum(),
        cmx_fed["fecha_firma"].notna().sum(),
    )

    # === 1. Cruce contratos ↔ EFOS (un solo estatus por RFC: el "peor" disponible) ===
    # Si un RFC aparece en varios estatus (raro pero posible — actualizaciones),
    # priorizamos: DEFINITIVO > PRESUNTO > DESVIRTUADO > SENTENCIA_FAVORABLE.
    severity = {
        "DEFINITIVO": 4,
        "PRESUNTO": 3,
        "DESVIRTUADO": 2,
        "SENTENCIA_FAVORABLE": 1,
    }
    efos_clean = efos.dropna(subset=["rfc"]).copy()
    efos_clean["__sev"] = efos_clean["estatus"].map(severity).fillna(0)
    efos_clean = efos_clean.sort_values("__sev", ascending=False)
    efos_dedup = efos_clean.drop_duplicates(subset=["rfc"], keep="first").drop(columns="__sev")
    log.info("RFCs EFOS únicos (post-dedup por severidad): %d", len(efos_dedup))

    # Inner join contracts → EFOS by RFC
    cruce = cmx_fed.merge(
        efos_dedup[["rfc", "contribuyente", "estatus", "fecha_presuncion", "fecha_publicacion"]],
        left_on="rfc_proveedor",
        right_on="rfc",
        how="inner",
    )

    # Marcar si fue POSTERIOR a presunción.
    # Caso fuerte (fecha exacta): fecha_firma > fecha_presuncion
    # Caso débil (sólo año disponible): ano > año(fecha_presuncion)
    # ComprasMX no siempre publica fecha_firma — usamos la mejor señal disponible.
    fecha_firm_post = (
        cruce["fecha_firma"].notna()
        & cruce["fecha_presuncion"].notna()
        & (cruce["fecha_firma"] > cruce["fecha_presuncion"])
    )
    presuncion_year = cruce["fecha_presuncion"].dt.year
    ano_post = (
        cruce["fecha_firma"].isna()
        & cruce["ano"].notna()
        & (cruce["ano"] > 0)
        & presuncion_year.notna()
        & (cruce["ano"] > presuncion_year)
    )
    cruce["posterior_a_presuncion"] = fecha_firm_post
    cruce["posterior_por_ano"] = ano_post
    cruce["posterior_a_presuncion_o_ano"] = fecha_firm_post | ano_post

    # Restringir cruce al periodo cubierto por ComprasMX que el resto del sitio
    # ya muestra (2024-2025). Mantenemos también contratos sin fecha por
    # transparencia, pero los marcamos.
    cruce["en_ventana_2024_25"] = cruce["ano"].isin([2024, 2025])

    log.info(
        "Cruce: %d contratos federales con RFC en EFOS · %d definitivos · %d posteriores a presunción",
        len(cruce),
        (cruce["estatus"] == "DEFINITIVO").sum(),
        cruce["posterior_a_presuncion"].sum(),
    )

    # Limpiar tipos para parquet (datetime ya están bien)
    cruce_out = cruce.copy()
    write_parquet(cruce_out, "efos_cruce")

    # === 2. KPIs agregados ===
    in_window = cruce[cruce["en_ventana_2024_25"]]
    definitivos = cruce[cruce["estatus"] == "DEFINITIVO"]
    # "posteriores estricto": tenemos fecha_firma exacta y es posterior
    posteriores = cruce[cruce["posterior_a_presuncion"]]
    posteriores_def = posteriores[posteriores["estatus"] == "DEFINITIVO"]
    # "posteriores incluyendo evidencia por año" — la cifra editorial honesta
    posteriores_amplio = cruce[cruce["posterior_a_presuncion_o_ano"]]

    monto_total_cruce = _safe_float(cruce["monto"].sum())
    monto_definitivos = _safe_float(definitivos["monto"].sum())
    monto_posteriores = _safe_float(posteriores["monto"].sum())
    monto_post_def = _safe_float(posteriores_def["monto"].sum())

    pct_posterior = (
        len(posteriores) / len(cruce) * 100 if len(cruce) > 0 else 0.0
    )

    kpis = {
        "n_contratos_cruce": int(len(cruce)),
        "n_contratos_2024_25": int(len(in_window)),
        "n_contratos_definitivos": int(len(definitivos)),
        "n_contratos_posteriores": int(len(posteriores)),
        "n_contratos_posteriores_amplio": int(len(posteriores_amplio)),
        "n_contratos_posteriores_definitivos": int(len(posteriores_def)),
        "monto_total_cruce": monto_total_cruce,
        "monto_definitivos": monto_definitivos,
        "monto_posteriores": monto_posteriores,
        "monto_posteriores_amplio": _safe_float(posteriores_amplio["monto"].sum()),
        "monto_posteriores_definitivos": monto_post_def,
        "pct_posterior_de_total": round(pct_posterior, 2),
        "rfc_unicos_cruce": int(cruce["rfc_proveedor"].nunique()),
        "rfc_unicos_definitivos": int(definitivos["rfc_proveedor"].nunique()),
        "dependencias_unicas": int(cruce["institucion"].nunique()),
        "dependencias_unicas_definitivos": int(definitivos["institucion"].nunique()),
        "efos_total_listado": int(len(efos)),
        "efos_definitivos_listado": int((efos["estatus"] == "DEFINITIVO").sum()),
        "efos_presuntos_listado": int((efos["estatus"] == "PRESUNTO").sum()),
        "efos_desvirtuados_listado": int((efos["estatus"] == "DESVIRTUADO").sum()),
        "efos_sentencia_favorable_listado": int(
            (efos["estatus"] == "SENTENCIA_FAVORABLE").sum()
        ),
        "snapshot_fecha": str(efos["snapshot_fecha"].max()) if "snapshot_fecha" in efos.columns else None,
        "fuente_url": "http://omawww.sat.gob.mx/cifras_sat/Documents/Listado_Completo_69-B.csv",
    }

    pd.DataFrame([kpis]).to_parquet(
        DATA_PROCESSED / "efos_kpis.parquet", index=False, compression="zstd",
    )
    _write_json("efos_kpis", kpis, pretty=True)

    # === 3. Estatus breakdown (matches por estatus) ===
    breakdown = (
        cruce.groupby("estatus", as_index=False)
        .agg(
            n_contratos=("contrato_id", "count"),
            n_rfcs=("rfc_proveedor", "nunique"),
            monto_total=("monto", "sum"),
            posteriores=("posterior_a_presuncion", "sum"),
        )
        .sort_values("n_contratos", ascending=False)
    )
    breakdown["monto_total"] = breakdown["monto_total"].fillna(0).astype(float)
    breakdown["posteriores"] = breakdown["posteriores"].astype(int)
    breakdown_records = breakdown.to_dict(orient="records")
    _write_json("efos_estatus_breakdown", breakdown_records, pretty=True)

    # === 4. Top proveedores DEFINITIVOS ===
    # Top proveedores: incluimos TODOS los estatus, no sólo DEFINITIVO. Razón: el
    # cruce es genuinamente pequeño (las EFOS son shells, no top contratistas
    # APF), así que limitar a Definitivos dejaría la tabla vacía. Marcamos el
    # estatus en cada fila para que el lector lo distinga.
    top_prov = (
        cruce.groupby(["rfc_proveedor", "contribuyente", "estatus"], as_index=False)
        .agg(
            n_contratos=("contrato_id", "count"),
            monto_total=("monto", "sum"),
            n_posteriores=("posterior_a_presuncion", "sum"),
            n_posteriores_amplio=("posterior_a_presuncion_o_ano", "sum"),
            fecha_presuncion=("fecha_presuncion", "min"),
            ultimo_contrato=("fecha_firma", "max"),
            primer_contrato=("fecha_firma", "min"),
            n_dependencias=("institucion", "nunique"),
        )
        .sort_values(["n_contratos", "monto_total"], ascending=[False, False])
        .head(30)
    )
    top_prov_out = top_prov.copy()
    write_parquet(top_prov_out, "efos_top_proveedores")

    # JSON-friendly version
    top_prov_records = []
    for _, r in top_prov.iterrows():
        top_prov_records.append(
            {
                "rfc": r["rfc_proveedor"],
                "contribuyente": r["contribuyente"],
                "estatus": r["estatus"],
                "n_contratos": int(r["n_contratos"]),
                "n_posteriores": int(r["n_posteriores"]),
                "n_posteriores_amplio": int(r["n_posteriores_amplio"]),
                "n_dependencias": int(r["n_dependencias"]),
                "monto_total": _safe_float(r["monto_total"]),
                "fecha_presuncion": (
                    str(r["fecha_presuncion"].date()) if pd.notna(r["fecha_presuncion"]) else None
                ),
                "primer_contrato": (
                    str(r["primer_contrato"].date()) if pd.notna(r["primer_contrato"]) else None
                ),
                "ultimo_contrato": (
                    str(r["ultimo_contrato"].date()) if pd.notna(r["ultimo_contrato"]) else None
                ),
            }
        )
    _write_json("efos_top_proveedores", top_prov_records, pretty=True)

    # === 5. Top dependencias con más exposición ===
    top_deps = (
        cruce.groupby(["institucion", "ramo"], as_index=False)
        .agg(
            n_contratos=("contrato_id", "count"),
            n_definitivos=("estatus", lambda s: (s == "DEFINITIVO").sum()),
            n_posteriores=("posterior_a_presuncion", "sum"),
            n_posteriores_amplio=("posterior_a_presuncion_o_ano", "sum"),
            n_rfcs_efos=("rfc_proveedor", "nunique"),
            monto_total=("monto", "sum"),
        )
        .sort_values(["n_contratos", "monto_total"], ascending=[False, False])
        .head(20)
    )
    write_parquet(top_deps, "efos_top_dependencias")

    top_deps_records = []
    for _, r in top_deps.iterrows():
        top_deps_records.append(
            {
                "institucion": r["institucion"],
                "ramo": r["ramo"] if pd.notna(r["ramo"]) else None,
                "n_contratos": int(r["n_contratos"]),
                "n_definitivos": int(r["n_definitivos"]),
                "n_posteriores": int(r["n_posteriores"]),
                "n_posteriores_amplio": int(r["n_posteriores_amplio"]),
                "n_rfcs_efos": int(r["n_rfcs_efos"]),
                "monto_total": _safe_float(r["monto_total"]),
            }
        )
    _write_json("efos_top_dependencias", top_deps_records, pretty=True)

    # === 6. Casos titulares.
    # Filtramos por monto descendente sobre TODO el cruce. Marcamos qué casos
    # son "posteriores a presunción" (señal fuerte) y cuáles no.
    # Esto da al lector el ranking honesto: el contrato más grande con cualquier
    # estatus EFOS, con el flag de gravedad temporal explícito.
    leads = (
        cruce.sort_values("monto", ascending=False).head(15)
    )
    leads_records = []
    for _, r in leads.iterrows():
        dias_post = None
        if pd.notna(r["fecha_firma"]) and pd.notna(r["fecha_presuncion"]):
            dias_post = (r["fecha_firma"] - r["fecha_presuncion"]).days
        leads_records.append(
            {
                "rfc": r["rfc_proveedor"],
                "contribuyente": r["contribuyente"],
                "institucion": r["institucion"],
                "ramo": r["ramo"] if pd.notna(r["ramo"]) else None,
                "monto": _safe_float(r["monto"]),
                "modalidad": r["modalidad"],
                "fecha_firma": (
                    str(r["fecha_firma"].date()) if pd.notna(r["fecha_firma"]) else None
                ),
                "fecha_presuncion": (
                    str(r["fecha_presuncion"].date()) if pd.notna(r["fecha_presuncion"]) else None
                ),
                "ano": int(r["ano"]) if pd.notna(r["ano"]) and r["ano"] != 0 else None,
                "dias_despues_de_presuncion": dias_post,
                "posterior_a_presuncion": bool(r["posterior_a_presuncion"]),
                "posterior_por_ano": bool(r["posterior_por_ano"]),
                "estatus": r["estatus"],
                "descripcion": (r["descripcion"] or "")[:240] if r.get("descripcion") else None,
            }
        )
    _write_json("efos_leads", leads_records, pretty=True)

    # === Final log: human-readable summary ===
    log.info("=" * 60)
    log.info("RESUMEN HALLAZGO EFOS × ComprasMX")
    log.info("=" * 60)
    log.info("EFOS Definitivos en listado SAT       : %d", kpis["efos_definitivos_listado"])
    log.info("Contratos federales que cruzan EFOS    : %d", kpis["n_contratos_cruce"])
    log.info("  · con DEFINITIVOS                    : %d", kpis["n_contratos_definitivos"])
    log.info("  · POSTERIORES a presunción (estricto): %d (%.1f%%)",
             kpis["n_contratos_posteriores"], kpis["pct_posterior_de_total"])
    log.info("  · POSTERIORES amplio (incluye sólo año): %d", kpis["n_contratos_posteriores_amplio"])
    log.info("  · POSTERIORES estricto Y DEFINITIVOS  : %d", kpis["n_contratos_posteriores_definitivos"])
    log.info("Monto total contratos cruzados        : MXN %s",
             f"{kpis['monto_total_cruce']:,.0f}")
    log.info("Monto contratos posteriores DEFIN.    : MXN %s",
             f"{kpis['monto_posteriores_definitivos']:,.0f}")
    log.info("RFCs únicos cruzados                   : %d", kpis["rfc_unicos_cruce"])
    log.info("Dependencias expuestas                 : %d", kpis["dependencias_unicas"])
    log.info("=" * 60)


if __name__ == "__main__":
    main()
