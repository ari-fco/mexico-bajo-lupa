"""IMCO / INAI · Transparencia estatal — STUB / ROADMAP V3.

Estado al 2026-05-07: NO HAY FUENTE INTEGRABLE.

Este archivo documenta la investigación realizada para conseguir un dataset
con un score numérico de transparencia (0-100) por las 32 entidades
federativas mexicanas. Ninguna de las fuentes públicas evaluadas cumple
los tres requisitos mínimos para integración automática:

  (1) cobertura de las 32 entidades federativas,
  (2) score numérico continuo (no PDF de imágenes),
  (3) formato descargable estructurado (CSV/Excel/JSON, no PDF escaneado).

Cuando alguno de los proveedores libere un dataset estructurado, este script
debe transformarse en un ETL real con la firma estándar del proyecto y
producir `data/processed/transparencia_estatal.parquet` con schema:

    cve_ent              str
    estado               str
    ano                  int
    transparencia_score  float (0-100)
    fuente               str   (e.g. "IMCO BIPE 2023", "MGA 2023")

================================================================================
FUENTES INVESTIGADAS (2026-05-07)
================================================================================

1) IMCO — Barómetro de Información Presupuestal Estatal (BIPE) 2023
   URL: https://imco.org.mx/barometro-de-informacion-presupuestal-bipe-2023/
   Boletas: https://imco.org.mx/wp-content/uploads/2023/07/BIPE-2023_Boletas-Estatales_20230725.pdf
   Cobertura: SÍ — 32 entidades, score 0-100 ("calificación").
   Granularidad publicada: SÍ por estado (ej. Guerrero 66.4, Sonora 76.7,
       Michoacán 78.5, 12 entidades con 100).
   Formato: PDF de 32 páginas (una por estado) **escaneado / vector sin
       capa de texto**. pypdf devuelve texto vacío para todas las páginas.
   Bloqueo: requiere OCR (Tesseract / cloud OCR) + validación manual.
       Inviable para MVP automático de 15-20 min.
   Acción al liberar dataset: si IMCO publica el Excel/CSV histórico
       (mencionado vagamente en /finanzaspublicas/ pero no enlazado),
       reemplazar este stub por el parser estándar.

2) IMCO — Informe Estatal del Ejercicio del Gasto (IEEG) 2024
   URL: https://imco.org.mx/wp-content/uploads/2024/06/DOCUMENTO_IEEG_2024_18Jun24.pdf
   Cobertura: 32 entidades.
   Bloqueo: PDF "más de 200,000 observaciones" pero sin Excel/CSV público.
       Mide ejercicio del gasto (recaudación vs estimado, gasto vs aprobado),
       no transparencia per se. Mismo problema de PDF no extraíble.

3) INAI / El Colegio de México — Métrica de Gobierno Abierto (MGA) 2023
   Dashboard: https://colmex.shinyapps.io/metrica_gobierno_abierto_2023/
   Micrositio: https://micrositios.inai.org.mx/gobiernoabiertoytransparencia/?page_id=4189
   PDF reporte: https://ivai.org.mx/GobAbierto/Material/MGA23.pdf
   Cobertura: 2,043 instituciones (federal + estatal + municipal).
       Reporta IGA (Índice de Gobierno Abierto) 0-1 con dimensiones
       de transparencia y participación.
   Bloqueo crítico: el INAI fue **extinto en 2025**. Los micrositios
       INAI devuelven HTTP 000 / ECONNREFUSED al 2026-05-07. El espejo
       en IVAI Veracruz devuelve "This Account has been suspended". El
       Shiny App de ColMex carga pero solo muestra spinner — no expone
       endpoint público de descarga.
   Acción al liberar: cuando el sucesor del INAI re-publique los datos
       abiertos del MGA o ColMex exponga el zip de la base, parsear el
       Excel/CSV directamente.

4) INEGI — Censo Nacional de Transparencia (CNTAIPPDPE) 2023
   URL: https://www.inegi.org.mx/programas/cntaippdpe/2023/
   Cobertura: 32 organismos garantes estatales.
   Bloqueo: NO publica un score de transparencia. Reporta estructura
       organizacional, presupuesto y recursos del organismo garante,
       no califica al estado. Variables como "número de comisionados",
       "presupuesto autorizado" — no comparable como índice 0-100.

5) datos.gob.mx — búsquedas "transparencia estatal", "índice transparencia"
   Resultado: ningún dataset consolidado nacional con score por estado.
       Lo que aparece son catálogos de servidores públicos por entidad,
       no calificaciones agregadas.

================================================================================
PLAN PARA V3
================================================================================

Cuando alguna de estas fuentes libere un Excel/CSV/JSON estructurado:

a) Si es IMCO BIPE/IEEG con Excel:
     - Bajar zip/xlsx a data/raw/
     - Parser tipo CONEVAL: leer hoja, mapear nombre→cve_ent vía
       common.to_cve_ent(), normalizar score a 0-100
     - Persistir parquet, activar métrica en build_metrics + export_json

b) Si es MGA con CSV:
     - Mismo flujo. La métrica viene en 0-1 → multiplicar por 100.

c) Si toca extraer del PDF IMCO con OCR (último recurso):
     - Usar `pdf2image` + `pytesseract` (instalar Tesseract en CI)
     - Parsear cada boleta estatal con regex sobre "Calificación: XX.X"
     - Validar: 32 filas, suma sanity-check vs promedio nacional reportado

Una vez con el parquet listo:
  1. etl/build_metrics.py  → agregar `transparencia_score` al pivot estatal
  2. etl/export_json.py    → incluir métrica
  3. web/src/lib/queries.ts → agregar a tipo y consulta
  4. web/src/lib/mock-data.ts → mock equivalente
  5. web/src/components/mapa-explorer.tsx → mover de ROADMAP_METRICS a
     METRICS, grupo "Gobierno", invert: true (mayor = mejor)
  6. web/src/app/fuentes/page.tsx → cambiar status a "active"
  7. dossier de estado → agregar CrossStat de transparencia

================================================================================

Hasta entonces, este script no produce parquet y la métrica permanece en
ROADMAP_METRICS del frontend con la etiqueta "Próximamente".
"""

from __future__ import annotations

import sys


REASON = (
    "No hay fuente pública con score numérico de transparencia por entidad "
    "federativa en formato estructurado (CSV/Excel/JSON) al 2026-05-07. "
    "Ver docstring de este archivo para detalle de fuentes evaluadas."
)


def main() -> None:
    print("[imco_transparencia] SKIPPED — métrica en roadmap V3.")
    print(f"[imco_transparencia] Razón: {REASON}")
    print(
        "[imco_transparencia] Ver docstring del archivo "
        "(etl/imco_transparencia.py) para el plan de integración."
    )
    # Exit 0 a propósito: no es un error, es un stub documentado.
    sys.exit(0)


if __name__ == "__main__":
    main()
