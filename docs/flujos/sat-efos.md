# Flujo · SAT 69-B EFOS (padrón de facturadoras simuladas)

> El listado oficial que el SAT publica del Artículo 69-B del
> Código Fiscal de la Federación: empresas que el SAT determinó
> que **emiten comprobantes fiscales que amparan operaciones
> inexistentes** (facturas falsas).

## Diagrama end-to-end

```mermaid
flowchart TD
    A[SAT · sat.gob.mx<br/>omawww.sat.gob.mx/cifras_sat/<br/>Documents/Listado_Completo_69-B.csv]
    B[(Listado_Completo_69-B.csv<br/>~3 MB · 14,234 contribuyentes<br/>publicado y actualizado por SAT)]
    C[etl/sat_efos.py<br/>HTTP download<br/>parse CSV]
    D[Normalizar RFC<br/>uppercase eliminar espacios<br/>validar formato]
    E[Clasificar por estatus<br/>DEFINITIVO PRESUNTO<br/>DESVIRTUADO SENTENCIA_FAVORABLE]
    F[(data/processed/<br/>sat_efos.parquet<br/>14,234 filas)]
    G[etl/build_efos_metrics.py<br/>join con comprasmx por rfc]
    H[(efos_cruce.parquet<br/>14 contratos federales matched)]
    I[/efos]

    A -->|HTTP plano| B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
```

## Fuente

- **Oficial**:
  `http://omawww.sat.gob.mx/cifras_sat/Documents/Listado_Completo_69-B.csv`
- **Marco legal**: Artículo 69-B del Código Fiscal de la
  Federación. Habilita al SAT a presumir y luego declarar
  definitivamente que un contribuyente emite "comprobantes que
  amparan operaciones inexistentes".
- **Cobertura**: padrón actualizado por SAT cada vez que hay
  nuevas resoluciones. El snapshot del proyecto incluye 14,234
  contribuyentes.

## Categorías SAT (estatus)

El listado tiene cuatro estatus, en orden de severidad:

| Estatus | Significado | Conteo en snapshot |
|---|---|---|
| **DEFINITIVO** | SAT emitió resolución firme. Confirma que la empresa emite facturas falsas. La más grave. | **11,270** |
| **PRESUNTO** | SAT inició procedimiento pero aún no resuelve. Tiene 30 días para contestar. | 986 |
| **DESVIRTUADO** | La empresa logró demostrar que las operaciones sí existieron. Sale del listado. | 340 |
| **SENTENCIA_FAVORABLE** | Tribunal falló a favor de la empresa, sale del listado. | 1,638 |

El sitio destaca los **Definitivos** porque son el universo
cuyo registro SAT debería automáticamente bloquear cualquier
contrato público.

## Schema del CSV

| Columna CSV | Tipo |
|---|---|
| `RFC` | str |
| `Nombre` o `Razón Social` | str |
| `Situación del contribuyente` | str (= estatus) |
| `Número y fecha del oficio global de presunción` | str |
| `Publicación pagina SAT presuntos` | date |
| `Número y fecha del oficio global de definitivos` | str |
| `Publicación pagina SAT definitivos` | date |
| etc. (campos de seguimiento legal) |

## Schema del Parquet (`sat_efos.parquet`)

| Columna | Tipo | Descripción |
|---|---|---|
| `rfc` | str | normalizado, uppercase, sin espacios |
| `contribuyente` | str | razón social |
| `estatus` | str | DEFINITIVO / PRESUNTO / DESVIRTUADO / SENTENCIA_FAVORABLE |
| `fecha_presuncion` | date | cuándo SAT publicó la presunción |
| `fecha_definitivo` | date | cuándo SAT confirmó (solo Definitivos) |
| `oficio_presuncion` | str | número del oficio (referencia legal) |

**Volumen**: 14,234 contribuyentes.

## Decisiones clave del ETL

1. **Normalizar RFC**: el listado SAT viene con RFCs en
   uppercase pero a veces con espacios. El ETL los limpia para
   que el join con ComprasMX sea exacto.
2. **Conservar todos los estatus**: aunque editorialmente los
   Definitivos son los más fuertes, mantenemos PRESUNTO,
   DESVIRTUADO y SENTENCIA_FAVORABLE para que el cruce con
   ComprasMX pueda mostrar matices ("este contrato es a un
   contribuyente que está siendo investigado pero todavía no se
   resuelve").
3. **Fecha de presunción como pivot**: para clasificar contratos
   como "anteriores" o "posteriores" a la presunción SAT —el
   marcador editorial más fuerte del análisis— necesitamos esa
   fecha. Ver el flujo [EFOS cruce](efos-cruce.md).

## Cifras del sitio que salen de este flujo

| Cifra | Dónde aparece |
|---|---|
| **11,270 EFOS Definitivos** | banner home, `/efos` KPI cabecera |
| **14,234 padrón total** | `/efos` KPI cabecera, `/fuentes` |
| **Snapshot fecha** | `/efos` strip de cobertura |

## Cómo verificar

```python
import pandas as pd

efos = pd.read_parquet("data/processed/sat_efos.parquet")

# Conteo por estatus
print(efos["estatus"].value_counts())

# Total
print(f"Total padrón: {len(efos)}")

# Buscar un RFC específico
rfc = "ABC123456XYZ"  # ejemplo
match = efos[efos["rfc"] == rfc]
print(match)
```

## Fallos conocidos

- **SAT cambia la URL del CSV**: ha pasado. Si el CSV no
  descarga, descargarlo manualmente a
  `data/raw/Listado_Completo_69-B.csv` y volver a correr el ETL.
- **Encoding**: el SAT publica en latin-1. El ETL fuerza ese
  encoding.
- **RFCs canceladas o renombradas**: si una empresa cierra y
  cambia de RFC, el listado puede tener la entidad bajo el RFC
  viejo. El cruce con ComprasMX falla en esos casos (es un
  límite del análisis).

## Próximos pasos

- **Histórico de presunciones**: SAT publica snapshots
  semanales. Conservar la historia permitiría tracking del
  padrón a lo largo del tiempo.
- **Cruce con CompraNet histórico**: el archivo 5.0 NO tiene
  RFC, así que este cruce solo funciona con ComprasMX 2024-25.
  Para extender a histórico habría que reconciliar por nombre
  normalizado (con riesgo de falsos positivos).
