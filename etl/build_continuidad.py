"""Continuidad histórica → moderno.

Cruza los Top 50 proveedores históricos de CompraNet 2010-2022 (sin RFC)
contra el universo moderno ComprasMX 2024-2025 (con RFC) usando fuzzy
matching de nombres normalizados.

Reads:
  data/processed/historico_proveedores_top.parquet
  data/processed/comprasmx_contratos.parquet

Writes:
  data/processed/continuidad.parquet
  web/src/data/continuidad.json    (top 30 más relevantes)

Output schema (parquet):
  proveedor_historico       str
  proveedor_moderno_match   str | None
  rfc_proveedor_moderno     str | None
  contratos_historico       int
  monto_historico_mxn       float
  contratos_moderno         int
  monto_moderno_mxn         float
  ad_pct_historico          float
  ad_pct_moderno            float
  estatus                   str  ("CONTINÚA" | "PAUSADO")
  match_confidence          str  ("EXACTO" | "FUZZY" | "NULO")
  match_score               float | None  (0..100, sólo FUZZY)

Estrategia de matching:
1. Normalización agresiva (uppercase, sin acentos, sin puntuación,
   sin sufijos legales SA/SC/SRL/CV/SAPI/etc.).
2. Match exacto sobre el nombre normalizado.
3. Si no hay match exacto, rapidfuzz token_set_ratio con umbral ≥ 90.
4. Si rapidfuzz no está, fallback a substring containment sobre normalizado.

Ejecutar:
  python etl/build_continuidad.py
"""

from __future__ import annotations

import json
import math
import re
import sys
import unicodedata
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATA_PROCESSED, setup_logging

log = setup_logging("continuidad")

WEB_DATA = Path(__file__).resolve().parent.parent / "web" / "src" / "data"
WEB_DATA.mkdir(parents=True, exist_ok=True)

# Sufijos legales mexicanos comunes — los pelamos para que el fuzzy se
# concentre en la "raíz" del nombre comercial.
LEGAL_SUFFIXES = [
    "SOCIEDAD ANONIMA DE CAPITAL VARIABLE",
    "SOCIEDAD ANONIMA PROMOTORA DE INVERSION",
    "SOCIEDAD ANONIMA",
    "SOCIEDAD CIVIL",
    "SOCIEDAD DE RESPONSABILIDAD LIMITADA",
    "SOCIEDAD COOPERATIVA",
    "SAPI DE CV",
    "S A P I DE CV",
    "SAPI",
    "S A P I",
    "SOFOM ENR",
    "SOFOM",
    "S DE RL DE CV",
    "S DE R L DE C V",
    "S DE RL",
    "S DE R L",
    "SA DE CV",
    "S A DE C V",
    "SA",
    "S A",
    "DE CV",
    "DE C V",
    "S C",
    "SC",
    "SRL",
    "S R L",
    "CV",
    "C V",
]
# Orden largo→corto evita que "SA" se coma antes de probar "SA DE CV".
LEGAL_SUFFIXES.sort(key=len, reverse=True)

_NON_ALNUM = re.compile(r"[^A-Z0-9 ]+")
_MULTISPACE = re.compile(r"\s+")


def strip_accents(s: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c)
    )


def normalize_name(raw: str | None) -> str:
    """Normalización agresiva para match.

    UPPERCASE → sin acentos → reemplazar puntuación por espacio →
    quitar sufijos legales repetidamente → colapsar espacios.
    """
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return ""
    s = strip_accents(str(raw)).upper()
    # Reemplazar comas, puntos, guiones por espacio. Conserva &/letras/dígitos.
    s = _NON_ALNUM.sub(" ", s)
    s = _MULTISPACE.sub(" ", s).strip()
    # Pelar sufijos legales (potencialmente varias veces, p. ej. "SA DE CV CV").
    changed = True
    while changed:
        changed = False
        for suf in LEGAL_SUFFIXES:
            # match al final, precedido por espacio o inicio
            if s.endswith(" " + suf) or s == suf:
                s = s[: -len(suf)].strip()
                changed = True
            # también si el sufijo aparece "incrustado" al final tras espacio
            elif s.endswith(suf) and len(s) > len(suf) and s[-len(suf) - 1] == " ":
                s = s[: -len(suf)].strip()
                changed = True
    s = _MULTISPACE.sub(" ", s).strip()
    return s


def _try_rapidfuzz():
    try:
        from rapidfuzz import fuzz, process
        return fuzz, process
    except ImportError:
        return None, None


def find_match(
    needle_norm: str,
    haystack_norm: list[str],
    threshold: int = 90,
):
    """Devuelve (idx, score, kind) o (None, None, "NULO").

    kind: "EXACTO" | "FUZZY" | "NULO"
    """
    if not needle_norm:
        return None, None, "NULO"

    # Match exacto
    for i, h in enumerate(haystack_norm):
        if h == needle_norm:
            return i, 100.0, "EXACTO"

    fuzz, process = _try_rapidfuzz()
    if process is not None:
        # token_set_ratio es resistente a orden de palabras y duplicados
        result = process.extractOne(
            needle_norm,
            haystack_norm,
            scorer=fuzz.token_set_ratio,
            score_cutoff=threshold,
        )
        if result is not None:
            match_str, score, idx = result
            return idx, float(score), "FUZZY"
        return None, None, "NULO"

    # Fallback substring si rapidfuzz no está disponible
    for i, h in enumerate(haystack_norm):
        if needle_norm in h or h in needle_norm:
            # estimación grosera de similitud
            ratio = (
                100.0
                * min(len(needle_norm), len(h))
                / max(len(needle_norm), len(h))
            )
            if ratio >= threshold:
                return i, ratio, "FUZZY"
    return None, None, "NULO"


def _clean_float(v) -> float | None:
    if v is None or pd.isna(v):
        return None
    f = float(v)
    if math.isnan(f) or math.isinf(f):
        return None
    return f


def main() -> None:
    src_top = DATA_PROCESSED / "historico_proveedores_top.parquet"
    src_mod = DATA_PROCESSED / "comprasmx_contratos.parquet"
    if not src_top.exists():
        raise SystemExit(
            f"Falta {src_top}. Corre etl/build_historico_metrics.py primero."
        )
    if not src_mod.exists():
        raise SystemExit(f"Falta {src_mod}. Corre etl/comprasmx.py primero.")

    log.info("Cargando top 50 históricos…")
    top = pd.read_parquet(src_top)
    log.info("Top históricos: %d filas", len(top))

    log.info("Cargando ComprasMX moderno…")
    mod = pd.read_parquet(src_mod)
    log.info("Moderno: %d filas (años %s-%s)",
             len(mod), int(mod["ano"].min()), int(mod["ano"].max()))

    # Universo moderno limpio
    mod_v = mod[mod["monto"].notna() & (mod["monto"] > 0)].copy()

    # Agregamos por proveedor moderno (mantenemos un RFC representativo)
    mod_g = (
        mod_v.dropna(subset=["proveedor"])
        .groupby("proveedor")
        .agg(
            contratos_moderno=("contrato_id", "count"),
            monto_moderno_mxn=("monto", "sum"),
            ad_pct_moderno=("modalidad", lambda s: (s == "AD").mean() * 100),
            rfc_proveedor_moderno=(
                "rfc_proveedor",
                lambda s: s.dropna().mode().iloc[0] if not s.dropna().empty else None,
            ),
        )
        .reset_index()
    )
    mod_g["proveedor_norm"] = mod_g["proveedor"].map(normalize_name)
    log.info("Proveedores modernos únicos: %d", len(mod_g))

    fuzz, _ = _try_rapidfuzz()
    log.info("rapidfuzz: %s", "DISPONIBLE" if fuzz else "NO disponible (usando fallback)")

    haystack_norm = mod_g["proveedor_norm"].tolist()

    rows = []
    for _, h in top.iterrows():
        nombre_h = h["proveedor"]
        nombre_h_norm = normalize_name(nombre_h)
        idx, score, kind = find_match(nombre_h_norm, haystack_norm, threshold=90)

        if idx is None:
            rows.append({
                "proveedor_historico": nombre_h,
                "proveedor_moderno_match": None,
                "rfc_proveedor_moderno": None,
                "contratos_historico": int(h["contratos"]),
                "monto_historico_mxn": float(h["monto_total"]),
                "contratos_moderno": 0,
                "monto_moderno_mxn": 0.0,
                "ad_pct_historico": _clean_float(h["pct_ad"]) or 0.0,
                "ad_pct_moderno": 0.0,
                "estatus": "PAUSADO",
                "match_confidence": "NULO",
                "match_score": None,
            })
            continue

        m = mod_g.iloc[idx]
        rows.append({
            "proveedor_historico": nombre_h,
            "proveedor_moderno_match": m["proveedor"],
            "rfc_proveedor_moderno": m["rfc_proveedor_moderno"],
            "contratos_historico": int(h["contratos"]),
            "monto_historico_mxn": float(h["monto_total"]),
            "contratos_moderno": int(m["contratos_moderno"]),
            "monto_moderno_mxn": float(m["monto_moderno_mxn"]),
            "ad_pct_historico": _clean_float(h["pct_ad"]) or 0.0,
            "ad_pct_moderno": round(float(m["ad_pct_moderno"]), 2),
            "estatus": "CONTINÚA",
            "match_confidence": kind,
            "match_score": round(score, 2) if score is not None else None,
        })

    out = pd.DataFrame(rows)
    out.to_parquet(
        DATA_PROCESSED / "continuidad.parquet", index=False, compression="zstd"
    )
    log.info("continuidad.parquet escrito · %d filas", len(out))

    # === Resumen ===
    cont = (out["estatus"] == "CONTINÚA").sum()
    paus = (out["estatus"] == "PAUSADO").sum()
    exacto = (out["match_confidence"] == "EXACTO").sum()
    fuzzy = (out["match_confidence"] == "FUZZY").sum()
    log.info("=== RESUMEN CONTINUIDAD ===")
    log.info("Top 50 históricos · CONTINÚA: %d · PAUSADO: %d", cont, paus)
    log.info("Confianza · EXACTO: %d · FUZZY: %d · NULO: %d", exacto, fuzzy, paus)

    cont_df = out[out["estatus"] == "CONTINÚA"].sort_values(
        "monto_moderno_mxn", ascending=False
    )
    log.info("Top 5 con mayor continuidad (monto moderno):")
    for _, r in cont_df.head(5).iterrows():
        log.info(
            "  %s · %d → %d contratos · %.1f mdp moderno · score=%s",
            r["proveedor_historico"][:50],
            r["contratos_historico"],
            r["contratos_moderno"],
            r["monto_moderno_mxn"] / 1e6,
            r["match_score"],
        )

    # Top 3 que han retrocedido (más histórico vs poco moderno)
    cont_df_with_ratio = cont_df.copy()
    cont_df_with_ratio["ratio"] = (
        cont_df_with_ratio["monto_moderno_mxn"]
        / cont_df_with_ratio["monto_historico_mxn"]
    )
    receded = cont_df_with_ratio.sort_values("ratio").head(3)
    log.info("Top 3 retrocedidos (menor moderno/histórico):")
    for _, r in receded.iterrows():
        log.info(
            "  %s · histórico %.1f mdp · moderno %.1f mdp · ratio %.4f",
            r["proveedor_historico"][:50],
            r["monto_historico_mxn"] / 1e6,
            r["monto_moderno_mxn"] / 1e6,
            r["ratio"],
        )

    # === JSON para web (top 30 por relevancia) ===
    # Relevancia = monto histórico (manteniendo el ranking original).
    out_sorted = out.sort_values("monto_historico_mxn", ascending=False).head(30)

    def _str_or_none(v):
        if v is None:
            return None
        try:
            if pd.isna(v):
                return None
        except (TypeError, ValueError):
            pass
        return str(v)

    payload = []
    for _, r in out_sorted.iterrows():
        payload.append({
            "proveedor_historico": r["proveedor_historico"],
            "proveedor_moderno_match": _str_or_none(r["proveedor_moderno_match"]),
            "rfc_proveedor_moderno": _str_or_none(r["rfc_proveedor_moderno"]),
            "contratos_historico": int(r["contratos_historico"]),
            "monto_historico_mxn": _clean_float(r["monto_historico_mxn"]),
            "contratos_moderno": int(r["contratos_moderno"]),
            "monto_moderno_mxn": _clean_float(r["monto_moderno_mxn"]),
            "ad_pct_historico": _clean_float(r["ad_pct_historico"]),
            "ad_pct_moderno": _clean_float(r["ad_pct_moderno"]),
            "estatus": r["estatus"],
            "match_confidence": r["match_confidence"],
            "match_score": _clean_float(r["match_score"]),
        })

    out_json = WEB_DATA / "continuidad.json"
    with out_json.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2, allow_nan=False)
    log.info("JSON escrito %s · %.1f KB", out_json.name, out_json.stat().st_size / 1024)


if __name__ == "__main__":
    main()
