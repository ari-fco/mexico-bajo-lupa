"""Profundización 2 — Validación contextual del top 20.

Para los 20 contratos/proveedores más relevantes del análisis:
- Contexto político: año electoral, sexenio (Calderón 2006-2012, EPN 2012-2018, AMLO 2018-2024, Sheinbaum 2024+)
- Trayectoria del proveedor: cuántos años activo, % AD, n_instituciones cliente
- Descripción completa
- Modalidad detallada (modalidad_raw)
- ¿Aparece en EFOS? ¿Pre o post presunción?
- Multi-señal: cuántos métodos lo flaggean
- Comparativa con su sector
"""
from __future__ import annotations

from pathlib import Path
import json
import sys
import warnings
import re

import numpy as np
import pandas as pd

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

warnings.filterwarnings("ignore")

DATA = Path("data/processed")
OUT = Path("ml/outputs")
REPORTS = Path("ml/reports")


def log(msg): print(msg, flush=True)


def normaliza_nombre(s: str) -> str:
    if not isinstance(s, str):
        return ""
    s = s.upper().strip()
    s = s.translate(str.maketrans("ÁÉÍÓÚÑ", "AEIOUN"))
    s = re.sub(r"[,\.\(\)\-/]", " ", s)
    s = re.sub(r"\bS\s*A\s+DE\s+C\s*V\b", "SADECV", s)
    s = re.sub(r"\bS\s+DE\s+R\s*L\s+DE\s+C\s*V\b", "SDERLDECV", s)
    s = re.sub(r"\bS\s+A\s+P\s+I\s+DE\s+C\s*V\b", "SAPIDECV", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def sexenio(ano: int) -> str:
    if ano <= 2012: return "Calderón (2006-2012)"
    if ano <= 2018: return "EPN (2012-2018)"
    if ano <= 2024: return "AMLO (2018-2024)"
    return "Sheinbaum (2024-)"


# Años con elecciones federales en México
ANOS_ELECTORALES = {2012, 2015, 2018, 2021, 2024}


def main():
    log("=== Profundización 2: validación contextual TOP 20 ===\n")

    # ── Cargar datos ───────────────────────────────────────────────────────────
    log("[1] Cargando datasets y outputs previos...")
    contratos = pd.read_parquet(DATA / "comprasmx_contratos.parquet")
    historico = pd.read_parquet(DATA / "comprasmx_historico.parquet")
    efos = pd.read_parquet(DATA / "sat_efos.parquet")
    efos = efos[efos["rfc"] != "XXXXXXXXXXXX"].copy()
    efos["nombre_norm"] = efos["contribuyente"].apply(normaliza_nombre)

    robustos_reciente = pd.read_parquet(OUT / "anomalias_robustas.parquet")
    robustos_hist = pd.read_parquet(OUT / "anomalias_robustas_historico.parquet")
    cluster_prov = pd.read_parquet(OUT / "deep_clusters_proveedores.parquet")
    hhi_inst = pd.read_parquet(OUT / "deep_red_hhi_instituciones.parquet")

    # ── Identificar el TOP 20 ──────────────────────────────────────────────────
    log("\n[2] Construyendo lista TOP 20 a auditar...")
    # Mezcla: 4 con 3 flags reciente + top monto 2 flags reciente + top 5 flags histórico
    top20_ids = []

    # 4 con n_flags=3 reciente
    tier1 = robustos_reciente[robustos_reciente["n_flags"] == 3].copy()
    for _, r in tier1.iterrows():
        top20_ids.append({"fuente": "reciente_3flags", "contrato_id": r["contrato_id"]})
    log(f"  Tier 1 (reciente, 3 flags): {len(tier1)}")

    # 6 con n_flags=2 + top monto reciente
    tier2 = robustos_reciente[robustos_reciente["n_flags"] == 2].sort_values("monto", ascending=False).head(6)
    for _, r in tier2.iterrows():
        top20_ids.append({"fuente": "reciente_top_monto", "contrato_id": r["contrato_id"]})
    log(f"  Tier 2 (reciente, top 6 por monto): {len(tier2)}")

    # 10 con n_flags=5 histórico
    tier3 = robustos_hist[robustos_hist["n_flags"] == 5].sort_values("monto", ascending=False).head(10)
    for _, r in tier3.iterrows():
        top20_ids.append({"fuente": "historico_5flags", "contrato_id": r["contrato_id"]})
    log(f"  Tier 3 (histórico, 5 flags): {len(tier3)}")
    log(f"  TOTAL TOP 20: {len(top20_ids)}")

    # ── Para cada uno, construir dossier ───────────────────────────────────────
    log("\n[3] Construyendo dossier de cada caso...\n")
    dossiers = []

    # Build lookups
    contratos_idx = contratos.set_index("contrato_id")
    historico_idx = historico.set_index("contrato_id")

    for i, entry in enumerate(top20_ids, 1):
        cid = entry["contrato_id"]
        fuente = entry["fuente"]

        # Recuperar contrato
        if cid in contratos_idx.index:
            row = contratos_idx.loc[cid]
            dataset = "reciente"
        elif cid in historico_idx.index:
            row = historico_idx.loc[cid]
            dataset = "historico"
        else:
            log(f"  [{i}/20] Contrato {cid} no encontrado, saltando")
            continue

        # Caso multi-fila (mismo contrato_id en varios datasets), tomar primero
        if isinstance(row, pd.DataFrame):
            row = row.iloc[0]

        proveedor = row.get("proveedor", "")
        proveedor_norm = normaliza_nombre(str(proveedor))
        monto = float(row.get("monto", 0) or 0)
        ano = int(row.get("ano", 0) or 0)
        modalidad = str(row.get("modalidad", "?"))
        modalidad_raw = str(row.get("modalidad_raw", "?"))
        institucion = str(row.get("institucion", "?")) if pd.notna(row.get("institucion")) else None
        ramo = str(row.get("ramo", "?"))
        descripcion = str(row.get("descripcion", ""))
        fecha = str(row.get("fecha_firma", ""))[:10]
        rfc = row.get("rfc_proveedor") if "rfc_proveedor" in row.index else None

        # Trayectoria proveedor (combinar reciente + histórico)
        prov_reciente = contratos[contratos["proveedor"] == proveedor]
        prov_hist = historico[historico["proveedor"] == proveedor]
        n_contratos_total = len(prov_reciente) + len(prov_hist)
        monto_total = float(prov_reciente["monto"].sum() + prov_hist["monto"].sum())
        anos_activos = sorted(set(prov_reciente["ano"].dropna().astype(int).tolist()) | set(prov_hist["ano"].dropna().astype(int).tolist()))
        n_inst_reciente = prov_reciente["institucion"].nunique() if len(prov_reciente) else 0

        # % AD agregado
        all_mod = pd.concat([prov_reciente["modalidad"], prov_hist["modalidad"]]) if (len(prov_reciente) + len(prov_hist)) else pd.Series([], dtype=str)
        pct_ad = float((all_mod == "AD").mean()) if len(all_mod) else 0.0

        # Cluster tipológico (si está en reciente)
        cluster_info = None
        if rfc and pd.notna(rfc):
            cluster_row = cluster_prov[cluster_prov["rfc_proveedor"] == rfc]
            if len(cluster_row):
                cluster_info = cluster_row.iloc[0]["etiqueta_cluster"]

        # ¿Es EFOS?
        es_efos = proveedor_norm in set(efos["nombre_norm"].dropna())
        efos_info = None
        if es_efos:
            efos_match = efos[efos["nombre_norm"] == proveedor_norm].iloc[0]
            efos_info = {
                "estatus": efos_match["estatus"],
                "fecha_presuncion": str(efos_match["fecha_presuncion"])[:10],
                "fecha_publicacion": str(efos_match["fecha_publicacion"])[:10],
            }

        # Contexto político
        es_electoral = ano in ANOS_ELECTORALES
        sex = sexenio(ano)

        # HHI institución
        hhi_inst_match = hhi_inst[hhi_inst["institucion"] == institucion] if institucion else pd.DataFrame()
        hhi_val = float(hhi_inst_match.iloc[0]["hhi"]) if len(hhi_inst_match) else None
        share_top = float(hhi_inst_match.iloc[0]["top_share"]) if len(hhi_inst_match) else None

        # Flags
        flags_info = {}
        if fuente.startswith("reciente"):
            flag_row = robustos_reciente[robustos_reciente["contrato_id"] == cid]
            if len(flag_row):
                for c in ["flag_monto_extremo", "flag_isoforest", "flag_lof", "flag_dbscan_noise", "flag_efos"]:
                    if c in flag_row.columns:
                        flags_info[c] = bool(flag_row.iloc[0][c])
        elif fuente.startswith("historico"):
            flag_row = robustos_hist[robustos_hist["contrato_id"] == cid]
            if len(flag_row):
                for c in flag_row.columns:
                    if c.startswith("flag_"):
                        flags_info[c] = bool(flag_row.iloc[0][c])

        dossier = {
            "rank": i,
            "fuente_tier": fuente,
            "dataset": dataset,
            "contrato_id": cid,
            "ano": ano,
            "sexenio": sex,
            "es_ano_electoral": es_electoral,
            "fecha_firma": fecha,
            "proveedor": proveedor,
            "rfc": str(rfc) if rfc and pd.notna(rfc) else None,
            "institucion": institucion,
            "ramo": ramo,
            "modalidad": modalidad,
            "modalidad_detalle": modalidad_raw,
            "monto_mxn": monto,
            "descripcion": descripcion[:300],
            "trayectoria_proveedor": {
                "n_contratos_total_pp": n_contratos_total,
                "monto_total_pp_mxn": monto_total,
                "anos_activos": anos_activos[:20],  # limit
                "n_anos_activos": len(anos_activos),
                "primer_ano": min(anos_activos) if anos_activos else None,
                "ultimo_ano": max(anos_activos) if anos_activos else None,
                "n_instituciones_cliente_reciente": int(n_inst_reciente),
                "pct_AD_acumulado": round(pct_ad, 3),
                "cluster_tipologico": cluster_info,
            },
            "efos": {
                "es_efos": es_efos,
                "info": efos_info,
            },
            "concentracion_institucion": {
                "hhi": hhi_val,
                "share_top_proveedor": share_top,
            },
            "flags": flags_info,
            "interpretacion": "",  # se llena abajo
        }

        # ── Interpretación heurística ──────────────────────────────────────────
        interp = []
        if monto > 5_000_000_000:
            interp.append(f"Monto extremo ({monto/1e9:.1f} mil M MXN)")
        if modalidad == "AD" and monto > 1_000_000_000:
            interp.append("Adjudicación Directa con monto >1 mil M — alto riesgo procedimental")
        if es_efos:
            interp.append(f"Proveedor en lista EFOS ({efos_info['estatus']})")
        if pct_ad > 0.9:
            interp.append(f"Proveedor con {pct_ad*100:.0f}% AD acumulado — patrón sistemático")
        if n_inst_reciente == 1 and monto > 100_000_000:
            interp.append("Monopolio bilateral: 1 sola institución cliente")
        if hhi_val and hhi_val > 0.5:
            interp.append(f"Institución con HHI={hhi_val:.2f} — concentración alta")
        if es_electoral and modalidad == "AD":
            interp.append(f"Año electoral ({ano}) + AD — patrón temporal sensible")
        if len(anos_activos) <= 2 and monto > 100_000_000:
            interp.append("Proveedor de aparición breve con monto alto — patrón one-shot")
        if cluster_info == "captura":
            interp.append("Cluster tipológico: CAPTURA (100% AD, 1 institución)")
        if cluster_info == "anomalia_jumps":
            interp.append("Cluster tipológico: ANOMALÍA POR JUMPS de monto")
        if "GUARDERIA" in str(proveedor).upper() or "GUARDERÍA" in str(proveedor).upper():
            interp.append("Proveedor de guarderías — vinculado al programa de subrogación IMSS, históricamente problemático")

        dossier["interpretacion"] = " | ".join(interp) if interp else "Sin patrón claro de alto riesgo aparente"

        # Log resumido
        log(f"[{i}/20] {proveedor[:45]:<45} | {monto:>14,.0f} | {modalidad:<4} | {ano}")
        log(f"       institución: {(institucion or '?')[:60]}")
        log(f"       interpretación: {dossier['interpretacion']}")
        log("")

        dossiers.append(dossier)

    # ── Output ─────────────────────────────────────────────────────────────────
    log(f"\n[4] Guardando dossiers ({len(dossiers)} casos)...")

    # JSON detallado
    with open(REPORTS / "14-top20-dossiers.json", "w", encoding="utf-8") as f:
        json.dump({"n_casos": len(dossiers), "dossiers": dossiers}, f, indent=2, default=str, ensure_ascii=False)
    log("  -> ml/reports/14-top20-dossiers.json")

    # Markdown legible
    md = ["# TOP 20 — Validación contextual de contratos robustos\n",
          "Cada caso integra: tier de robustez, contexto político, trayectoria del proveedor,",
          "cruce EFOS, concentración institucional, flags y interpretación heurística.\n",
          f"**Fecha análisis:** 2026-05-27  ",
          f"**Casos auditados:** {len(dossiers)}\n",
          "---\n"]
    for d in dossiers:
        md.append(f"## #{d['rank']} — {d['proveedor']}\n")
        md.append(f"**Tier:** `{d['fuente_tier']}` | **Dataset:** `{d['dataset']}` | **Contrato ID:** `{d['contrato_id']}`\n")
        md.append(f"### Datos del contrato")
        md.append(f"- **Monto:** ${d['monto_mxn']:,.2f} MXN")
        md.append(f"- **Año:** {d['ano']} ({d['sexenio']})" + (" — **AÑO ELECTORAL**" if d['es_ano_electoral'] else ""))
        md.append(f"- **Fecha firma:** {d['fecha_firma']}")
        md.append(f"- **Institución:** {d['institucion']}")
        md.append(f"- **Ramo:** {d['ramo']}")
        md.append(f"- **Modalidad:** `{d['modalidad']}` ({d['modalidad_detalle']})")
        md.append(f"- **Descripción:** {d['descripcion']}\n")

        md.append(f"### Trayectoria del proveedor")
        t = d["trayectoria_proveedor"]
        md.append(f"- Total contratos a lo largo del tiempo: **{t['n_contratos_total_pp']:,}**")
        md.append(f"- Monto acumulado: **${t['monto_total_pp_mxn']:,.0f} MXN**")
        md.append(f"- Años activos: {t['primer_ano']}–{t['ultimo_ano']} ({t['n_anos_activos']} años distintos)")
        md.append(f"- Instituciones cliente (reciente): {t['n_instituciones_cliente_reciente']}")
        md.append(f"- % Adjudicación Directa acumulado: **{t['pct_AD_acumulado']*100:.0f}%**")
        if t["cluster_tipologico"]:
            md.append(f"- Cluster tipológico: `{t['cluster_tipologico']}`")
        md.append("")

        if d["efos"]["es_efos"]:
            md.append(f"### ⚠ EFOS")
            ei = d["efos"]["info"]
            md.append(f"- **Estatus:** {ei['estatus']}")
            md.append(f"- Fecha presunción: {ei['fecha_presuncion']}")
            md.append(f"- Fecha publicación: {ei['fecha_publicacion']}\n")

        c = d["concentracion_institucion"]
        if c["hhi"] is not None:
            md.append(f"### Concentración institución")
            md.append(f"- HHI: **{c['hhi']:.3f}** (1.0=monopolio puro)")
            md.append(f"- Top proveedor concentra: {c['share_top_proveedor']*100:.0f}% del gasto")
            md.append("")

        md.append(f"### Flags detectados")
        flags_on = [k for k, v in d["flags"].items() if v]
        if flags_on:
            for f in flags_on:
                md.append(f"- ✓ `{f}`")
        else:
            md.append("- (ninguno detallado)")
        md.append("")

        md.append(f"### Interpretación")
        md.append(f"> {d['interpretacion']}\n")
        md.append("---\n")

    (REPORTS / "14-top20-dossiers.md").write_text("\n".join(md), encoding="utf-8")
    log("  -> ml/reports/14-top20-dossiers.md")
    log("\n=== PROFUNDIZACIÓN 2 COMPLETA ===")


if __name__ == "__main__":
    main()
