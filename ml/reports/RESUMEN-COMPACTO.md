# México bajo lupa — ML no supervisado: resumen compacto

> **Investigación back-office completa, 2026-05-27**
> 17 scripts ejecutables · 30+ parquets de output · 13 reportes JSON · 0 etiquetas (todo no supervisado)
> **Datasets:** comprasmx_historico 2010-2024 (2.35M contratos) · comprasmx_contratos 2024-25 (235K) · sat_efos (14K) · sesnsp 2015-2025 (414K)

---

## TL;DR — los 10 números que importan

| # | Hallazgo | Magnitud |
|---|---|---|
| 1 | Contratos a empresas EFOS confirmadas (lista negra SAT) | **365 contratos · $821.6M MXN** |
| 2 | Contratos firmados DESPUÉS de presunción EFOS del proveedor | **190 contratos** (histórico) + **3** (reciente) |
| 3 | Contratos robustos histórico (≥3 señales independientes) | **7,797** (13 con 5 señales) |
| 4 | Contratos robustos reciente (≥2 señales) | **123** (4 con 3 señales) |
| 5 | **One-shot wonders** (1 contrato y desaparecen) | **106,927 proveedores = 40.4%** de todos · **$354.9 mil M MXN = 6.12% del gasto total** |
| 6 | Proveedores activos SOLO en años electorales | **3,411** · $19 mil M MXN |
| 7 | Proveedores transitorios (un solo sexenio, intensos) | **27,592** · **$1.27 BILLONES MXN** |
| 8 | Tasa EFOS en one-shots vs persistentes | **1.53x más probable** ser EFOS si sos one-shot |
| 9 | Estados con 100% de fechas null en contratos | **9 estados** (Tlaxcala, Colima, Guerrero, QRoo, Chihuahua, BC, Sonora, NL, Coahuila) |
| 10 | Top contrato individual del histórico | **CIC Corp. Coahuila** — 1 solo contrato de **$23.7 MIL MILLONES MXN** (2013, carbón) |

---

## Los 5 patrones más fuertes (orden de relevancia)

### 1. ⚠ One-shot wonders — el patrón clásico de fachada

**40.4% de TODOS los proveedores únicos del histórico aparecen UNA vez y desaparecen.**

- $354.9 mil M MXN agregados (6.12% del gasto público total)
- **31 one-shots** con contratos individuales > $1,000 M
- **49** con > $500 M
- **246** con > $100 M

**Top 5 mega-one-shots:**

| Año | Proveedor | Monto MXN | Sexenio |
|---|---|---|---|
| 2013 | CIC Corporativo Industrial Coahuila (carbón) | $23.7 mil M | EPN |
| 2021 | Bahud Processing México (procesamiento) | $15.8 mil M | AMLO |
| 2021 | Desarrollo del Sureste Playa Carmen-Tulum | $15.4 mil M | AMLO |
| 2014 | CAF México (tren México-Toluca) | $13.5 mil M | EPN |
| 2020 | Consorcio Lamat Tramo 1 | $13.4 mil M | AMLO |

**Cruce con EFOS valida la hipótesis:** los one-shots tienen **1.53x más probabilidad** de terminar en lista negra del SAT vs proveedores persistentes (0.354% vs 0.232%).

> **Caveat honesto:** las mega-one-shots de >$5 mil M son típicamente SPVs (Special Purpose Vehicles) — vehículos legales creados ad-hoc para 1 obra (APPs carreteras, tren México-Toluca, etc.). Estructuralmente normales pero merecen escrutinio caso a caso.

---

### 2. ⚠ Proveedores activos solo en años electorales

**3,411 proveedores se activan EXCLUSIVAMENTE en años electorales** (2012, 2015, 2018, 2021, 2024).

- Monto agregado: **$19 mil M MXN**
- **Pnpdmi SA de CV** — $1.36 mil M MXN, 12 contratos, **TODO en 2021** (un año electoral)
- **Sistemas Integrales para el Transporte** — $686M en años 2012, 2015 y 2018 exactamente (los 3 electorales del rango)

**Hallazgo contraintuitivo:**
- %AD en años electorales: **59.4%**
- %AD en años no electorales: **69.5%**
- **Diferencia: -10 puntos porcentuales** (menos AD en electorales, no más)

Hipótesis: gobierno usa más Licitación Pública visible en años electorales para legitimación política.

---

### 3. ⚠ Concentración por dependencia y por estado

**Tlaxcala** es el estado más anómalo de México (índice de riesgo 1.000):
- 91% Adjudicación Directa
- **ARQUITECTURA Y DISEÑO R.M. SA DE CV** concentra **48% del gasto público estatal**
- HHI 0.259 (oligopolio fuerte)
- 100% de contratos sin fecha firma

**9 estados con 100% datos nulos** = problema sistémico de transparencia, no error aleatorio:
Tlaxcala · Colima · Guerrero · Quintana Roo · Chihuahua · Baja California · Sonora · Nuevo León · Coahuila

**Top dependencias con monopolio bilateral (HHI ≥0.85):**
- NAZAS → Hernán Fraire Favila (100%)
- Yautepec → Distribuidora de Cloro Esmah (100%)
- SHF → Sociedad Hipotecaria Federal (99%)

**BIODIST S.A. DE C.V.** opera como top proveedor en 2 estados simultáneamente (CDMX 19%, Veracruz 12%) — patrón cross-state que merece auditoría.

---

### 4. Continuidad temporal por sexenio

**Persistentes** (3+ sexenios, 10+ contratos): **9,910 proveedores** — los oligopolios reales que sobreviven gobiernos:

| Proveedor | Años activos | Contratos | Monto MXN |
|---|---|---|---|
| Grupo Fármacos Especializados | 11 | 5,672 | $126.7 mil M |
| Farmacéuticos Maypo | 15 | 13,890 | $75.6 mil M |
| Electromecánica de Montacargas | 8 | 26 | $64.5 mil M |
| Distribuidora Int. Medicamentos | 14 | 4,018 | $49.2 mil M |
| Sanofi Pasteur | 14 | 306 | $30.7 mil M |

**Top proveedores transitorios** (un solo sexenio, intensos):
- EPN puro: **Operadora Cicsa** $92 mil M (NAIM), **PROMOTORA INFRAESTRUCTURA** $21 mil M
- AMLO puro: **Electromecánica Montacargas** $64 mil M, **Currie & Brown** $25.8 mil M

**Movimientos de proveedores por año (nacimientos − muertes):**
- 2011 (Calderón consolida padrón): **+25,155 neto**
- 2018 (transición EPN→AMLO): **−7,479**
- 2022 (AMLO consolida): **−25,806** ← brutal limpieza

---

### 5. Cruce ComprasMX × SAT EFOS (lista negra)

**365 contratos a empresas EFOS confirmadas** ($821.6M MXN):
- 22 en reciente (RFC match directo)
- 343 en histórico (match por nombre normalizado)

**3 contratos firmados POST-presunción** (reciente, $188K total):
1. ENTERPRISE SOURCE CAPITAL MX — firma 2025-03-12, presunto desde 2018 (estatus DESVIRTUADO)
2. GRUPO CIDAR BUSINESS BROKERS (x2) — firmas 2024 y 2025, presunto desde 2019

> Monto bajo pero documenta gap del sistema: **NO hay bloqueo automático** de contratación a EFOS conocidos.

**190 contratos POST-presunción adicionales** detectados en histórico al cruzar por nombre normalizado.

---

## Hallazgos individuales más fuertes (top 10 contratos)

| Rank | Año | Proveedor | Monto MXN | Modalidad | Institución | Por qué importa |
|---|---|---|---|---|---|---|
| 1 | 2017 | Operadora Cicsa | $84.8 mil M | LP | NAIM | Contrato individual #1 del histórico — obra real |
| 2 | 2019 | Electromecánica de Montacargas | $64.5 mil M | AD | IMSS | **Descripción "mantenimiento de montacargas" para $64 mil M — anomalía descriptiva inmediata** |
| 3 | 2025 | PEGSA Construcciones | $7.97 mil M | **AD** | Dos Bocas | AD >$1 mil M + HHI 0.82 institución |
| 4 | 2025 | Becton Dickinson | $1.38 mil M | LP | IMSS | 3 señales convergentes |
| 5 | 2024 | INTEGRA ARRENDA SOFOM | $3.64 mil M | **AD** | Sec. Bienestar | AD >$1 mil M + año electoral |
| 6 | 2022 | Mota-Engil 2022 | $4.02 mil M | **AD** | (histórico, ramo Obra Pública) | 5 señales · 100% AD acumulado · one-shot |
| 7 | 2022 | Ozore Gestión de Agua | $1.69 mil M | **AD** | (histórico) | 5 señales · 100% AD · one-shot |
| 8 | 2023 | AGROASEMEX (×2 contratos) | $1.09 + $1.91 mil M | AD/OTRA | (seguros agro) | 5 señales en ambos |
| 9 | 2023 | Guarderías "Reino Infantil" + "My Happy Baby" | $84M + $80M | AD | IMSS subrogación | Patrón de guarderías subrogadas, históricamente problemático |
| 10 | 2013 | CIC Corp. Coahuila | $23.7 mil M | LP | (carbón) | **One-shot mega: 1 contrato y desaparece** |

---

## Resultados por método (qué funcionó)

| Método | Funcionó | Por qué |
|---|---|---|
| **Cruce EFOS × ComprasMX** | ✓✓✓ | Es la única señal supervisada externa que tenemos. Direct hits. |
| **One-shot detection** | ✓✓✓ | Patrón estructural claro, validado por ratio EFOS 1.53x. |
| **Score multi-señal por contrato** | ✓✓ | Filtra falsos positivos. 7,797 ≥3 señales en histórico es manejable. |
| **HHI por institución + por estado** | ✓✓ | Identifica monopolios bilaterales. Replicable. |
| **Análisis temporal por sexenio** | ✓✓ | Hallazgos políticos no obvios (AD baja en electorales). |
| **MAD score sobre log(monto)** | ✓ | Robusto a la distribución log-normal. |
| **IsolationForest + LOF como filtro doble** | ✓ | LOF reduce ~93% el ruido del IF. |
| **TF-IDF + clusters sobre descripciones** | ✓ | Detectó 163 proveedores con descripción idéntica ($73 mil M). |

## Métodos que NO funcionaron

| Método | Por qué no |
|---|---|
| **Benford con tests p<0.05** | Con N>10K cualquier desvío chico da p≈0. Solo sirve el ranking por chi². |
| **DBSCAN sobre features mixtos** | 343 clusters sin estructura interpretable. Demasiado categórico. |
| **IsolationForest sobre SESNSP agregados** | Solo confirmó que Edo. de México es grande. Sin señal. |
| **Cruce histórico EFOS por nombre original** | Fragmentación legal (SA de CV vs S.A. de C.V.) baja el recall. **Solución aplicada: normalización agresiva** (SADECV, SDERLDECV) que recuperó 343 contratos en histórico. |
| **Picos electorales SESNSP como "anomalía"** | Son ciclos políticos esperables, no fraude. Falso positivo. |

---

## Limitaciones honestas

1. **No hay labels**. Todo es exploración; ninguna "anomalía" es "fraude confirmado". El cruce EFOS es la única validación externa parcial.
2. **RFC 100% null en histórico** — impide cruces fuertes por identificador único. El cruce por nombre normalizado tiene falsos positivos y falsos negativos.
3. **57% de fechas_firma null** en reciente (problema upstream ComprasMX) limita análisis temporales del dataset reciente.
4. **9 estados con 100% fechas null** en contratos estatales — calidad de datos crítica.
5. **Sin hiperparámetros optimizados** — sin labels no hay forma de validar contamination=0.01 o n_clusters=8. Defaults sklearn razonables.
6. **Datos hasta junio 2025** — no incluye 2025 H2 ni 2026.
7. **Hallazgo 2024 "menos contratos"** (1,816 vs ~200K otros años) y "2023" (16,859) son **artefactos del snapshot** de la base, no señal real.

---

## Próximos pasos

### Industrializar (orden de impacto vs esfuerzo)

| # | Análisis | Impacto | Esfuerzo |
|---|---|---|---|
| 1 | **Cruce EFOS mensual automatizado** — refresh sat_efos.parquet + alerta de contratos firmados >30d post-presunción | Alto | Bajo |
| 2 | **Score de riesgo por proveedor** como variable derivada en data-meta para frontend | Alto | Bajo |
| 3 | **Top-N one-shots millonarios** como tabla curada visible en el sitio | Alto | Bajo |
| 4 | **HHI por dependencia** — top-50 con concentración >50%, ranking actualizado | Medio | Bajo |
| 5 | **Pipeline Benford** con chi²/√N normalizado en lugar de p-value | Medio | Medio |

### Frontend a integrar (decisión del usuario)

Tenemos parquets listos para mostrar:
- `anomalias_robustas.parquet` (123 contratos reciente)
- `anomalias_robustas_historico.parquet` (7,797 históricos)
- `deep_huerfanos_oneshots.parquet` (106,927 one-shots)
- `deep_pipeline_por_estado.parquet` (32 estados)
- `deep_continuidad_temporal_proveedores.parquet` (patrones políticos)
- `cruce_efos_contratos_all.parquet` (EFOS confirmados)

Sugerencia: agregar páginas `/anomalias-robustas`, `/oneshots`, `/estados-riesgo`, `/temporal` con visualizaciones interactivas.

---

## Estructura de outputs

```
ml/
├── scripts/   17 scripts ejecutables (01-17)
├── reports/   13 JSON + 3 markdown (incluye este)
└── outputs/   30+ parquets con resultados
```

**Reportes legibles:**
- `00-findings-ejecutivo.md` — primera versión del ejecutivo (sin profundizaciones 1-5)
- `01-reconocimiento.md` — perfilado inicial
- `14-top20-dossiers.md` — dossier interpretativo de los 20 casos más relevantes
- **`RESUMEN-COMPACTO.md`** (este) — vista consolidada de todo

**Scripts reproducibles:** correr `.venv/Scripts/python.exe ml/scripts/0X_*.py` regenera cada análisis.

---

*Análisis ejecutado con: pandas · scikit-learn · networkx · scipy. Sin hiperparámetros optimizados (no supervisado). Datos al snapshot 2026-05-08.*
