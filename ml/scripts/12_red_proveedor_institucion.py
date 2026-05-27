"""Profundización: red bipartita proveedor ↔ institución.

Grafo bipartito ponderado por monto. Métricas:
- Grado (a cuántas instituciones le vende cada proveedor)
- Centralidad (qué proveedores conectan más nodos)
- Concentración por institución (HHI)
- Identificar dependencias con pocos proveedores que mueven mucho monto
"""
from __future__ import annotations

from pathlib import Path
import json
import sys

import numpy as np
import pandas as pd
import networkx as nx

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

DATA = Path("data/processed")
OUT = Path("ml/outputs")
REPORTS = Path("ml/reports")


def log(msg): print(msg, flush=True)


def hhi(shares: np.ndarray) -> float:
    """Herfindahl-Hirschman Index: sum of squared shares. 1=monopolio, 1/N=competencia."""
    return float(np.sum(shares ** 2))


def main():
    log("=== Profundización: red bipartita proveedor ↔ institución ===\n")
    contratos = pd.read_parquet(DATA / "comprasmx_contratos.parquet")
    log(f"contratos: {len(contratos):,}")

    # Edges ponderadas
    edges = contratos.groupby(["rfc_proveedor", "institucion"]).agg(
        monto=("monto", "sum"),
        n_contratos=("contrato_id", "count"),
    ).reset_index()
    log(f"Edges (rfc, institucion): {len(edges):,}")

    # Nombres
    name_map = contratos.groupby("rfc_proveedor")["proveedor"].first().to_dict()

    # Construir grafo bipartito
    G = nx.Graph()
    for _, e in edges.iterrows():
        G.add_node(f"P:{e['rfc_proveedor']}", bipartite=0, type="proveedor", nombre=name_map.get(e["rfc_proveedor"], ""))
        G.add_node(f"I:{e['institucion']}", bipartite=1, type="institucion")
        G.add_edge(f"P:{e['rfc_proveedor']}", f"I:{e['institucion']}", weight=e["monto"], n=e["n_contratos"])

    log(f"Nodos: {G.number_of_nodes():,} | Edges: {G.number_of_edges():,}")

    # ── 1. Grado por proveedor (a cuántas instituciones venden) ────────────────
    log("\n[1] Distribución de grado por proveedor...")
    prov_nodes = [n for n, d in G.nodes(data=True) if d.get("type") == "proveedor"]
    grados_prov = {n: G.degree(n) for n in prov_nodes}
    grados_arr = np.array(list(grados_prov.values()))
    log(f"  Grado medio: {grados_arr.mean():.1f} | mediana: {np.median(grados_arr):.0f} | max: {grados_arr.max()}")
    log(f"  Proveedores con >=20 instituciones: {(grados_arr >= 20).sum()}")
    log(f"  Proveedores con 1 sola institución: {(grados_arr == 1).sum()}")

    # Top proveedores por número de instituciones
    top_grados = sorted(grados_prov.items(), key=lambda x: -x[1])[:20]
    log("\n  Top proveedores por número de instituciones cliente:")
    for n, g in top_grados[:10]:
        rfc = n.replace("P:", "")
        log(f"    {name_map.get(rfc, '')[:50]:<50} | {g} instituciones")

    # ── 2. HHI por institución (concentración de gasto) ────────────────────────
    log("\n[2] Concentración por institución (HHI)...")
    inst_concentracion = []
    for inst, grp in contratos.groupby("institucion"):
        monto_total = grp["monto"].sum()
        if monto_total <= 0 or len(grp) < 5:
            continue
        prov_shares = grp.groupby("rfc_proveedor")["monto"].sum() / monto_total
        h = hhi(prov_shares.values)
        inst_concentracion.append({
            "institucion": inst,
            "monto_total": float(monto_total),
            "n_contratos": int(len(grp)),
            "n_proveedores": int(grp["rfc_proveedor"].nunique()),
            "hhi": h,
            "top_proveedor": prov_shares.idxmax(),
            "top_share": float(prov_shares.max()),
        })
    conc_df = pd.DataFrame(inst_concentracion).sort_values("hhi", ascending=False)
    conc_df["nombre_top_proveedor"] = conc_df["top_proveedor"].map(name_map)
    conc_df.to_parquet(OUT / "deep_red_hhi_instituciones.parquet", index=False)
    log(f"  Instituciones evaluadas: {len(conc_df)}")
    log(f"\n  Top 5 dependencias con más concentración (HHI >0.5 = oligopolio fuerte):")
    for _, r in conc_df.head(10).iterrows():
        log(f"    HHI={r['hhi']:.2f} | top {r['top_share']*100:.0f}% | {r['institucion'][:50]:<50} | top: {r['nombre_top_proveedor'][:40]}")

    # ── 3. Proveedores "puente" (alta centralidad de intermediación) ───────────
    log("\n[3] Centralidad de intermediación (betweenness)...")
    # Es caro en el grafo completo. Usamos solo la componente más grande sobre top
    # Subgrafo: proveedores >=10 contratos × instituciones >=10 contratos
    top_rfcs = contratos["rfc_proveedor"].value_counts().head(500).index
    top_insts = contratos["institucion"].value_counts().head(100).index
    sub_edges = edges[edges["rfc_proveedor"].isin(top_rfcs) & edges["institucion"].isin(top_insts)]
    Gsub = nx.Graph()
    for _, e in sub_edges.iterrows():
        Gsub.add_edge(f"P:{e['rfc_proveedor']}", f"I:{e['institucion']}", weight=e["monto"])
    log(f"  Sub-grafo: {Gsub.number_of_nodes()} nodos, {Gsub.number_of_edges()} edges")
    bw = nx.betweenness_centrality(Gsub)
    bw_prov = {n: v for n, v in bw.items() if n.startswith("P:")}
    top_bw = sorted(bw_prov.items(), key=lambda x: -x[1])[:15]
    log("\n  Top 10 proveedores con mayor betweenness (intermediarios):")
    for n, v in top_bw[:10]:
        rfc = n.replace("P:", "")
        log(f"    {v:.4f} | {name_map.get(rfc, '')[:55]}")

    # ── 4. Proveedores monopolistas (1 sola institución, alto monto) ───────────
    log("\n[4] Proveedores monopolistas (>=10M MXN, una sola institución)...")
    mono = []
    for rfc, grp in contratos.groupby("rfc_proveedor"):
        if grp["institucion"].nunique() == 1 and grp["monto"].sum() >= 10_000_000:
            mono.append({
                "rfc": rfc,
                "nombre": grp["proveedor"].iloc[0],
                "n_contratos": int(len(grp)),
                "monto_total": float(grp["monto"].sum()),
                "institucion_unica": grp["institucion"].iloc[0],
                "pct_AD": float((grp["modalidad"] == "AD").mean()),
            })
    mono_df = pd.DataFrame(mono).sort_values("monto_total", ascending=False)
    mono_df.head(100).to_parquet(OUT / "deep_red_proveedores_monopolistas.parquet", index=False)
    log(f"  Proveedores monopolistas (>=10M, 1 institución): {len(mono_df):,}")
    log(f"\n  Top 5:")
    for _, r in mono_df.head(5).iterrows():
        log(f"    {r['nombre'][:50]:<50} | {r['monto_total']:>15,.0f} | {r['institucion_unica'][:35]:<35} | %AD={r['pct_AD']*100:.0f}%")

    findings = {
        "grafo": {"n_nodos": int(G.number_of_nodes()), "n_edges": int(G.number_of_edges())},
        "grado_proveedores": {
            "media": float(grados_arr.mean()),
            "mediana": float(np.median(grados_arr)),
            "max": int(grados_arr.max()),
            "n_con_1_inst": int((grados_arr == 1).sum()),
            "n_con_20_plus": int((grados_arr >= 20).sum()),
        },
        "top_diversificados": [
            {"rfc": n.replace("P:", ""), "nombre": name_map.get(n.replace("P:", ""), ""), "n_instituciones": g}
            for n, g in top_grados[:10]
        ],
        "concentracion_top": conc_df.head(15).to_dict("records"),
        "intermediarios_top": [
            {"rfc": n.replace("P:", ""), "nombre": name_map.get(n.replace("P:", ""), ""), "betweenness": v}
            for n, v in top_bw[:15]
        ],
        "monopolistas_top": mono_df.head(15).to_dict("records"),
    }
    with open(REPORTS / "12-red-findings.json", "w", encoding="utf-8") as f:
        json.dump(findings, f, indent=2, default=str)
    log("\nListo.")


if __name__ == "__main__":
    main()
