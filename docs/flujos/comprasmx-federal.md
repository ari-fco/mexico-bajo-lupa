# Flujo · ComprasMX federal (contratos APF 2024-25)

> El corazón del análisis forense del proyecto. De aquí salen el
> ranking de dependencias federales por Benford MAD, el % de
> adjudicación directa global, y el cruce con SAT 69-B EFOS.

## Diagrama end-to-end

```mermaid
flowchart TD
    A[ComprasMX · Plataforma Digital<br/>ex-CompraNet<br/>comprasmx.buengobierno.gob.mx]
    B1[(Contratos_CompraNet2024.csv<br/>143,542 contratos)]
    B2[(Contratos_CompraNet2025.csv<br/>91,850 contratos)]
    C[etl/comprasmx.py<br/>read_csv latin-1<br/>columnas reales<br/>Importe DRC Institucion etc]
    D[Normalizar montos<br/>Importe DRC vs Maximo<br/>filtrar &gt; 0]
    E[Separar FEDERAL vs ESTATAL<br/>Tipo de Procedimiento<br/>Tipo de Contrato]
    F[(data/processed/<br/>comprasmx_contratos.parquet<br/>235,392 filas total<br/>223k FED + 12k EST)]
    G[etl/build_metrics.py]
    G1[Benford por dependencia<br/>primer dígito por institución<br/>MAD Nigrini]
    G2[% AD por dependencia<br/>group by institucion<br/>filtrar &gt;= 30 contratos]
    G3[Ramo presupuestal<br/>resolver institucion → ramo]
    H[(dependencias_riesgo.parquet<br/>236 filas)]
    H2[(benford_nacional.parquet<br/>9 filas · primer dígito 1-9)]
    I[/anomalias<br/>/efos<br/>banner home]

    A --> B1
    A --> B2
    B1 --> C
    B2 --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> G1
    G --> G2
    G --> G3
    G1 --> H
    G2 --> H
    G3 --> H
    G1 --> H2
    H --> I
    H2 --> I
```

## Fuente

- **Oficial**: [comprasmx.buengobierno.gob.mx](https://comprasmx.buengobierno.gob.mx/)
- **Sistema**: "Plataforma Digital de Contrataciones Públicas",
  sucesor de CompraNet desde 2024.
- **Cobertura**: 2024-25 (sistema actual). Para el archivo
  histórico 2010-2022 ver el flujo
  [CompraNet 5.0 histórico](comprasmx-historico.md).

## Schema del CSV

Las columnas reales del CSV (verificadas contra el archivo):

| Columna | Tipo | Notas |
|---|---|---|
| `Codigo del contrato` | str | identificador único |
| `Titulo del contrato` | str | descripción corta |
| `Tipo de Procedimiento` | str | "AD" (adjudicación directa), "LP" (licitación pública), "I3P" (invitación 3), etc. |
| `Tipo de Contratacion` | str | "Servicios", "Adquisiciones", etc. |
| `Institucion` | str | dependencia federal o estatal |
| `Importe DRC` | float | importe del contrato (pesos) |
| `Fecha firma contrato` | date | fecha de firma |
| `Razón social del proveedor` | str | |
| `RFC del proveedor` | str | clave única, usada para cruce con SAT |

## Schema del Parquet (`comprasmx_contratos.parquet`)

| Columna | Tipo | Descripción |
|---|---|---|
| `codigo` | str | |
| `titulo` | str | |
| `tipo_procedimiento` | str | AD, LP, I3P, OS, otros |
| `tipo_contratacion` | str | |
| `institucion` | str | normalizada |
| `importe` | float | en pesos, filtrado > 0 |
| `fecha_firma` | date | nullable (~57% de los contratos no tienen fecha exacta) |
| `proveedor` | str | razón social |
| `rfc` | str | RFC normalizado para cruce |
| `ambito` | str | `"FEDERAL"` o `"ESTATAL"` |
| `cve_ent` | str | solo para los `ESTATAL` |
| `ano` | int | derivado de fecha_firma o reporte |

**Volumen**: 235,392 contratos = 223,015 federales + 12,377 estatales.

## Decisiones clave del ETL

1. **Latin-1 obligatorio**: el CSV oficial mexicano usa latin-1.
   Si lo leés con UTF-8 explota con caracteres acentuados.
2. **`Importe DRC` (Declarado) vs `Importe Maximo`**: usamos
   DRC porque es el monto **realmente ejercido**; el "Máximo"
   son montos contractuales tope que no necesariamente se gastan.
3. **Filtrar `importe > 0`**: hay contratos con monto cero
   (cancelados, anexos sin valor). Se descartan para que no
   ensucien el análisis de Benford.
4. **Separar FEDERAL vs ESTATAL**: el campo
   `Tipo de Procedimiento` o `Institucion` permite clasificar.
   ~95% son federales (APF), ~5% son estatales operando en
   ComprasMX. Los dos subsets se analizan distinto (ver el flujo
   [estatal](comprasmx-estatal.md)).
5. **Ramo presupuestal a posteriori**: el CSV trae `institucion`
   pero no `ramo`. Resolvemos por diccionario en
   `build_metrics.py` (ej. "Pemex" → "Energía", "SEDENA" → "Defensa").

## Cómo se construye el ranking de `/anomalias`

1. **Por institución**, agregar todos los contratos
   federales (`ambito = "FEDERAL"`) con `importe > 0`.
2. **Filtrar `>= 30 contratos`** para entrar al ranking (filtro de
   relevancia editorial).
3. **% AD**: ratio de contratos con
   `tipo_procedimiento = "AD"` sobre el total.
4. **Benford MAD**:
   1. Extraer primer dígito significativo de cada `importe`.
   2. Distribución observada (% por dígito 1-9).
   3. Distribución esperada Benford `log10(1 + 1/d)`.
   4. MAD = `(1/9) · Σ |observado - esperado|`.
   5. Solo válido con **≥300 contratos** — bajo ese umbral
      Benford no aplica (ver `metodologia/page.tsx`).
5. **Score compuesto**: combina AD% y MAD según
   `metodologia/page.tsx` block 05.

Resultado: `dependencias_riesgo.parquet` con 236 dependencias.

## Cifras del sitio que salen de este flujo

| Cifra | Dónde aparece |
|---|---|
| **Sistema Público de Radiodifusión MAD 0.0842** (top) | banner home, `/anomalias` |
| **Top 5 Benford MAD** (con SPR primero) | `/anomalias` |
| **AD% federal global ~73.9%** | README |
| **200+ dependencias federales analizadas** | README, OG image |

## Cómo verificar

```python
import pandas as pd

dr = pd.read_parquet("data/processed/dependencias_riesgo.parquet")

# Top 5 por MAD con muestra suficiente
top = dr[dr["contratos"] >= 300].nlargest(5, "benford_mad")
print(top[["institucion", "contratos", "adj_directa_pct", "benford_mad"]])

# % AD global federal
contratos = pd.read_parquet("data/processed/comprasmx_contratos.parquet")
fed = contratos[contratos["ambito"] == "FEDERAL"]
pct_ad = (fed["tipo_procedimiento"] == "AD").mean() * 100
print(f"AD% federal: {pct_ad:.1f}%")
```

## Fallos conocidos

- **ComprasMX cambia esquema**: si renombra columnas, el ETL
  falla pidiendo lista de candidatas actualizada.
- **57% sin fecha de firma**: ComprasMX no publica
  `Fecha firma` para muchos contratos. El cruce con SAT 69-B
  (ver [flujo EFOS](efos-cruce.md)) maneja este caso con dos
  modos: "posterior estricto" (con fecha exacta) y "posterior
  por año" (solo año del contrato).
- **Duplicados aparentes**: contratos con modificatorios pueden
  aparecer en filas separadas; el `codigo` es único, los
  encadenados se cuentan como contratos distintos a propósito.

## Próximos pasos

- **2026 cuando llegue**: agregar el CSV en cuanto ComprasMX
  publique. El schema se mantiene, solo agregar a la
  concatenación.
- **Pemex/CFE off-budget**: estas empresas tienen sus propios
  micrositios de compras. Integrarlos cerraría el cuadro APF
  ampliado.
