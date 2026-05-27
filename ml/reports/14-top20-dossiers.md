# TOP 20 — Validación contextual de contratos robustos

Cada caso integra: tier de robustez, contexto político, trayectoria del proveedor,
cruce EFOS, concentración institucional, flags y interpretación heurística.

**Fecha análisis:** 2026-05-27  
**Casos auditados:** 20

---

## #1 — QUIMICA INDUSTRIAL DEL AGUA SA DE CV

**Tier:** `reciente_3flags` | **Dataset:** `reciente` | **Contrato ID:** `C-2024-00098133`

### Datos del contrato
- **Monto:** $83,697.67 MXN
- **Año:** 2024 (AMLO (2018-2024)) — **AÑO ELECTORAL**
- **Fecha firma:** 2024-08-04
- **Institución:** INSTITUTO MEXICANO DEL SEGURO SOCIAL
- **Ramo:** INSTITUTO MEXICANO DEL SEGURO SOCIAL
- **Modalidad:** `I3P` (INVITACIÓN A CUANDO MENOS 3 PERSONAS POR MONTOS MÁXIMOS POR EXCEPCIÓN)
- **Descripción:** 006-2024 OTROS PRODUCTOS QUÍMICOS

### Trayectoria del proveedor
- Total contratos a lo largo del tiempo: **20**
- Monto acumulado: **$5,269,526 MXN**
- Años activos: 0–2025 (3 años distintos)
- Instituciones cliente (reciente): 5
- % Adjudicación Directa acumulado: **55%**
- Cluster tipológico: `estandar`

### Concentración institución
- HHI: **0.007** (1.0=monopolio puro)
- Top proveedor concentra: 4% del gasto

### Flags detectados
- ✓ `flag_isoforest`
- ✓ `flag_lof`
- ✓ `flag_dbscan_noise`

### Interpretación
> Sin patrón claro de alto riesgo aparente

---

## #2 — BECTON DICKINSON DE MEXICO SA DE CV

**Tier:** `reciente_3flags` | **Dataset:** `reciente` | **Contrato ID:** `C-2025-00012153`

### Datos del contrato
- **Monto:** $1,378,922,755.44 MXN
- **Año:** 2025 (Sheinbaum (2024-))
- **Fecha firma:** 2025-02-24
- **Institución:** INSTITUTO MEXICANO DEL SEGURO SOCIAL
- **Ramo:** INSTITUTO MEXICANO DEL SEGURO SOCIAL
- **Modalidad:** `LP` (LICITACIÓN PÚBLICA)
- **Descripción:** COMPRA CONSOLIDADA DE MEDICAMENTOS, BIENES TERAPÉUTICOS, MATERIAL DE CURACIÓN..

### Trayectoria del proveedor
- Total contratos a lo largo del tiempo: **229**
- Monto acumulado: **$4,054,493,472 MXN**
- Años activos: 0–2025 (3 años distintos)
- Instituciones cliente (reciente): 23
- % Adjudicación Directa acumulado: **63%**
- Cluster tipológico: `anomalia_jumps`

### Concentración institución
- HHI: **0.007** (1.0=monopolio puro)
- Top proveedor concentra: 4% del gasto

### Flags detectados
- ✓ `flag_monto_extremo`
- ✓ `flag_isoforest`
- ✓ `flag_dbscan_noise`

### Interpretación
> Cluster tipológico: ANOMALÍA POR JUMPS de monto

---

## #3 — NOVAG INFANCIA SA DE CV

**Tier:** `reciente_3flags` | **Dataset:** `reciente` | **Contrato ID:** `C-2025-00011452`

### Datos del contrato
- **Monto:** $1,109,402,928.80 MXN
- **Año:** 2025 (Sheinbaum (2024-))
- **Fecha firma:** 2025-02-24
- **Institución:** INSTITUTO MEXICANO DEL SEGURO SOCIAL
- **Ramo:** INSTITUTO MEXICANO DEL SEGURO SOCIAL
- **Modalidad:** `LP` (LICITACIÓN PÚBLICA)
- **Descripción:** COMPRA CONSOLIDADA DE MEDICAMENTOS, BIENES TERAPÉUTICOS, MATERIAL DE CURACIÓN

### Trayectoria del proveedor
- Total contratos a lo largo del tiempo: **128**
- Monto acumulado: **$2,785,140,510 MXN**
- Años activos: 0–2025 (2 años distintos)
- Instituciones cliente (reciente): 21
- % Adjudicación Directa acumulado: **58%**
- Cluster tipológico: `anomalia_jumps`

### Concentración institución
- HHI: **0.007** (1.0=monopolio puro)
- Top proveedor concentra: 4% del gasto

### Flags detectados
- ✓ `flag_monto_extremo`
- ✓ `flag_isoforest`
- ✓ `flag_dbscan_noise`

### Interpretación
> Proveedor de aparición breve con monto alto — patrón one-shot | Cluster tipológico: ANOMALÍA POR JUMPS de monto

---

## #4 — CONSORCIO HOSPITALARIO SA DE CV

**Tier:** `reciente_3flags` | **Dataset:** `reciente` | **Contrato ID:** `C-2024-00111241`

### Datos del contrato
- **Monto:** $10,688.06 MXN
- **Año:** 2024 (AMLO (2018-2024)) — **AÑO ELECTORAL**
- **Fecha firma:** 2024-08-11
- **Institución:** INSTITUTO MEXICANO DEL SEGURO SOCIAL
- **Ramo:** INSTITUTO MEXICANO DEL SEGURO SOCIAL
- **Modalidad:** `I3P` (INVITACIÓN A CUANDO MENOS 3 PERSONAS POR MONTOS MÁXIMOS POR EXCEPCIÓN)
- **Descripción:** MATERIAL DE CURACION

### Trayectoria del proveedor
- Total contratos a lo largo del tiempo: **397**
- Monto acumulado: **$35,680,414 MXN**
- Años activos: 0–2025 (3 años distintos)
- Instituciones cliente (reciente): 6
- % Adjudicación Directa acumulado: **94%**
- Cluster tipológico: `anomalia_jumps`

### Concentración institución
- HHI: **0.007** (1.0=monopolio puro)
- Top proveedor concentra: 4% del gasto

### Flags detectados
- ✓ `flag_isoforest`
- ✓ `flag_lof`
- ✓ `flag_dbscan_noise`

### Interpretación
> Proveedor con 93% AD acumulado — patrón sistemático | Cluster tipológico: ANOMALÍA POR JUMPS de monto

---

## #5 — PEGSA CONSTRUCCIONES SA DE CV

**Tier:** `reciente_top_monto` | **Dataset:** `reciente` | **Contrato ID:** `C-2025-00078891`

### Datos del contrato
- **Monto:** $7,967,575,909.86 MXN
- **Año:** 0 (Calderón (2006-2012))
- **Fecha firma:** NaT
- **Institución:** ADMINISTRACION DEL SISTEMA PORTUARIO NACIONAL DOS BOCAS, S.A. DE C.V.
- **Ramo:** MARINA
- **Modalidad:** `AD` (ADJUDICACIÓN DIRECTA POR PERDIDAS ADICIONALES JUSTIFICADAS)
- **Descripción:** CONSTRUCCIÓN DE LA AMPLIACIÓN DEL PUERTO DE DOS BOCAS (OBRAS DE PROTECCIÓN ETAPA FINAL).

### Trayectoria del proveedor
- Total contratos a lo largo del tiempo: **5**
- Monto acumulado: **$8,994,543,212 MXN**
- Años activos: 0–2025 (3 años distintos)
- Instituciones cliente (reciente): 3
- % Adjudicación Directa acumulado: **60%**
- Cluster tipológico: `estandar`

### Concentración institución
- HHI: **0.821** (1.0=monopolio puro)
- Top proveedor concentra: 90% del gasto

### Flags detectados
- ✓ `flag_monto_extremo`
- ✓ `flag_dbscan_noise`

### Interpretación
> Monto extremo (8.0 mil M MXN) | Adjudicación Directa con monto >1 mil M — alto riesgo procedimental | Institución con HHI=0.82 — concentración alta

---

## #6 — MOTA-ENGIL MEXICO S A P I DE CV

**Tier:** `reciente_top_monto` | **Dataset:** `reciente` | **Contrato ID:** `C-2025-00090363`

### Datos del contrato
- **Monto:** $6,579,444,251.17 MXN
- **Año:** 0 (Calderón (2006-2012))
- **Fecha firma:** NaT
- **Institución:** AGENCIA REGULADORA DEL TRANSPORTE FERROVIARIO
- **Ramo:** INFRAESTRUCTURA, COMUNICACIONES Y TRANSPORTES
- **Modalidad:** `LP` (LICITACIÓN PÚBLICA)
- **Descripción:** CONSTRUCCIÓN Y DISEÑO DE 30.30 KM DEL TRAMO I FERROVIARIO DEL TREN DE PASAJEROS QUERÉTARO-IRAPUATO, TRAMO: QUERÉTARO ZONA INDUSTRIAL - APASEO EL GRANDE ZONA INDUSTRIAL, SUBTRAMO DEL KM 6+000 AL KM 36+300. INCLUYE LA CONSTRUCCIÓN DE VIADUCTOS

### Trayectoria del proveedor
- Total contratos a lo largo del tiempo: **2**
- Monto acumulado: **$6,599,991,041 MXN**
- Años activos: 0–0 (1 años distintos)
- Instituciones cliente (reciente): 2
- % Adjudicación Directa acumulado: **50%**

### Concentración institución
- HHI: **0.422** (1.0=monopolio puro)
- Top proveedor concentra: 58% del gasto

### Flags detectados
- ✓ `flag_monto_extremo`
- ✓ `flag_dbscan_noise`

### Interpretación
> Monto extremo (6.6 mil M MXN) | Proveedor de aparición breve con monto alto — patrón one-shot

---

## #7 — ASTRAZENECA SA DE CV

**Tier:** `reciente_top_monto` | **Dataset:** `reciente` | **Contrato ID:** `C-2025-00051213`

### Datos del contrato
- **Monto:** $5,651,319,147.84 MXN
- **Año:** 2025 (Sheinbaum (2024-))
- **Fecha firma:** 2025-06-23
- **Institución:** INSTITUTO MEXICANO DEL SEGURO SOCIAL
- **Ramo:** INSTITUTO MEXICANO DEL SEGURO SOCIAL
- **Modalidad:** `AD` (ADJUDICACIÓN DIRECTA POR CASO FORTUITO O FUERZA MAYOR)
- **Descripción:** COMPRA DE LAS CLAVES NECESARIAS PARA EL SECTOR SALUD

### Trayectoria del proveedor
- Total contratos a lo largo del tiempo: **100**
- Monto acumulado: **$12,985,102,072 MXN**
- Años activos: 0–2025 (4 años distintos)
- Instituciones cliente (reciente): 20
- % Adjudicación Directa acumulado: **72%**
- Cluster tipológico: `anomalia_jumps`

### Concentración institución
- HHI: **0.007** (1.0=monopolio puro)
- Top proveedor concentra: 4% del gasto

### Flags detectados
- ✓ `flag_monto_extremo`
- ✓ `flag_dbscan_noise`

### Interpretación
> Monto extremo (5.7 mil M MXN) | Adjudicación Directa con monto >1 mil M — alto riesgo procedimental | Cluster tipológico: ANOMALÍA POR JUMPS de monto

---

## #8 — TRIARA.COM SA DE CV

**Tier:** `reciente_top_monto` | **Dataset:** `reciente` | **Contrato ID:** `C-2025-00040159`

### Datos del contrato
- **Monto:** $4,449,858,483.00 MXN
- **Año:** 2025 (Sheinbaum (2024-))
- **Fecha firma:** 2025-01-14
- **Institución:** BANCO DEL BIENESTAR S.N.C., I.B.D.
- **Ramo:** HACIENDA Y CRÉDITO PÚBLICO
- **Modalidad:** `AD` (ADJUDICACIÓN DIRECTA POR ADJUDICACIÓN A PROVEEDOR CON CONTRATO VIGENTE, BAJO LAS MISMAS CONDICIONES)
- **Descripción:** SERVICIO INTEGRAL ADMINISTRADO DE CENTRO DE DATOS PARA EL BANCO DEL BIENESTAR

### Trayectoria del proveedor
- Total contratos a lo largo del tiempo: **75**
- Monto acumulado: **$4,838,113,708 MXN**
- Años activos: 0–2025 (3 años distintos)
- Instituciones cliente (reciente): 43
- % Adjudicación Directa acumulado: **60%**
- Cluster tipológico: `anomalia_jumps`

### Concentración institución
- HHI: **0.428** (1.0=monopolio puro)
- Top proveedor concentra: 63% del gasto

### Flags detectados
- ✓ `flag_monto_extremo`
- ✓ `flag_dbscan_noise`

### Interpretación
> Adjudicación Directa con monto >1 mil M — alto riesgo procedimental | Cluster tipológico: ANOMALÍA POR JUMPS de monto

---

## #9 — NOVARTIS FARMACEUTICA SA DE CV

**Tier:** `reciente_top_monto` | **Dataset:** `reciente` | **Contrato ID:** `C-2025-00016667`

### Datos del contrato
- **Monto:** $3,745,771,738.35 MXN
- **Año:** 2025 (Sheinbaum (2024-))
- **Fecha firma:** 2025-03-06
- **Institución:** INSTITUTO MEXICANO DEL SEGURO SOCIAL
- **Ramo:** INSTITUTO MEXICANO DEL SEGURO SOCIAL
- **Modalidad:** `AD` (ADJUDICACIÓN DIRECTA POR PATENTES, LICENCIAS, OFERENTE ÚNICO U OBRAS DE ARTE)
- **Descripción:** COMPRA CONSOLIDADA DE MEDICAMENTOS (PATENTES)F4 PARA LOS EJERCICIOS 2025-2026

### Trayectoria del proveedor
- Total contratos a lo largo del tiempo: **138**
- Monto acumulado: **$8,975,126,647 MXN**
- Años activos: 0–2025 (4 años distintos)
- Instituciones cliente (reciente): 17
- % Adjudicación Directa acumulado: **82%**
- Cluster tipológico: `anomalia_jumps`

### Concentración institución
- HHI: **0.007** (1.0=monopolio puro)
- Top proveedor concentra: 4% del gasto

### Flags detectados
- ✓ `flag_monto_extremo`
- ✓ `flag_dbscan_noise`

### Interpretación
> Adjudicación Directa con monto >1 mil M — alto riesgo procedimental | Cluster tipológico: ANOMALÍA POR JUMPS de monto

---

## #10 — INTEGRA ARRENDA SA DE CV SOFOM ENR

**Tier:** `reciente_top_monto` | **Dataset:** `reciente` | **Contrato ID:** `C-2025-00006673`

### Datos del contrato
- **Monto:** $3,641,577,670.08 MXN
- **Año:** 2024 (AMLO (2018-2024)) — **AÑO ELECTORAL**
- **Fecha firma:** 2024-01-01
- **Institución:** SECRETARIA DE BIENESTAR
- **Ramo:** BIENESTAR
- **Modalidad:** `AD` (ADJUDICACIÓN DIRECTA POR MONTOS MÁXIMOS POR EXCEPCIÓN)
- **Descripción:** SERVICIO DE ARRENDAMIENTO TRANSPORTE VEHICULAR TERRESTRE DENTRO DEL TERRITORIO NACIONAL, PARA LA SECRETARÍA DE BIENESTAR

### Trayectoria del proveedor
- Total contratos a lo largo del tiempo: **40**
- Monto acumulado: **$8,966,471,457 MXN**
- Años activos: 0–2025 (3 años distintos)
- Instituciones cliente (reciente): 32
- % Adjudicación Directa acumulado: **50%**
- Cluster tipológico: `anomalia_jumps`

### Concentración institución
- HHI: **0.256** (1.0=monopolio puro)
- Top proveedor concentra: 49% del gasto

### Flags detectados
- ✓ `flag_monto_extremo`
- ✓ `flag_dbscan_noise`

### Interpretación
> Adjudicación Directa con monto >1 mil M — alto riesgo procedimental | Año electoral (2024) + AD — patrón temporal sensible | Cluster tipológico: ANOMALÍA POR JUMPS de monto

---

## #11 — Mota-Engil México S.A.P.I. de C.V.

**Tier:** `historico_5flags` | **Dataset:** `historico` | **Contrato ID:** `2695102`

### Datos del contrato
- **Monto:** $4,023,658,804.00 MXN
- **Año:** 2022 (AMLO (2018-2024))
- **Fecha firma:** 2022-02-23
- **Institución:** None
- **Ramo:** 4.Obra Pública
- **Modalidad:** `AD` (06. Adjudicación Directa LOPSRM)
- **Descripción:** Ad Elaboración delProyecto Ejecutivo, Suministro de Materiales Construcción De — Elaboración delProyecto Ejecutivo, Suministro de Materiales Construcción de la Plataforma y Vía delTren Maya y Las Adecuaciones Carreteras, Correspondiente Al Tramo Comprendido Entre la Localidad de Chiná, Al Sur de la 

### Trayectoria del proveedor
- Total contratos a lo largo del tiempo: **1**
- Monto acumulado: **$4,023,658,804 MXN**
- Años activos: 2022–2022 (1 años distintos)
- Instituciones cliente (reciente): 0
- % Adjudicación Directa acumulado: **100%**

### Flags detectados
- ✓ `flag_monto_extremo`
- ✓ `flag_isoforest`
- ✓ `flag_lof`
- ✓ `flag_proveedor_alto_score`
- ✓ `flag_temporal_jump`

### Interpretación
> Adjudicación Directa con monto >1 mil M — alto riesgo procedimental | Proveedor con 100% AD acumulado — patrón sistemático | Proveedor de aparición breve con monto alto — patrón one-shot

---

## #12 — Agroasemex Sa

**Tier:** `historico_5flags` | **Dataset:** `historico` | **Contrato ID:** `2912714`

### Datos del contrato
- **Monto:** $1,906,679,760.34 MXN
- **Año:** 2023 (AMLO (2018-2024))
- **Fecha firma:** 2023-01-01
- **Institución:** None
- **Ramo:** 3.Servicios
- **Modalidad:** `OTRA` (10. Contratos entre entes públicos)
- **Descripción:** Contratación Consolidada delServicio de Aseguramiento de Bienes Patrimoniales Para Las Dependencias y Entidades de la Administración Pública Federal Para Los Ejercicios Fiscales 2023 y 2024 — Contratación Consolidada delServicio de Aseguramiento de Bienes Patrimoniales Para Las Dependencias y Entida

### Trayectoria del proveedor
- Total contratos a lo largo del tiempo: **276**
- Monto acumulado: **$16,690,878,810 MXN**
- Años activos: 2016–2024 (9 años distintos)
- Instituciones cliente (reciente): 0
- % Adjudicación Directa acumulado: **7%**

### Flags detectados
- ✓ `flag_monto_extremo`
- ✓ `flag_isoforest`
- ✓ `flag_lof`
- ✓ `flag_proveedor_alto_score`
- ✓ `flag_temporal_jump`

### Interpretación
> Sin patrón claro de alto riesgo aparente

---

## #13 — Ozore Gestion de Agua Sa de Cv

**Tier:** `historico_5flags` | **Dataset:** `historico` | **Contrato ID:** `2758718`

### Datos del contrato
- **Monto:** $1,688,698,686.51 MXN
- **Año:** 2022 (AMLO (2018-2024))
- **Fecha firma:** 2022-05-09
- **Institución:** None
- **Ramo:** 6. Programas y Proyectos de Inversión - Obra Pública
- **Modalidad:** `AD` (06. Adjudicación Directa LOPSRM)
- **Descripción:** Construcción y Suministro, Instalación y Prueba de Equipamiento de Planta Potabi — Construcción y Suministro, Instalación y Prueba de Equipamiento de Planta Potabilizadora delTipo Coagulación Convencional Para Una Capacidad de 6.34 M³/Seg: Caja de Llegada; Floculador; Sedimentador; Batería de Filtro

### Trayectoria del proveedor
- Total contratos a lo largo del tiempo: **1**
- Monto acumulado: **$1,688,698,687 MXN**
- Años activos: 2022–2022 (1 años distintos)
- Instituciones cliente (reciente): 0
- % Adjudicación Directa acumulado: **100%**

### Flags detectados
- ✓ `flag_monto_extremo`
- ✓ `flag_isoforest`
- ✓ `flag_lof`
- ✓ `flag_proveedor_alto_score`
- ✓ `flag_temporal_jump`

### Interpretación
> Adjudicación Directa con monto >1 mil M — alto riesgo procedimental | Proveedor con 100% AD acumulado — patrón sistemático | Proveedor de aparición breve con monto alto — patrón one-shot

---

## #14 — Laboratorios Pisa S.A. de C.V.

**Tier:** `historico_5flags` | **Dataset:** `historico` | **Contrato ID:** `2665739`

### Datos del contrato
- **Monto:** $1,299,280,281.46 MXN
- **Año:** 2022 (AMLO (2018-2024))
- **Fecha firma:** 2022-01-01
- **Institución:** None
- **Ramo:** 1.Adquisiciones
- **Modalidad:** `OTRA` (08. Reporte de otras contrataciones y contrataciones con crédito externo)
- **Descripción:** La-012M7B998-E165-2021 Consolidada Medicamentos Insabi — Meicamentos

### Trayectoria del proveedor
- Total contratos a lo largo del tiempo: **6,359**
- Monto acumulado: **$28,014,135,204 MXN**
- Años activos: 2010–2024 (15 años distintos)
- Instituciones cliente (reciente): 0
- % Adjudicación Directa acumulado: **76%**

### Flags detectados
- ✓ `flag_monto_extremo`
- ✓ `flag_isoforest`
- ✓ `flag_lof`
- ✓ `flag_proveedor_alto_score`
- ✓ `flag_temporal_jump`

### Interpretación
> Sin patrón claro de alto riesgo aparente

---

## #15 — Edenred Mexico Sa de Cv

**Tier:** `historico_5flags` | **Dataset:** `historico` | **Contrato ID:** `2936841`

### Datos del contrato
- **Monto:** $1,292,922,345.43 MXN
- **Año:** 2023 (AMLO (2018-2024))
- **Fecha firma:** 2023-01-01
- **Institución:** None
- **Ramo:** 3.Servicios
- **Modalidad:** `OTRA` (08. Reporte de otras contrataciones y contrataciones con crédito externo)
- **Descripción:** Contratación Consolidada Para el Suministro de Combustible Para Vehículos Automotores Terrestres En Territorio Nacional — Contratación Consolidada Para el Suministro de Combustible Para Vehículos Automotores Terrestres En Territorio Nacional, Mediante el Servicio de Medios de Pago Electrónicos, Para

### Trayectoria del proveedor
- Total contratos a lo largo del tiempo: **2,285**
- Monto acumulado: **$30,459,914,548 MXN**
- Años activos: 2010–2024 (15 años distintos)
- Instituciones cliente (reciente): 0
- % Adjudicación Directa acumulado: **42%**

### Flags detectados
- ✓ `flag_monto_extremo`
- ✓ `flag_isoforest`
- ✓ `flag_lof`
- ✓ `flag_proveedor_alto_score`
- ✓ `flag_temporal_jump`

### Interpretación
> Sin patrón claro de alto riesgo aparente

---

## #16 — Agroasemex Sa

**Tier:** `historico_5flags` | **Dataset:** `historico` | **Contrato ID:** `2924248`

### Datos del contrato
- **Monto:** $1,091,089,170.24 MXN
- **Año:** 2023 (AMLO (2018-2024))
- **Fecha firma:** 2023-01-01
- **Institución:** None
- **Ramo:** 3.Servicios
- **Modalidad:** `AD` (05. Adjudicación Directa LAASSP)
- **Descripción:** Servicio de Aseguramiento de Bienes Patrimoniales Para Las Dependencias y Entidades de la Administracion Publica Federal Ejercicio Fiscal 2023-2024 — Servicio de Aseguramiento de Bienes Patrimoniales Para Las Dependencias y Entidades de la Administracion Publica Federal Ejercicio Fiscal 2023-2024

### Trayectoria del proveedor
- Total contratos a lo largo del tiempo: **276**
- Monto acumulado: **$16,690,878,810 MXN**
- Años activos: 2016–2024 (9 años distintos)
- Instituciones cliente (reciente): 0
- % Adjudicación Directa acumulado: **7%**

### Flags detectados
- ✓ `flag_monto_extremo`
- ✓ `flag_isoforest`
- ✓ `flag_lof`
- ✓ `flag_proveedor_alto_score`
- ✓ `flag_temporal_jump`

### Interpretación
> Adjudicación Directa con monto >1 mil M — alto riesgo procedimental

---

## #17 — Guarderia Reino Infantil Sc

**Tier:** `historico_5flags` | **Dataset:** `historico` | **Contrato ID:** `2945058`

### Datos del contrato
- **Monto:** $84,092,238.00 MXN
- **Año:** 2023 (AMLO (2018-2024))
- **Fecha firma:** 2023-01-02
- **Institución:** None
- **Ramo:** 3.Servicios
- **Modalidad:** `AD` (05. Adjudicación Directa LAASSP)
- **Descripción:** Aa-050Gyr031-E477-2022 Servicio de Guarderias En Esquema Vecinal Comunitario Unico (Mimr) — Servicio de Guarderias En Esquema Vecinal Comunitario Unico

### Trayectoria del proveedor
- Total contratos a lo largo del tiempo: **1**
- Monto acumulado: **$84,092,238 MXN**
- Años activos: 2023–2023 (1 años distintos)
- Instituciones cliente (reciente): 0
- % Adjudicación Directa acumulado: **100%**

### Flags detectados
- ✓ `flag_isoforest`
- ✓ `flag_lof`
- ✓ `flag_proveedor_alto_score`
- ✓ `flag_benford_anomalo`
- ✓ `flag_temporal_jump`

### Interpretación
> Proveedor con 100% AD acumulado — patrón sistemático | Proveedor de guarderías — vinculado al programa de subrogación IMSS, históricamente problemático

---

## #18 — Guarderia My Happy Baby Sc

**Tier:** `historico_5flags` | **Dataset:** `historico` | **Contrato ID:** `2949183`

### Datos del contrato
- **Monto:** $80,836,603.00 MXN
- **Año:** 2023 (AMLO (2018-2024))
- **Fecha firma:** 2023-01-02
- **Institución:** None
- **Ramo:** 3.Servicios
- **Modalidad:** `AD` (05. Adjudicación Directa LAASSP)
- **Descripción:** Proceso de Contratación Para la Continuidad delServicio de Guardería 2023-2027 — Contrato:Ccga222921050088, Adjudicación Directa Nacional, Electrónica, Número Aa-050Gyr018-E1078-2022, Que Efectúa el Órgano de Operación Administrativa Desconcentrada Regional Tamaulipas, Para el Proceso de Contratació

### Trayectoria del proveedor
- Total contratos a lo largo del tiempo: **1**
- Monto acumulado: **$80,836,603 MXN**
- Años activos: 2023–2023 (1 años distintos)
- Instituciones cliente (reciente): 0
- % Adjudicación Directa acumulado: **100%**

### Flags detectados
- ✓ `flag_isoforest`
- ✓ `flag_lof`
- ✓ `flag_proveedor_alto_score`
- ✓ `flag_benford_anomalo`
- ✓ `flag_temporal_jump`

### Interpretación
> Proveedor con 100% AD acumulado — patrón sistemático | Proveedor de guarderías — vinculado al programa de subrogación IMSS, históricamente problemático

---

## #19 — Centinela de Orientacion y Apoyo Sa de Cv

**Tier:** `historico_5flags` | **Dataset:** `historico` | **Contrato ID:** `2945108`

### Datos del contrato
- **Monto:** $80,195,040.00 MXN
- **Año:** 2023 (AMLO (2018-2024))
- **Fecha firma:** 2023-01-02
- **Institución:** None
- **Ramo:** 3.Servicios
- **Modalidad:** `AD` (05. Adjudicación Directa LAASSP)
- **Descripción:** Aa-050Gyr031-E477-2022 Servicio de Guarderias En Esquema Vecinal Comunitario Unico (Mimr) — Servicio de Guarderias En Esquema Vecinal Comunitario Unico

### Trayectoria del proveedor
- Total contratos a lo largo del tiempo: **1**
- Monto acumulado: **$80,195,040 MXN**
- Años activos: 2023–2023 (1 años distintos)
- Instituciones cliente (reciente): 0
- % Adjudicación Directa acumulado: **100%**

### Flags detectados
- ✓ `flag_isoforest`
- ✓ `flag_lof`
- ✓ `flag_proveedor_alto_score`
- ✓ `flag_benford_anomalo`
- ✓ `flag_temporal_jump`

### Interpretación
> Proveedor con 100% AD acumulado — patrón sistemático

---

## #20 — Seguridad y Consultoria Manzanillo Secoma Sc

**Tier:** `historico_5flags` | **Dataset:** `historico` | **Contrato ID:** `1162`

### Datos del contrato
- **Monto:** $96,000.00 MXN
- **Año:** 2011 (Calderón (2006-2012))
- **Fecha firma:** 2011-01-01
- **Institución:** None
- **Ramo:** SERVICIOS_1
- **Modalidad:** `AD` (V20151220 12. Adjudicación Directa Nacional Simplificada LAASSP)
- **Descripción:** Limpieza Sucursal Manzanillo — Limpieza Sucursal Manzanillo

### Trayectoria del proveedor
- Total contratos a lo largo del tiempo: **14**
- Monto acumulado: **$53,306,298 MXN**
- Años activos: 2011–2016 (5 años distintos)
- Instituciones cliente (reciente): 0
- % Adjudicación Directa acumulado: **79%**

### Flags detectados
- ✓ `flag_isoforest`
- ✓ `flag_lof`
- ✓ `flag_proveedor_alto_score`
- ✓ `flag_benford_anomalo`
- ✓ `flag_temporal_jump`

### Interpretación
> Sin patrón claro de alto riesgo aparente

---
