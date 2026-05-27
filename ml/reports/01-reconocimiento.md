# Fase 1 — Reconocimiento de datasets

Perfilado de los 4 datasets granulares candidatos para ML no supervisado.

## `comprasmx_historico` — Contratos federales históricos 2010-2024

- **Filas:** 2,356,609
- **Columnas:** 16
- **Memoria:** 1036.09 MB

### Columnas

| Columna | dtype | nulls | % null | unique | resumen |
|---|---|---|---|---|---|
| `contrato_id` | str | 0 | 0.0% | 2,356,609 | 2376191: 1 | 89: 1 | 1756: 1 |
| `expediente_id` | str | 0 | 0.0% | 1,768,189 | 553734: 2167 | 1786843: 2023 | 193814: 940 |
| `ramo` | str | 0 | 0.0% | 24 | 1.Adquisiciones: 1312329 | 3.Servicios: 746412 | 4.Obra Pública 09012017: 129357 |
| `institucion` | object | 2,356,609 | 100.0% | 0 |  |
| `modalidad_raw` | str | 0 | 0.0% | 56 | 05. Adjudicación Directa LAASSP: 1234750 | V20151220 12. Adjudicación Directa Nacional Simplificada LAASSP: 204726 | V20151220 07. Adjudicación Directa Nacional Art. 42 LAASSP: 185619 |
| `modalidad` | str | 0 | 0.0% | 4 | AD: 1745065 | LP: 322988 | I3P: 233949 |
| `monto` | Float64 | 5,182 | 0.22% | 1,253,290 | min=0 p25=4e+04 med=1.2e+05 p75=4.8e+05 max=8.5e+10 | zeros=1473 neg=0 |
| `moneda` | str | 0 | 0.0% | 7 | MXN: 2331995 | USD: 22955 | EUR: 1122 |
| `fecha_firma` | datetime64[us] | 5,307 | 0.23% | 4,993 | rango: 1900-01-11 00:00:00 → 2024-12-01 00:00:00 |
| `proveedor` | str | 0 | 0.0% | 295,702 | Summa Company, S.A. de C.V.: 16271 | Farmaceuticos Maypo, S.A. de C.V.: 13904 | Marcas Nestle, S.A. de C.V.: 10719 |
| `rfc_proveedor` | object | 2,356,609 | 100.0% | 0 |  |
| `descripcion` | str | 0 | 0.0% | 1,347,171 | Servicios Profesionales — Servicios Profesionales: 17189 | Harina de Maiz — Compra Para Atender Requerimientos delPrograma de Abasto Rural: 9051 | Harina de Trigo — Compra Para Atender Requerimientos delPrograma de Abasto Rural: 6242 |
| `cve_ent` | object | 2,356,609 | 100.0% | 0 |  |
| `orden_gobierno` | str | 0 | 0.0% | 1 | FEDERAL_HIST: 2356609 |
| `ano` | Int64 | 5,307 | 0.23% | 19 | min=1.9e+03 p25=2e+03 med=2e+03 p75=2e+03 max=2e+03 | zeros=0 neg=0 |
| `primer_digito` | Int64 | 6,687 | 0.28% | 9 | min=1 p25=1 med=3 p75=5 max=9 | zeros=0 neg=0 |

## `comprasmx_contratos` — Contratos federales/estatales recientes 2024-2025

- **Filas:** 235,392
- **Columnas:** 16
- **Memoria:** 111.01 MB

### Columnas

| Columna | dtype | nulls | % null | unique | resumen |
|---|---|---|---|---|---|
| `contrato_id` | str | 0 | 0.0% | 235,392 | C-2024-00118295: 1 | C-2024-00103558: 1 | C-2024-00106413: 1 |
| `expediente_id` | str | 0 | 0.0% | 150,441 | E-2024-00113264: 3151 | E-2025-00038653: 2537 | E-2025-00040281: 2268 |
| `ramo` | str | 0 | 0.0% | 69 | INSTITUTO MEXICANO DEL SEGURO SOCIAL: 57829 | AGRICULTURA Y DESARROLLO RURAL: 28731 | SALUD: 24869 |
| `institucion` | str | 0 | 0.0% | 906 | INSTITUTO MEXICANO DEL SEGURO SOCIAL: 57829 | ALIMENTACIÓN PARA EL BIENESTAR, S.A. DE C.V.: 22869 | INSTITUTO DE SEGURIDAD Y SERVICIOS SOCIALES DE LOS TRABAJADORES DEL ESTADO: 10841 |
| `modalidad_raw` | str | 0 | 0.0% | 57 | ADJUDICACIÓN DIRECTA POR MONTOS MÁXIMOS POR EXCEPCIÓN: 55484 | LICITACIÓN PÚBLICA: 41495 | ADJUDICACIÓN DIRECTA POR URGENCIA Y EVENTUALIDAD: 25767 |
| `modalidad` | str | 0 | 0.0% | 4 | AD: 170199 | LP: 47513 | I3P: 14569 |
| `cve_ent` | str | 223,015 | 94.74% | 32 | 27: 1663 | 26: 1084 | 13: 1040 |
| `orden_gobierno` | str | 0 | 0.0% | 2 | FEDERAL: 223015 | ESTATAL: 12377 |
| `monto` | Float64 | 0 | 0.0% | 159,654 | min=0.001 p25=6e+04 med=1.9e+05 p75=7.2e+05 max=2.7e+10 | zeros=0 neg=0 |
| `moneda` | str | 0 | 0.0% | 6 | MXN: 233913 | USD: 1377 | EUR: 93 |
| `fecha_firma` | datetime64[us] | 135,427 | 57.53% | 80,428 | rango: 1981-04-10 00:00:00 → 2025-06-25 19:03:48 |
| `proveedor` | str | 0 | 0.0% | 49,983 | MOLINOS AZTECA SA DE CV: 1505 | ALEN DEL NORTE SA DE CV: 1205 | LICONSA SA DE CV: 1120 |
| `rfc_proveedor` | str | 0 | 0.0% | 50,010 | MAZ8111185X2: 1505 | ANX940223JQ0: 1205 | LIC950821M84: 1120 |
| `descripcion` | str | 0 | 0.0% | 109,227 | COMPRA PARA ATENDER REQUERIMIENTO DEL PROGRAMA DE ABASTO RURAL: 21576 | ATENDER LA SOLICITUD DE SERVICIOS VALUATORIO, JUSTIPRECIACIONES DE RENTA Y OTROS TRABAJOS VALUATORIO A NIVEL DE CONSULTORÍA QUE REQUIEREN LAS DEPENDENCIAS Y ENTIDADES DE LA ADMINISTRACIÓN PÚBLICA FEDERAL Y DEMÁS INSTITUCIONES PÚBLICAS.: 3716 | ADQUISICIÓN CONSOLIDADA DE VESTUARIO, UNIFORMES, CALZADO Y EQUIPO DE PROTECCIÓN: 1070 |
| `ano` | Int64 | 0 | 0.0% | 6 | min=0 p25=0 med=0 p75=2e+03 max=2e+03 | zeros=135427 neg=0 |
| `primer_digito` | Int64 | 33 | 0.01% | 9 | min=1 p25=1 med=3 p75=5 max=9 | zeros=0 neg=0 |

## `sesnsp_estatal` — Delitos estatales mensuales (SESNSP)

- **Filas:** 413,952
- **Columnas:** 9
- **Memoria:** 65.48 MB

### Columnas

| Columna | dtype | nulls | % null | unique | resumen |
|---|---|---|---|---|---|
| `cve_ent` | str | 0 | 0.0% | 32 | 01: 12936 | 02: 12936 | 03: 12936 |
| `estado` | str | 0 | 0.0% | 32 | Aguascalientes: 12936 | Baja California: 12936 | Baja California Sur: 12936 |
| `ano` | Int64 | 0 | 0.0% | 11 | min=2e+03 p25=2e+03 med=2e+03 p75=2e+03 max=2e+03 | zeros=0 neg=0 |
| `mes` | int64 | 0 | 0.0% | 12 | min=1 p25=3.8 med=6.5 p75=9.2 max=12 | zeros=0 neg=0 |
| `bien_juridico` | str | 0 | 0.0% | 7 | El patrimonio: 177408 | La vida y la Integridad corporal: 101376 | Otros bienes jurídicos afectados (del fuero común): 42240 |
| `tipo_delito` | str | 0 | 0.0% | 40 | Robo: 152064 | Homicidio: 38016 | Lesiones: 38016 |
| `subtipo` | str | 0 | 0.0% | 55 | Robo de vehículo automotor: 25344 | Robo de maquinaria: 25344 | Homicidio culposo: 21120 |
| `modalidad` | str | 0 | 0.0% | 59 | Con violencia: 50688 | Sin violencia: 50688 | Con arma de fuego: 21120 |
| `total` | int64 | 0 | 0.0% | 2,362 | min=0 p25=0 med=2 p75=26 max=1e+04 | zeros=178737 neg=0 |

## `sat_efos` — Contribuyentes en lista negra SAT (EFOS)

- **Filas:** 14,234
- **Columnas:** 7
- **Memoria:** 2.56 MB

### Columnas

| Columna | dtype | nulls | % null | unique | resumen |
|---|---|---|---|---|---|
| `rfc` | str | 0 | 0.0% | 14,055 | XXXXXXXXXXXX: 91 | CPE1212146D6: 3 | GEM1212044H2: 3 |
| `contribuyente` | string | 0 | 0.0% | 14,170 | Información suprimida en cumplimiento a la declaratoria de nulidad emitida por la Segunda Sala Regional Norte-Este del Estado de México del Tribunal Federal de Justicia Administrativa, en el expediente 5618/14-11-02-3-OT.: 17 | Información suprimida en cumplimiento a la ejecutoria dictada por el Primer Tribunal Colegiado de Circuito del Centro Auxiliar de la Primera Región, con residencia en la Ciudad de México en el Recurso de Revisión 488/2015, dentro del Juicio de Amparo 238/2014: 11 | Información suprimida en cumplimiento a la declaratoria de nulidad emitida por la Segunda Sala Regional Hidalgo México.: 8 |
| `estatus` | str | 0 | 0.0% | 4 | DEFINITIVO: 11270 | SENTENCIA_FAVORABLE: 1638 | PRESUNTO: 986 |
| `fecha_presuncion` | datetime64[ms] | 0 | 0.0% | 143 | rango: 2014-01-10 00:00:00 → 2025-12-16 00:00:00 |
| `fecha_publicacion` | datetime64[ms] | 0 | 0.0% | 327 | rango: 2014-01-10 00:00:00 → 2025-12-16 00:00:00 |
| `fuente_url` | str | 0 | 0.0% | 1 | http://omawww.sat.gob.mx/cifras_sat/Documents/Listado_Completo_69-B.csv: 14234 |
| `snapshot_fecha` | datetime64[ms] | 0 | 0.0% | 1 | rango: 2026-05-08 00:00:00 → 2026-05-08 00:00:00 |
