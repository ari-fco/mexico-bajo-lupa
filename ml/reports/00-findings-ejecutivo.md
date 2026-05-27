# Reporte ejecutivo — Investigación ML no supervisada

**Proyecto México bajo lupa — Auditoría ciudadana**
**Fecha:** 2026-05-27
**Modalidad:** No supervisado, exploratorio. Sin labels.

## TL;DR

- **5 datasets analizados** con 5 técnicas no supervisadas (Benford, MAD, IsolationForest, LOF, DBSCAN, KMeans).
- **123 contratos** flaggeados por >=2 métodos independientes (señal robusta).
- **365 contratos** a proveedores EFOS confirmados (cruce con SAT lista negra).
- **$821.60 M MXN** ejecutados a empresas con presunción de operaciones simuladas.
- Hallazgo principal: **GEOTECNIA Y DESARROLLO** — contrato Marina 2025 de 80.7M MXN a empresa EFOS (estatus DESVIRTUADO).
- **48 proveedores** marcados por múltiples señales simultáneas (IsolationForest + ranking por concentración).

## Top 10 hallazgos accionables

### 1. Contratos EFOS post-presunción (3 casos, monto bajo)
Tres contratos firmados DESPUÉS de que el proveedor fuera presunto EFOS:
- **ENTERPRISE SOURCE CAPITAL DE MEXICO SA DE CV** — $95,200 | firma 2025-03-12 | presunto desde 2018-06-01 | estatus: DESVIRTUADO
- **GRUPO CIDAR BUSINESS BROKERS, AGENTE DE SEGUROS Y DE FIANZAS** — $47,414 | firma 2024-02-28 | presunto desde 2019-03-01 | estatus: SENTENCIA_FAVORABLE
- **GRUPO CIDAR BUSINESS BROKERS, AGENTE DE SEGUROS Y DE FIANZAS** — $45,690 | firma 2025-04-11 | presunto desde 2019-03-01 | estatus: SENTENCIA_FAVORABLE
> NOTA: monto bajo (188K total), pero documenta que el sistema NO bloquea contratos a EFOS conocidos.

### 2. Concentración extrema en farmacéuticas (histórico)
Top proveedores históricos con monto > 75 mil millones MXN y >82% Adjudicación Directa:
- **Farmaceuticos Maypo, S.A. de C.V.** — 13,890 contratos | $75.61 mil M MXN | 88% AD
- **Grupo Alcamera, S.A. de C.V.** — 121 contratos | $471.00 M MXN | 100% AD
- **Grupo Farmacos Especializados Sa de Cv** — 5,672 contratos | $126.76 mil M MXN | 82% AD
- **Multicorporacion Brexot Sa de Cv** — 11 contratos | $604.79 M MXN | 100% AD
- **Marcas Nestle, S.A. de C.V.** — 10,719 contratos | $4.52 mil M MXN | 100% AD

### 3. Anomalías por IsolationForest + ranking proveedor
48 proveedores marcados por DOS o más señales. Los más relevantes por monto:
- **CONSORCIO HOSPITALARIO SA DE CV** (CHO0107317DA) — 397 contratos | $35.68 M MXN | señales: isoforest|top_proveedor
- **BOEHRINGER INGELHEIM MEXICO SA DE CV** (BIM0711148Q0) — 144 contratos | $10.59 mil M MXN | señales: isoforest|top_proveedor
- **ASOKAM SA DE CV** (ASO061124JP9) — 40 contratos | $2.29 mil M MXN | señales: isoforest|top_proveedor
- **SANOFI PASTEUR SA DE CV** (SPA960328P62) — 242 contratos | $7.86 mil M MXN | señales: isoforest|top_proveedor
- **PRODUCTOS FARMACEUTICOS EKA SA DE CV** (PFE190926IK3) — 301 contratos | $119.60 M MXN | señales: isoforest|top_proveedor

### 4. Top contratos individuales extremos (reciente)
- $27.45 mil M MXN — **OPERADORA CICSA SA DE CV** | AGENCIA REGULADORA DEL TRANSPORTE FERROV | LP
  > CONSTRUCCIÓN Y DISEÑO DE 111 KM DEL TREN DE PASAJEROS SALTILLO  NUEVO LAREDO, SEGMENTOS 13 Y 14, SALTILLO  SANTA CATARIN
- $12.65 mil M MXN — **ICA CONSTRUCTORA SA DE CV** | AGENCIA REGULADORA DEL TRANSPORTE FERROV | LP
  > CONSTRUCCIÓN Y DISEÑO DE 100.05 KM DEL TREN DE PASAJEROS SALTILLO  NUEVO LAREDO, SEGMENTOS 16 Y 17 UNIÓN SAN JAVIER  ARR
- $7.97 mil M MXN — **PEGSA CONSTRUCCIONES SA DE CV** | ADMINISTRACION DEL SISTEMA PORTUARIO NAC | AD
  > CONSTRUCCIÓN DE LA AMPLIACIÓN DEL PUERTO DE DOS BOCAS (OBRAS DE PROTECCIÓN ETAPA FINAL).
- $6.69 mil M MXN — **LABORATORIOS PISA SA DE CV** | INSTITUTO MEXICANO DEL SEGURO SOCIAL | LP
  > COMPRA CONSOLIDADA DE MEDICAMENTOS, BIENES TERAPÉUTICOS, MATERIAL DE CURACIÓN..
- $6.58 mil M MXN — **MOTA-ENGIL MEXICO S A P I DE CV** | AGENCIA REGULADORA DEL TRANSPORTE FERROV | LP
  > CONSTRUCCIÓN Y DISEÑO DE 30.30 KM DEL TRAMO I FERROVIARIO DEL TREN DE PASAJEROS QUERÉTARO-IRAPUATO, TRAMO: QUERÉTARO ZON

### 5. Top contratos individuales extremos (histórico)
- $84.83 mil M MXN — **Operadora Cicsa, S.A. de C.V.** | 4.Obra Pública | 2017
  > Construccion delEdificio Terminal delNuevo Aeropuerto Internacional de la Ciud — Construccion delEdificio Terminal delNu
- $64.54 mil M MXN — **Electromecanica de Montacargas Sa de Cv** | 3.Servicios | 2019
  > Aa-050Gyr0487-E100-2019,Servicio de Mantenimiento Correctivo a Equipo de Montaca — Servicio de Mantenimiento a Equipode 
- $31.52 mil M MXN — **Alstom Transport Mexico Sa de Cv** | 1.Adquisiciones | 2021
  > Adquisición de Material Rodante y Sistemas Ferroviarios Para el Tren Maya — Adquisición de Material Rodante y Sistemas F
- $25.85 mil M MXN — **Ica Constructora Sa de Cv** | 4.Obra Pública | 2020
  > Ad Proyecto Integral de Obra Pública a Precio Mixto Que — Proyecto Integral de Obra Pública a Precio Mixto Que Incluye l
- $25.79 mil M MXN — **Currie & Brown - Mexico Sa de Cv** | 3.Servicios | 2021
  > Supervisión App Partida 2 — Supervisión de Los Contratos de Prestación de Servicios En la Modalidad de Asociaciones Púb

### 6. EFOS — patrones por cluster
KMeans (k=5) sobre lag presunción→publicación, año, estatus:
- Cluster 0: 3,463 EFOS | lag medio 229d | año medio 2021 | %def 100% | %fav 0%
- Cluster 1: 597 EFOS | lag medio 982d | año medio 2017 | %def 96% | %fav 4%
- Cluster 2: 1,271 EFOS | lag medio 2d | año medio 2023 | %def 0% | %fav 0%
- Cluster 3: 1,610 EFOS | lag medio 300d | año medio 2017 | %def 0% | %fav 100%
- Cluster 4: 7,202 EFOS | lag medio 257d | año medio 2017 | %def 99% | %fav 0%

### 7. Cobertura SESNSP por estado
- Mayor volumen: **México** (3,924,507 delitos)
- Menor volumen: **Tlaxcala** (55,721 delitos)
- Ratio: 70.4x

### 8. Delitos electorales: ciclo, no anomalía
Los 5 picos temporales más extremos son TODOS delitos electorales en años de elección:
- Veracruz de Ignacio de la Llav | Electorales | 2021-07 | total 30 | delta -218
- Veracruz de Ignacio de la Llav | Electorales | 2021-06 | total 248 | delta 198
- Hidalgo | Electorales | 2020-10 | total 212 | delta 179
- Hidalgo | Electorales | 2020-11 | total 41 | delta -171
- Ciudad de México | Electorales | 2024-07 | total 15 | delta -455
> Hallazgo: estos NO son fraude estadístico, son patrón conocido del ciclo electoral.

### 9. Quintana Roo / Violencia de género
97.7% meses en cero pero con picos puntuales 42x mayores que la mediana.
> Hipótesis: sub-reporte sistémico en categoría específica, NO falta de delitos.

### 10. Benford: 27/28 cortes históricos se apartan significativamente
Pero ojo: con n>10K cualquier desvío chico da p<0.05. Lo que importa es **chi² ranking**.
Cortes con chi² más alto:
- modalidad_AD: n=1,739,624 chi²=13925
- global: n=2,349,732 chi²=9994
- ramo_1.Adquisiciones: n=1,307,593 chi²=6274
- ramo_3.Servicios: n=744,644 chi²=5151
- ano_2017: n=234,210 chi²=3388

## Hallazgos de profundización

### Clustering tipológico (8 clusters, silhouette 0.326)
- **estandar** — 1,380 proveedores | medias: 13 contratos | $109.58 M MXN | 34% AD | 5 instituciones
- **captura** — 1,815 proveedores | medias: 7 contratos | $2.59 M MXN | 97% AD | 1 instituciones
- **anomalia_jumps** — 229 proveedores | medias: 51 contratos | $345.83 M MXN | 61% AD | 25 instituciones
- **anomalia_jumps** — 45 proveedores | medias: 162 contratos | $1.52 mil M MXN | 22% AD | 96 instituciones
- **estandar** — 1,422 proveedores | medias: 9 contratos | $6.88 M MXN | 85% AD | 4 instituciones
- **anomalia_jumps** — 566 proveedores | medias: 93 contratos | $779.32 M MXN | 64% AD | 12 instituciones
- **captura** — 540 proveedores | medias: 74 contratos | $59.06 M MXN | 91% AD | 1 instituciones
- **marginal** — 1,089 proveedores | medias: 8 contratos | $40.36 M MXN | 23% AD | 1 instituciones

**Ejemplos `captura`:** SEGURIDAD ALIMENTARIA MEXICANA, MOLINOS AZTECA SA DE CV, COMERCIALIZADORA INTERNACIONAL DE C
**Ejemplos `marginal`:** GRUPO IMPULSOR PAJEME SA DE CV, DRAGADOS Y URBANIZACIONES SIGLO 21 , INGENIEROS CIVILES DE SONORA SA DE 
**Ejemplos `estandar`:** PEGSA CONSTRUCCIONES SA DE CV, PIGUDI GASTRONOMICO SA DE CV, INGENIERIA Y DESARROLLO INMOBILIARI
**Ejemplos `anomalia_jumps`:** LABORATORIOS PISA SA DE CV, AGROASEMEX SA, TOKA INTERNACIONAL S A P I DE CV

### Concentración temporal: facturación cíclica
De los 64 proveedores top analizados, 54 concentran >=80% de su monto en SOLO 3 MESES:
- **LABORATORIOS PISA SA DE CV** — 95% en top-3 meses | $15.01 mil M MXN
- **ASTRAZENECA SA DE CV** — 85% en top-3 meses | $11.34 mil M MXN
- **BOEHRINGER INGELHEIM MEXICO SA DE CV** — 96% en top-3 meses | $10.45 mil M MXN
- **TOKA INTERNACIONAL S A P I DE CV** — 95% en top-3 meses | $9.57 mil M MXN
- **EDENRED MEXICO SA DE CV** — 95% en top-3 meses | $8.94 mil M MXN
> Interpretación: es el ciclo de **compras consolidadas IMSS/ISSSTE**, no fraude. Pero documenta la dependencia estructural del Estado de pocos proveedores en pocos eventos.

### Análisis textual: copy-paste de descripciones
**Descripción idéntica usada por 163 proveedores distintos** (suma $72.98 mil M MXN):
> "COMPRA CONSOLIDADA DE MEDICAMENTOS, BIENES TERAPÉUTICOS, MATERIAL DE CURACIÓN.."

- 14,268 descripciones duplicadas en el catálogo
- 3,793 contratos con descripción <20 caracteres
- Top repetida: "COMPRA PARA ATENDER REQUERIMIENTO DEL PROGRAMA DE ABASTO RURAL" (21,576 veces)

### Red bipartita proveedor ↔ institución
- **42,840 proveedores** (99%) venden a UNA sola institución
- **249 proveedores** venden a >=20 instituciones (los diversificados)
- Grado medio: 1.6 instituciones por proveedor

**Top proveedores diversificados (más instituciones cliente):**
- EDENRED MEXICO SA DE CV — 228 instituciones
- PEMEX TRANSFORMACION INDUSTRIAL EPS — 217 instituciones
- TOKA INTERNACIONAL S A P I DE CV — 208 instituciones
- AGROASEMEX SA — 198 instituciones
- QUALITAS COMPAÑIA DE SEGUROS SA DE CV — 193 instituciones

**Top dependencias con monopolio fuerte (HHI >0.85):**
- HHI=1.00 | NAZAS → HERNAN FRAIRE FAVILA (100%)
- HHI=1.00 | SISTEMA DE AGUA POTABLE Y SANEAMIENTO DE YAUT → DISTRIBUIDORA DE CLORO ESMAH SA DE  (100%)
- HHI=0.99 | SEGUROS DE CREDITO A LA VIVIENDA SHF, S.A. DE → SOCIEDAD HIPOTECARIA FEDERAL SNC (100%)
- HHI=0.93 | UNIDAD DEL SISTEMA PARA LA CARRERA DE LAS MAE → CENTRO NACIONAL DE EVALUACION PARA  (96%)
- HHI=0.93 | SAN JUAN QUIAHIJE → GRUPO CONSTRUCTOR FRYAV S DE RL DE  (96%)

**Top proveedores monopolistas (monto alto, 1 sola institución):**
- SEGURIDAD ALIMENTARIA MEXICANA → ALIMENTACIÓN PARA EL BIENESTAR, S.A | $4.41 mil M MXN | %AD=0%
- ALMACENAJE Y DISTRIBUCION AVIOR SA DE CV → LABORATORIOS DE BIOLÓGICOS Y REACTI | $2.77 mil M MXN | %AD=50%
- TRANS CE CARGO S DE RL DE CV → SECRETARIA DE LA DEFENSA NACIONAL | $2.34 mil M MXN | %AD=100%
- IGT MEXICO LOTTERY S DE RL DE CV → LOTERÍA NACIONAL | $1.96 mil M MXN | %AD=50%
- OXIDROGENO SA DE CV → SERVICIOS DE SALUD DEL INSTITUTO ME | $1.64 mil M MXN | %AD=0%

## Qué funcionó / qué no

### Funcionó
- **Cruce EFOS × ComprasMX** — produjo los hallazgos más interpretables. 22 contratos directos por RFC + 343 por nombre.
- **Score por proveedor** (pct_AD + concentración + ratio_max/med) — identifica patrones de captura de presupuesto.
- **MAD score sobre log(monto)** — robusto a la distribución log-normal de contratos.
- **IsolationForest + LOF como filtro doble** — reduce falsos positivos del IF, queda en hits de mayor confianza.

### No funcionó
- **Benford con tests estadísticos** — con N>100K cualquier desvío da p<0.05. El ranking por chi² es útil; el test binario no.
- **DBSCAN sobre datos mezclados** — 343 clusters + 20% noise sin estructura interpretable. Demasiados features categóricos.
- **Cruce histórico EFOS por nombre** — fragmentación de nombres legales (SA de CV vs S.A. de C.V.) limita el match. RFC sería ideal pero no existe en histórico.
- **IsolationForest sobre SESNSP agregados** — solo confirmó que el Edo. de México es grande. Falta señal real.

## Top-5 análisis para industrializar (pipeline reproducible)

1. **Cruce EFOS automatizado mensual** — refresh sat_efos.parquet + contratos. Alertar contratos firmados >30 días POST presunción.
2. **Score de riesgo por proveedor** — variable derivada en data-meta, lista para mostrar en frontend.
3. **Top-N contratos extremos por monto + IF combinado** — tabla curada actualizable, no requiere ML pesado en runtime.
4. **Pipeline Benford por cortes** — solo guardar chi² normalizado (chi²/sqrt(N)) para comparar entre tamaños.
5. **Dependencias por concentración** — top-50 instituciones con concentración de proveedor >50%.

## Limitaciones honestas

- **No hay labels**. Todo es exploración; ninguna 'anomalía' es 'fraude confirmado'.
- **RFC ausente en histórico** (100% null) impide cruces fuertes con EFOS por identificador único.
- **57% de fechas_firma null** en reciente (problema upstream ComprasMX) afecta análisis temporales.
- **Hiperparámetros no optimizados**. Sin labels no hay forma de validar — defaults sklearn razonables.
- **Datos hasta 2024-2025**. No incluye junio 2025+ por fecha de snapshot.

## Outputs generados

### Parquets en `ml/outputs/`
- `anomalias_robustas.parquet` (30 KB)
- `anomalias_robustas_por_proveedor.parquet` (23 KB)
- `cruce_dependencias_riesgo.parquet` (8 KB)
- `cruce_efos_contratos_all.parquet` (19 KB)
- `cruce_efos_post_presuncion.parquet` (16 KB)
- `cruce_estados_gasto_delitos.parquet` (5 KB)
- `cruce_proveedores_multi_senal.parquet` (8 KB)
- `deep_clusters_proveedores.parquet` (800 KB)
- `deep_clusters_proveedores_summary.parquet` (5 KB)
- `deep_descripciones_cortas.parquet` (15 KB)
- `deep_descripciones_cross_proveedor.parquet` (12 KB)
- `deep_red_hhi_instituciones.parquet` (55 KB)
- `deep_red_proveedores_monopolistas.parquet` (10 KB)
- `deep_resumen_temporal_proveedores.parquet` (12 KB)
- `deep_series_proveedores_top.parquet` (13 KB)
- `efos_clusters.parquet` (4 KB)
- `efos_con_cluster.parquet` (552 KB)
- `efos_contratos_enriquecido.parquet` (11 KB)
- `efos_rachas_mensuales.parquet` (3 KB)
- `historico_benford_cortes.parquet` (11 KB)
- `historico_top_isoforest.parquet` (19 KB)
- `historico_top_lof.parquet` (24 KB)
- `historico_top_montos_extremos.parquet` (22 KB)
- `historico_top_proveedores_sospechosos.parquet` (65 KB)
- `reciente_benford_cortes.parquet` (12 KB)
- `reciente_dbscan_noise.parquet` (395 KB)
- `reciente_top_isoforest.parquet` (27 KB)
- `reciente_top_lof.parquet` (41 KB)
- `reciente_top_montos_extremos.parquet` (19 KB)
- `reciente_top_proveedores_sospechosos.parquet` (63 KB)
- `sesnsp_anomalias_temporales.parquet` (23 KB)
- `sesnsp_cobertura_estados.parquet` (5 KB)
- `sesnsp_isoforest_agregados.parquet` (9 KB)
- `sesnsp_series_sospechosas.parquet` (17 KB)

### Reportes JSON en `ml/reports/`
- `01-reconocimiento.json`
- `02-historico-findings.json`
- `03-reciente-findings.json`
- `04-sesnsp-findings.json`
- `05-efos-findings.json`
- `06-cruces-findings.json`
- `07-consolidacion-findings.json`
- `09-temporal-findings.json`
- `10-clusters-findings.json`
- `11-textual-findings.json`
- `12-red-findings.json`
