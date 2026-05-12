# México Bajo Lupa

> Auditoría ciudadana de México — mapa interactivo y análisis estadístico forense sobre datos oficiales.

**Live:** [mexico-bajo-lupa.vercel.app](https://mexico-bajo-lupa.vercel.app)

No es un dashboard descriptivo más. Cruza seguridad, gasto público y compras del gobierno con estadística forense (Ley de Benford, MAD de Nigrini, lista 69-B del SAT) para exponer lo que las cifras oficiales por sí solas no dicen.

---

## Lo que contiene hoy

**Datos integrados (V1–V4)**

| Fuente | Cobertura | Volumen |
|---|---|---|
| SESNSP · incidencia delictiva | 2015–2025, 32 entidades, 7 categorías | 413,952 registros |
| INEGI · PIB estatal | 2024, precios constantes 2018 | 32 entidades |
| CONAPO · proyecciones de población | 1990–2040 | 1,632 filas |
| CONEVAL · pobreza multidimensional | 2022 | 32 entidades × 4 mediciones |
| ComprasMX federal · contratos | 2024–2025 | 223,015 contratos |
| ComprasMX estatal · contratos | 2024–2025 | 12,377 contratos · 32 entidades |
| ComprasMX histórico · CompraNet 5.0 | 2010–2022 | 2,356,609 contratos |
| SHCP · gasto federalizado | 2011–2026, mensual | 250k filas · 2.65 billones MXN en 2025 |
| SAT · Listado 69-B (EFOS) | snapshot continuo | 14,234 contribuyentes · 11,270 Definitivos |

**Rutas activas**

| Ruta | Qué hace |
|---|---|
| `/` | Landing con narrativa, hero y preview del mapa |
| `/mapa` | Choropleth interactivo, 7 métricas activas (seguridad / economía / gobierno) |
| `/estado/[slug]` | Dossier por entidad: serie mensual de delito + cruces socioeconómicos |
| `/anomalias` | Benford nacional + ranking filtrable de 200+ dependencias federales |
| `/efos` | Cruce SAT 69-B × ComprasMX federal con búsqueda, filtro por estatus y sort |
| `/compara` | Comparador A vs B entre estados |
| `/historico` | 12 años de CompraNet 5.0: evolución de adjudicación directa, top proveedores recurrentes, Benford anual |
| `/transparencia` | Página honesta sobre por qué V5 (transparencia estatal) no está activa todavía |
| `/metodologia`, `/fuentes` | Cómo se procesa cada cifra y de dónde viene |

---

## Hallazgos del corpus actual

- **72.3 % del gasto federal APF** se ejecuta por adjudicación directa (vs 20.2 % licitación pública abierta).
- **Tlaxcala: 91.1 % de adjudicación directa estatal** — 9 de cada 10 contratos sin licitación pública.
- **Cluster captura institucional + pobreza alta**: Tlaxcala, Hidalgo (66.1 % AD), San Luis Potosí (70.5 %), Colima (64 %).
- **Patrón Benford-no-AD** (formalmente competitivo, numéricamente sospechoso): Guerrero (MAD 0.0356, AD 16.4 %), CDMX (MAD 0.0308, AD 51.8 %), Baja California (MAD 0.0269, AD 14.7 %). Hipótesis: fragmentación de contratos para evadir umbrales de licitación.
- **Colima**: tasa más alta de homicidios per cápita (72.6/100k, −25.6 % YoY) y 3er lugar en gasto federalizado per cápita (25,549 MXN/persona). El recurso fluye, la violencia no cede.
- **Edomex**: recibe el mayor monto absoluto (294 mil mdp federalizados, más que BCS+BC+Sonora juntos) pero el menor per cápita (16,587 MXN). 42.9 % de pobreza.
- **Sinaloa**: +68.3 % YoY en homicidios (efecto guerra interna del cartel).
- **Yucatán**: la entidad más segura del país (1.39/100k).

---

## Roadmap

| Versión | Estado | Qué incluye |
|---|---|---|
| V1 — Frontend MVP | ✅ Listo | Mapa, dossier, Benford, mobile completo |
| V2 — Cruces socioeconómicos | ✅ Listo | PIB, pobreza, gasto federalizado |
| V3 — Compras estatales | ✅ Listo | ComprasMX estatal, MAD Benford por entidad |
| V4 — Histórico y EFOS | ✅ Listo | CompraNet 5.0 + cruce SAT 69-B |
| V5 — Transparencia estatal | 🟡 Pendiente | IMCO BIPE / sucesor INAI · sin fuente integrable hoy ([ver `/transparencia`](https://mexico-bajo-lupa.vercel.app/transparencia)) |
| V6 — Anomalía de la semana | ⚪ Después | Detección automática + newsletter editorial |
| V7 — Detalle municipal | ⚪ Después | SESNSP IDEFM, ~2,400 municipios |

---

## Arquitectura

Estática end-to-end. Ningún servidor de aplicación.

```
Fuentes oficiales ──► etl/*.py ──► data/processed/*.parquet (canónico)
                                          │
                                          └─► etl/export_json.py ──► web/src/data/*.json (bridge sincrono)
                                                                            │
                                                                            └─► Next.js 16 build estático ──► Vercel CDN
```

Detalle completo en [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) — 4 diagramas Mermaid + tabla de refresh por fuente.

**Stack**

| Capa | Herramienta |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack) |
| Estilos | Tailwind v4 (CSS-first, `@theme`) |
| Mapa | MapLibre GL JS 5 |
| Charts | Recharts 3 |
| Datos en navegador | DuckDB-WASM 1.33 (preparado, sin uso aún) |
| ETL | Python 3.11 + pandas + pyarrow |
| Datos canónicos | Parquet (zstd) |
| Hosting | Vercel (estático) |

---

## Reproducir localmente

```powershell
# 1. Frontend
cd web
npm install
npm run dev
# → http://localhost:3000

# 2. ETL (regenera todos los datasets)
cd ..
python -m venv .venv
.venv\Scripts\activate
pip install -r etl/requirements.txt
python etl/run_all.py
```

El ETL produce:
- `data/processed/*.parquet` — store canónico
- `web/src/data/*.json` — bridge sincrono que importa el frontend
- `web/public/data/*.parquet` — copia para DuckDB-WASM cuando sea necesario

Si una fuente cambia su URL o esquema, los scripts fallan **ruidosamente** con un mensaje claro de qué archivo descargar manualmente. Es deliberado: preferimos que el ETL se rompa antes que que silenciosamente reporte números equivocados.

---

## Filosofía

> "DataMéxico te dice cuánto produce Nuevo León. Esto te dice qué dependencias del gobierno de Nuevo León tienen patrones de compra estadísticamente sospechosos."

- **Conceptos antes que código.** Cada gráfico explica qué mide y por qué.
- **Postura, no descripción.** Cuando dos oficinas dicen cosas distintas del mismo estado, lo decimos.
- **No acusamos.** Levantamos banderas estadísticas. Las acusaciones son trabajo de fiscales.
- **Trazabilidad estricta.** Toda cifra es reproducible desde una fuente oficial. Si no podemos trazarla, no aparece.
- **Open source.** El código y el pipeline son públicos. Cualquiera puede correr el ETL y reproducir los Parquet.

---

## Licencia

[MIT](LICENSE) — Ari Francisco Flores Miranda, 2026.

Datos derivados de fuentes oficiales mexicanas. Sin afiliación gubernamental.
