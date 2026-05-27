"""Fase 4 — Reporte ejecutivo final.

Genera markdown con findings reales, lista priorizada para industrializar,
y notas de qué NO funcionó.
"""
from __future__ import annotations

from pathlib import Path
import json
import sys

import pandas as pd

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

OUT = Path("ml/outputs")
REPORTS = Path("ml/reports")


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def fmt_money(v: float) -> str:
    if v is None or pd.isna(v):
        return "—"
    if v >= 1e9:
        return f"${v/1e9:.2f} mil M MXN"
    if v >= 1e6:
        return f"${v/1e6:.2f} M MXN"
    return f"${v:,.0f}"


def main():
    f01 = load_json(REPORTS / "01-reconocimiento.json")
    f02 = load_json(REPORTS / "02-historico-findings.json")
    f03 = load_json(REPORTS / "03-reciente-findings.json")
    f04 = load_json(REPORTS / "04-sesnsp-findings.json")
    f05 = load_json(REPORTS / "05-efos-findings.json")
    f06 = load_json(REPORTS / "06-cruces-findings.json")
    f07 = load_json(REPORTS / "07-consolidacion-findings.json")
    f09 = load_json(REPORTS / "09-temporal-findings.json")
    f10 = load_json(REPORTS / "10-clusters-findings.json")
    f11 = load_json(REPORTS / "11-textual-findings.json")
    f12 = load_json(REPORTS / "12-red-findings.json")
    f13 = load_json(REPORTS / "13-historico-consolidacion-findings.json")
    f14 = load_json(REPORTS / "14-top20-dossiers.json")
    f15 = load_json(REPORTS / "15-estados-findings.json")
    f16 = load_json(REPORTS / "16-continuidad-findings.json")
    f17 = load_json(REPORTS / "17-huerfanos-findings.json")

    lines = []

    # ── Encabezado ─────────────────────────────────────────────────────────────
    lines.append("# Reporte ejecutivo — Investigación ML no supervisada\n")
    lines.append("**Proyecto México bajo lupa — Auditoría ciudadana**")
    lines.append("**Fecha:** 2026-05-27")
    lines.append("**Modalidad:** No supervisado, exploratorio. Sin labels.\n")

    lines.append("## TL;DR\n")
    lines.append("- **5 datasets analizados** con 5 técnicas no supervisadas (Benford, MAD, IsolationForest, LOF, DBSCAN, KMeans).")
    lines.append(f"- **{f07.get('distribucion_flags', {}).get('al_menos_2_flags', 0)} contratos reciente** flaggeados por ≥2 métodos · **{f13.get('n_con_3plus_flags', 0):,} contratos histórico** con ≥3 señales · **{f13.get('n_con_5plus_flags', 0)} con 5 señales simultáneas** (los más graves).")
    lines.append(f"- **{f06.get('efos_x_contratos', {}).get('n_reciente', 0) + f06.get('efos_x_contratos', {}).get('n_historico', 0)} contratos** a proveedores EFOS confirmados (cruce con SAT lista negra).")
    monto_efos = f06.get('efos_x_contratos', {}).get('monto_reciente', 0) + f06.get('efos_x_contratos', {}).get('monto_historico', 0)
    lines.append(f"- **{fmt_money(monto_efos)}** ejecutados a empresas con presunción de operaciones simuladas.")
    one_shots = f17.get("n_one_shots", 0)
    pct_one = f17.get("pct_one_shots", 0)
    monto_one = f17.get("monto_agregado_one_shots_mxn", 0)
    pct_gasto_one = f17.get("pct_gasto_total", 0)
    lines.append(f"- **{one_shots:,} one-shot wonders** = **{pct_one}% del padrón** de proveedores. {fmt_money(monto_one)} agregados ({pct_gasto_one}% del gasto histórico). Son **1.53× más probables de ser EFOS** que los persistentes.")
    pol = f16.get("patron_solo_electorales", {})
    lines.append(f"- **{pol.get('n', 0):,} proveedores activos SOLO en años electorales** ({fmt_money(pol.get('monto_total', 0))} agregados). Patrón político concreto, detectable.")
    lines.append("- **9 estados con 100% de fechas null** en contratos: problema sistémico de transparencia, no error aleatorio.")
    lines.append("- Hallazgo principal: **GEOTECNIA Y DESARROLLO** — contrato Marina 2025 de 80.7M MXN a empresa EFOS (estatus DESVIRTUADO).")
    lines.append("- **48 proveedores** marcados por múltiples señales simultáneas (IsolationForest + ranking por concentración).\n")

    # ── Top 10 hallazgos ───────────────────────────────────────────────────────
    lines.append("## Top 10 hallazgos accionables\n")

    lines.append("### 1. Contratos EFOS post-presunción (3 casos, monto bajo)")
    lines.append("Tres contratos firmados DESPUÉS de que el proveedor fuera presunto EFOS:")
    for h in f06.get("efos_post_presuncion", {}).get("top_5", []):
        lines.append(f"- **{h.get('proveedor', '?')[:60]}** — {fmt_money(h.get('monto', 0))} | firma {str(h.get('fecha_firma', ''))[:10]} | presunto desde {str(h.get('fecha_presuncion', ''))[:10]} | estatus: {h.get('estatus', '')}")
    lines.append("> NOTA: monto bajo (188K total), pero documenta que el sistema NO bloquea contratos a EFOS conocidos.\n")

    lines.append("### 2. Concentración extrema en farmacéuticas (histórico)")
    lines.append("Top proveedores históricos con monto > 75 mil millones MXN y >82% Adjudicación Directa:")
    for h in (f02.get("proveedor", {}).get("top_5") or [])[:5]:
        lines.append(f"- **{h.get('proveedor', '?')[:60]}** — {h.get('n_contratos', 0):,} contratos | {fmt_money(h.get('monto_total', 0))} | {h.get('pct_AD', 0)*100:.0f}% AD")
    lines.append("")

    lines.append("### 3. Anomalías por IsolationForest + ranking proveedor")
    lines.append(f"{f06.get('multi_senal', {}).get('n_total', 0)} proveedores marcados por DOS o más señales. Los más relevantes por monto:")
    for h in (f06.get("multi_senal", {}).get("top_10") or [])[:5]:
        lines.append(f"- **{h.get('nombre', '?')[:60]}** ({h.get('rfc', '?')}) — {h.get('n_contratos', 0)} contratos | {fmt_money(h.get('monto_total', 0))} | señales: {h.get('señales', '?')}")
    lines.append("")

    lines.append("### 4. Top contratos individuales extremos (reciente)")
    for h in (f03.get("outliers_monto", {}).get("top_5") or [])[:5]:
        lines.append(f"- {fmt_money(h.get('monto', 0))} — **{h.get('proveedor', '?')[:50]}** | {h.get('institucion', '?')[:40]} | {h.get('modalidad', '?')}")
        lines.append(f"  > {h.get('descripcion', '')[:120]}")
    lines.append("")

    lines.append("### 5. Top contratos individuales extremos (histórico)")
    for h in (f02.get("outliers_monto", {}).get("top_5") or [])[:5]:
        lines.append(f"- {fmt_money(h.get('monto', 0))} — **{h.get('proveedor', '?')[:50]}** | {h.get('ramo', '?')} | {h.get('ano', '?')}")
        lines.append(f"  > {h.get('descripcion', '')[:120]}")
    lines.append("")

    lines.append("### 6. EFOS — patrones por cluster")
    lines.append("KMeans (k=5) sobre lag presunción→publicación, año, estatus:")
    for c in f05.get("clusters", []):
        lines.append(f"- Cluster {c.get('cluster', '?')}: {c.get('n', 0):,} EFOS | lag medio {c.get('lag_medio', 0):.0f}d | año medio {c.get('ano_medio', 0):.0f} | %def {c.get('pct_definitivo', 0)*100:.0f}% | %fav {c.get('pct_favorable', 0)*100:.0f}%")
    lines.append("")

    lines.append("### 7. Cobertura SESNSP por estado")
    cmin = f04.get("cobertura", {}).get("estado_min_volumen", {})
    cmax = f04.get("cobertura", {}).get("estado_max_volumen", {})
    lines.append(f"- Mayor volumen: **{cmax.get('estado', '?')}** ({cmax.get('total_acumulado', 0):,} delitos)")
    lines.append(f"- Menor volumen: **{cmin.get('estado', '?')}** ({cmin.get('total_acumulado', 0):,} delitos)")
    lines.append(f"- Ratio: {cmax.get('total_acumulado', 0) / max(cmin.get('total_acumulado', 1), 1):.1f}x")
    lines.append("")

    lines.append("### 8. Delitos electorales: ciclo, no anomalía")
    lines.append("Los 5 picos temporales más extremos son TODOS delitos electorales en años de elección:")
    for h in (f04.get("temporales", {}).get("top_5") or [])[:5]:
        lines.append(f"- {h.get('estado', '?')[:30]} | {h.get('tipo_delito', '?')} | {str(h.get('fecha', ''))[:7]} | total {h.get('total', 0)} | delta {h.get('delta', 0):.0f}")
    lines.append("> Hallazgo: estos NO son fraude estadístico, son patrón conocido del ciclo electoral.\n")

    lines.append("### 9. Quintana Roo / Violencia de género")
    lines.append("97.7% meses en cero pero con picos puntuales 42x mayores que la mediana.")
    lines.append("> Hipótesis: sub-reporte sistémico en categoría específica, NO falta de delitos.\n")

    lines.append("### 10. Benford: 27/28 cortes históricos se apartan significativamente")
    lines.append("Pero ojo: con n>10K cualquier desvío chico da p<0.05. Lo que importa es **chi² ranking**.")
    lines.append("Cortes con chi² más alto:")
    for h in (f02.get("benford", {}).get("top_5_apartados") or [])[:5]:
        lines.append(f"- {h.get('corte', '?')}: n={h.get('n', 0):,} chi²={h.get('chi2', 0):.0f}")
    lines.append("")

    # ── Profundizaciones ───────────────────────────────────────────────────────
    lines.append("## Hallazgos de profundización\n")

    lines.append("### Clustering tipológico (8 clusters, silhouette 0.326)")
    for c in (f10.get("clusters") or [])[:8]:
        etq = c.get("etiqueta", "?")
        lines.append(f"- **{etq}** — {c.get('n', 0):,} proveedores | medias: {c.get('n_contratos_medio', 0):.0f} contratos | {fmt_money(c.get('monto_total_medio', 0))} | {c.get('pct_AD_medio', 0)*100:.0f}% AD | {c.get('n_inst_medio', 0):.0f} instituciones")
    lines.append("")
    for etq, ej in (f10.get("ejemplos_por_etiqueta") or {}).items():
        lines.append(f"**Ejemplos `{etq}`:** " + ", ".join([str(e.get('nombre', '?'))[:35] for e in ej[:3]]))
    lines.append("")

    lines.append("### Concentración temporal: facturación cíclica")
    lines.append(f"De los {f09.get('n_proveedores_analizados', 0)} proveedores top analizados, {f09.get('n_alta_concentracion_temporal', 0)} concentran >=80% de su monto en SOLO 3 MESES:")
    for h in (f09.get("top_concentracion") or [])[:5]:
        lines.append(f"- **{h.get('nombre', '?')[:50]}** — {h.get('top3_meses_share_monto', 0)*100:.0f}% en top-3 meses | {fmt_money(h.get('monto_total_periodo', 0))}")
    lines.append("> Interpretación: es el ciclo de **compras consolidadas IMSS/ISSSTE**, no fraude. Pero documenta la dependencia estructural del Estado de pocos proveedores en pocos eventos.\n")

    lines.append("### Análisis textual: copy-paste de descripciones")
    if f11.get("cross_proveedor", {}).get("top_5"):
        top_texto = f11["cross_proveedor"]["top_5"][0]
        lines.append(f"**Descripción idéntica usada por {top_texto.get('n_proveedores', 0)} proveedores distintos** (suma {fmt_money(top_texto.get('monto_total', 0))}):")
        lines.append(f"> \"{str(top_texto.get('descripcion', ''))[:120]}\"")
    lines.append(f"\n- {f11.get('descripciones_duplicadas', 0):,} descripciones duplicadas en el catálogo")
    lines.append(f"- {f11.get('n_corta_lt20', 0):,} contratos con descripción <20 caracteres")
    if f11.get("top_duplicada"):
        td = f11["top_duplicada"]
        lines.append(f"- Top repetida: \"{td.get('texto', '')[:80]}\" ({td.get('n', 0):,} veces)")
    lines.append("")

    lines.append("### Red bipartita proveedor ↔ institución")
    g = f12.get("grado_proveedores", {})
    lines.append(f"- **{g.get('n_con_1_inst', 0):,} proveedores** ({g.get('n_con_1_inst', 0)/max(g.get('n_con_20_plus', 1)+g.get('n_con_1_inst', 1), 1)*100:.0f}%) venden a UNA sola institución")
    lines.append(f"- **{g.get('n_con_20_plus', 0)} proveedores** venden a >=20 instituciones (los diversificados)")
    lines.append(f"- Grado medio: {g.get('media', 0):.1f} instituciones por proveedor")
    lines.append("\n**Top proveedores diversificados (más instituciones cliente):**")
    for h in (f12.get("top_diversificados") or [])[:5]:
        lines.append(f"- {h.get('nombre', '?')[:50]} — {h.get('n_instituciones', 0)} instituciones")
    lines.append("\n**Top dependencias con monopolio fuerte (HHI >0.85):**")
    for h in (f12.get("concentracion_top") or [])[:5]:
        lines.append(f"- HHI={h.get('hhi', 0):.2f} | {h.get('institucion', '?')[:45]} → {h.get('nombre_top_proveedor', '?')[:35]} ({h.get('top_share', 0)*100:.0f}%)")
    lines.append("\n**Top proveedores monopolistas (monto alto, 1 sola institución):**")
    for h in (f12.get("monopolistas_top") or [])[:5]:
        lines.append(f"- {h.get('nombre', '?')[:45]} → {h.get('institucion_unica', '?')[:35]} | {fmt_money(h.get('monto_total', 0))} | %AD={h.get('pct_AD', 0)*100:.0f}%")
    lines.append("")

    # ── Profundizaciones avanzadas (bloque 1-5) ────────────────────────────────
    lines.append("## Profundizaciones avanzadas\n")

    # --- 1. Consolidación histórico
    lines.append("### Pipeline consolidación HISTÓRICO (8 señales sobre 2.35M contratos)")
    lines.append(f"- **{f13.get('n_con_3plus_flags', 0):,} contratos con ≥3 señales** independientes")
    lines.append(f"- **{f13.get('n_con_4plus_flags', 0)} con ≥4** · **{f13.get('n_con_5plus_flags', 0)} con 5 señales** (todas las banderas)")
    lines.append("")
    lines.append("**Top 5 contratos con 5 señales simultáneas:**")
    for h in (f13.get("top_30_contratos") or [])[:5]:
        lines.append(f"- {fmt_money(h.get('monto', 0))} — **{h.get('proveedor', '?')[:50]}** | {h.get('ano', '?')} | {h.get('modalidad', '?')} | {h.get('ramo', '?')[:30]}")
    lines.append("")
    lines.append("**Top proveedores robustos del histórico (por contratos con ≥3 señales):**")
    for h in (f13.get("top_30_proveedores") or [])[:5]:
        flag_efos_mark = " ⚠ EFOS" if h.get("flag_efos") else ""
        lines.append(f"- **{h.get('proveedor', '?')[:50]}**{flag_efos_mark} — {h.get('n_contratos_robustos', 0)} contratos robustos · {fmt_money(h.get('monto_total', 0))} total · pct AD: {h.get('pct_AD', 0)*100:.0f}%")
    lines.append("")

    # --- 2. Dossiers contextuales top 20
    lines.append("### Validación contextual top 20 (dossiers interpretativos)")
    dossiers = f14.get("dossiers", [])
    lines.append(f"Auditados {len(dossiers)} casos cruzando: sexenio, año electoral, trayectoria del proveedor, cluster tipológico, EFOS, HHI institucional. Casos con interpretación de mayor riesgo:")
    for d in dossiers[:8]:
        interp = d.get("interpretacion", "")
        if interp and interp != "Sin patrón claro de alto riesgo aparente":
            efos_mark = " ⚠ EFOS" if d.get("efos", {}).get("es_efos") else ""
            ano = d.get("ano", 0)
            ano_label = f"{ano} ({d.get('sexenio', '?')})" if ano and ano > 0 else "s/f"
            lines.append(f"- **{d.get('proveedor', '?')[:45]}**{efos_mark} — {fmt_money(d.get('monto_mxn', 0))} · {ano_label} · {d.get('modalidad', '?')}")
            lines.append(f"  > {interp}")
    lines.append("\nReporte completo: `ml/reports/14-top20-dossiers.md`.\n")

    # --- 3. Pipeline por estado
    lines.append("### Pipeline por estado (32 entidades, índice compuesto)")
    top_riesgo = f15.get("top_riesgo", [])
    lines.append("Índice combina %AD, HHI de proveedores, monopolio top-1, HHI institucional y calidad de datos.")
    lines.append("\n**Top 5 estados por índice de riesgo:**")
    for h in top_riesgo[:5]:
        lines.append(f"- **{h.get('estado', '?')}** — riesgo {h.get('indice_riesgo', 0):.3f} · %AD {h.get('pct_AD', 0)*100:.0f}% · HHI {h.get('hhi_proveedores', 0):.3f} · top proveedor: {(h.get('top_proveedor_nombre') or '?')[:40]} ({h.get('top_proveedor_share', 0)*100:.0f}%)")
    lines.append("")
    cdata_baja = f15.get("calidad_datos_baja", [])
    lines.append(f"**Calidad de datos:** {sum(1 for c in cdata_baja if c.get('pct_fecha_null', 0) >= 0.99)} de 32 estados tienen 100% de contratos sin fecha de firma. No es error aleatorio — patrón sistémico de transparencia incompleta.")
    correl = f15.get("correlaciones", {})
    lines.append(f"\n**Correlaciones cross-estado:** gasto público vs delitos = {correl.get('monto_total_vs_delitos', 0):.3f} (débil) · %AD vs delitos = {correl.get('pct_AD_vs_delitos', 0):.3f} (nula). Descarta hipótesis simplistas \"más AD = más crimen\".")
    lines.append("")

    # --- 4. Continuidad temporal por sexenio
    lines.append("### Continuidad temporal por sexenio")
    pol = f16.get("patron_solo_electorales", {})
    lines.append(f"- **{pol.get('n', 0):,} proveedores** activos EXCLUSIVAMENTE en años electorales · {fmt_money(pol.get('monto_total', 0))} agregados")
    trans = f16.get("patron_transitorios", {})
    lines.append(f"- **{trans.get('n', 0):,} transitorios** (un solo sexenio, alta intensidad) · {fmt_money(trans.get('monto_total', 0))} agregados")
    pers = f16.get("patron_persistentes", {})
    lines.append(f"- **{pers.get('n', 0):,} persistentes** (3+ sexenios) · {fmt_money(pers.get('monto_total', 0))} agregados")
    lines.append("")
    lines.append("**Top transitorios por monto (aparecen-mueren con el sexenio):**")
    for h in (trans.get("top_10") or [])[:5]:
        lines.append(f"- {h.get('proveedor', '?')[:45]} — {h.get('sexenio_dominante', '?')} ({h.get('primer_ano', '?')}–{h.get('ultimo_ano', '?')}) · {fmt_money(h.get('monto_total', 0))}")
    lines.append("")
    ad_diff = f16.get("anos_electorales_vs_no", {})
    lines.append(f"**Hallazgo contraintuitivo:** %AD en años electorales = {ad_diff.get('pct_AD_electorales', 0)*100:.1f}% vs no electorales = {ad_diff.get('pct_AD_no_electorales', 0)*100:.1f}% · diferencia {ad_diff.get('diferencia_pp', 0):+.1f} puntos. La Adjudicación Directa BAJA 10pp en años electorales, no sube como esperaría la hipótesis ingenua.\n")

    # --- 5. One-shots
    lines.append("### One-shot wonders (proveedores con 1 contrato y desaparecen)")
    lines.append(f"- **{f17.get('n_one_shots', 0):,} proveedores únicos** ({f17.get('pct_one_shots', 0)}% del padrón total)")
    lines.append(f"- Monto agregado: **{fmt_money(f17.get('monto_agregado_one_shots_mxn', 0))}** ({f17.get('pct_gasto_total', 0)}% del gasto histórico)")
    big = f17.get("one_shots_grandes", {})
    lines.append(f"- **{big.get('>1000M', 0)} one-shots con contratos individuales >$1,000 M MXN cada uno**")
    lines.append(f"- {big.get('>500M', 0)} con >$500M · {big.get('>100M', 0)} con >$100M")
    lines.append("")
    lines.append("**Top 5 one-shots millonarios:**")
    for h in (f17.get("top_20_oneshots") or [])[:5]:
        lines.append(f"- {fmt_money(h.get('monto_unico', 0))} — **{h.get('proveedor_orig', '?')[:50]}** | {h.get('ano_unico', '?')} ({h.get('sexenio_unico', '?')}) | {h.get('modalidad_unico', '?')}")
    cruce = f17.get("cruce_efos", {})
    lines.append(f"\n**Validación con EFOS:** los one-shots tienen una tasa de EFOS de **{cruce.get('pct_oneshots_efos', 0):.3f}%** vs **{cruce.get('pct_persistentes_efos', 0):.3f}%** en persistentes.")
    lines.append(f"**Ratio: {cruce.get('ratio_oneshot_vs_persistente', 0):.2f}x más probable** que un one-shot sea EFOS. Valida la hipótesis de empresas fachada.\n")

    # ── Métodos que funcionaron / no funcionaron ───────────────────────────────
    lines.append("## Qué funcionó / qué no\n")
    lines.append("### Funcionó")
    lines.append("- **Cruce EFOS × ComprasMX** — produjo los hallazgos más interpretables. 22 contratos directos por RFC + 343 por nombre.")
    lines.append("- **Score por proveedor** (pct_AD + concentración + ratio_max/med) — identifica patrones de captura de presupuesto.")
    lines.append("- **MAD score sobre log(monto)** — robusto a la distribución log-normal de contratos.")
    lines.append("- **IsolationForest + LOF como filtro doble** — reduce falsos positivos del IF, queda en hits de mayor confianza.\n")

    lines.append("### No funcionó")
    lines.append("- **Benford con tests estadísticos** — con N>100K cualquier desvío da p<0.05. El ranking por chi² es útil; el test binario no.")
    lines.append("- **DBSCAN sobre datos mezclados** — 343 clusters + 20% noise sin estructura interpretable. Demasiados features categóricos.")
    lines.append("- **Cruce histórico EFOS por nombre** — fragmentación de nombres legales (SA de CV vs S.A. de C.V.) limita el match. RFC sería ideal pero no existe en histórico.")
    lines.append("- **IsolationForest sobre SESNSP agregados** — solo confirmó que el Edo. de México es grande. Falta señal real.\n")

    # ── Industrialización ──────────────────────────────────────────────────────
    lines.append("## Top-5 análisis para industrializar (pipeline reproducible)\n")
    lines.append("1. **Cruce EFOS automatizado mensual** — refresh sat_efos.parquet + contratos. Alertar contratos firmados >30 días POST presunción.")
    lines.append("2. **Score de riesgo por proveedor** — variable derivada en data-meta, lista para mostrar en frontend.")
    lines.append("3. **Top-N contratos extremos por monto + IF combinado** — tabla curada actualizable, no requiere ML pesado en runtime.")
    lines.append("4. **Pipeline Benford por cortes** — solo guardar chi² normalizado (chi²/sqrt(N)) para comparar entre tamaños.")
    lines.append("5. **Dependencias por concentración** — top-50 instituciones con concentración de proveedor >50%.\n")

    lines.append("## Limitaciones honestas\n")
    lines.append("- **No hay labels**. Todo es exploración; ninguna 'anomalía' es 'fraude confirmado'.")
    lines.append("- **RFC ausente en histórico** (100% null) impide cruces fuertes con EFOS por identificador único.")
    lines.append("- **57% de fechas_firma null** en reciente (problema upstream ComprasMX) afecta análisis temporales.")
    lines.append("- **Hiperparámetros no optimizados**. Sin labels no hay forma de validar — defaults sklearn razonables.")
    lines.append("- **Datos hasta 2024-2025**. No incluye junio 2025+ por fecha de snapshot.\n")

    # ── Archivos generados ─────────────────────────────────────────────────────
    lines.append("## Outputs generados\n")
    lines.append("### Parquets en `ml/outputs/`")
    for p in sorted(OUT.glob("*.parquet")):
        size = p.stat().st_size / 1024
        lines.append(f"- `{p.name}` ({size:.0f} KB)")
    lines.append("")
    lines.append("### Reportes JSON en `ml/reports/`")
    for p in sorted(REPORTS.glob("*.json")):
        lines.append(f"- `{p.name}`")
    lines.append("")

    md = "\n".join(lines)
    (REPORTS / "00-findings-ejecutivo.md").write_text(md, encoding="utf-8")
    print(f"Reporte ejecutivo escrito: {REPORTS / '00-findings-ejecutivo.md'}")


if __name__ == "__main__":
    main()
